// Composable for Task Generator with session management + pipeline
import { ref } from 'vue';

// ============================================================================
// Types
// ============================================================================

interface TaskGeneratorMessage {
    messageId: string;
    role: 'user' | 'model';
    userId: string | null;
    modelName: string | null;
    content: string;
    timestamp: Date;
    isLoading?: boolean;
}

interface TaskGeneratorSession {
    sessionId: string;
    title: string;
    status: string;
    lastMessageAt: Date;
    createdAt?: Date;
}

// Pipeline types
interface PipelineSubTask {
    id: number;
    action: string;
    deviceType: string;
    os: string;
    sourceDevice: string;
    targetDevice: string | null;
    description: string;
    params: Record<string, string>;
}

interface PipelineScriptCheck {
    id: number;
    action: string;
    found: boolean;
    script_path: string | null;
}

interface PipelineExecResult {
    id: number;
    action: string;
    success: boolean;
    output: string | null;
    error: string | null;
}

interface PipelineState {
    status: 'idle' | 'running' | 'completed' | 'error';
    currentStep: number;
    intent: any | null;
    taskPlan: { mainTask: string; subTasks: PipelineSubTask[] } | null;
    scriptCheck: { results: PipelineScriptCheck[]; foundCount: number; missingCount: number } | null;
    generatedScripts: { action: string; success: boolean }[];
    execution: { results: PipelineExecResult[]; successCount: number; failureCount: number } | null;
    error: string | null;
}

// ============================================================================
// Shared state (singleton)
// ============================================================================

const currentSession = ref<TaskGeneratorSession | null>(null);
const sessionList = ref<TaskGeneratorSession[]>([]);
const messages = ref<TaskGeneratorMessage[]>([]);
const isLoading = ref(false);
const isLoadingSessions = ref(false);
const error = ref<string | null>(null);

// Pipeline state
const pipelineMode = ref(false);
const pipelineState = ref<PipelineState>({
    status: 'idle',
    currentStep: 0,
    intent: null,
    taskPlan: null,
    scriptCheck: null,
    generatedScripts: [],
    execution: null,
    error: null
});

export function useTaskGenerator() {
    const config = useRuntimeConfig();
    const apiBase = `${config.public.backendurl}/v0`;

    // ========================================================================
    // Session Management (unchanged)
    // ========================================================================

    const fetchSessions = async (): Promise<void> => {
        isLoadingSessions.value = true;
        try {
            const response = await $fetch<{ success: boolean; data?: { sessions: TaskGeneratorSession[] } }>(
                `${apiBase}/task-generator/sessions`,
                { credentials: 'include' }
            );

            if (response.success && response.data?.sessions) {
                sessionList.value = response.data.sessions.map(s => ({
                    ...s,
                    lastMessageAt: new Date(s.lastMessageAt),
                    createdAt: s.createdAt ? new Date(s.createdAt) : undefined
                }));
            }
        } catch (err: any) {
            console.error('Failed to fetch sessions:', err);
        } finally {
            isLoadingSessions.value = false;
        }
    };

    const createSession = async (title?: string): Promise<boolean> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await $fetch<{ success: boolean; data?: TaskGeneratorSession; message?: string }>(
                `${apiBase}/task-generator/sessions`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: { title }
                }
            );

            if (response.success && response.data) {
                currentSession.value = {
                    ...response.data,
                    lastMessageAt: new Date(response.data.lastMessageAt)
                };
                messages.value = [];
                await fetchSessions();
                return true;
            } else {
                error.value = response.message || 'Failed to create session';
                return false;
            }
        } catch (err: any) {
            error.value = err?.data?.message || err.message || 'Network error';
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    const selectSession = async (sessionId: string): Promise<boolean> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await $fetch<{
                success: boolean;
                data?: {
                    session: TaskGeneratorSession;
                    messages: TaskGeneratorMessage[];
                };
                message?: string;
            }>(
                `${apiBase}/task-generator/sessions/${sessionId}`,
                { credentials: 'include' }
            );

            if (response.success && response.data) {
                currentSession.value = response.data.session;
                messages.value = response.data.messages.map(m => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                }));
                return true;
            } else {
                error.value = response.message || 'Failed to load session';
                return false;
            }
        } catch (err: any) {
            error.value = err?.data?.message || err.message || 'Network error';
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    const deleteSession = async (sessionId: string): Promise<boolean> => {
        try {
            await $fetch(
                `${apiBase}/task-generator/sessions/${sessionId}`,
                {
                    method: 'DELETE',
                    credentials: 'include'
                }
            );

            if (currentSession.value?.sessionId === sessionId) {
                currentSession.value = null;
                messages.value = [];
            }

            await fetchSessions();
            return true;
        } catch (err: any) {
            console.error('Failed to delete session:', err);
            return false;
        }
    };

    const closeSession = () => {
        currentSession.value = null;
        messages.value = [];
        error.value = null;
        resetPipeline();
    };

    // ========================================================================
    // Chat (unchanged - still works as before)
    // ========================================================================

    const sendMessage = async (message: string): Promise<void> => {
        if (!currentSession.value?.sessionId || !message.trim() || isLoading.value) return;

        error.value = null;
        isLoading.value = true;

        const tempUserMsg: TaskGeneratorMessage = {
            messageId: `temp_user_${Date.now()}`,
            role: 'user',
            userId: null,
            modelName: null,
            content: message,
            timestamp: new Date()
        };
        messages.value.push(tempUserMsg);

        const loadingMsg: TaskGeneratorMessage = {
            messageId: `loading_${Date.now()}`,
            role: 'model',
            userId: null,
            modelName: 'Gemini',
            content: '',
            timestamp: new Date(),
            isLoading: true
        };
        messages.value.push(loadingMsg);

        try {
            const response = await $fetch<{
                success: boolean;
                data?: { result: string; userMessageId: string; modelMessageId: string };
                message?: string;
            }>(
                `${apiBase}/task-generator/sessions/${currentSession.value.sessionId}/chat`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: { message }
                }
            );

            messages.value = messages.value.filter(m => !m.isLoading);

            if (response.success && response.data) {
                const userIdx = messages.value.findIndex(m => m.messageId === tempUserMsg.messageId);
                if (userIdx !== -1) {
                    messages.value[userIdx].messageId = response.data.userMessageId;
                }

                const modelMsg: TaskGeneratorMessage = {
                    messageId: response.data.modelMessageId,
                    role: 'model',
                    userId: null,
                    modelName: 'Gemini',
                    content: response.data.result,
                    timestamp: new Date()
                };
                messages.value.push(modelMsg);
            } else {
                error.value = response.message || 'Failed to get response';
            }
        } catch (err: any) {
            messages.value = messages.value.filter(m => !m.isLoading);
            error.value = err?.data?.message || err.message || 'Network error';
        } finally {
            isLoading.value = false;
        }
    };

    // ========================================================================
    // Pipeline Mode
    // ========================================================================

    const resetPipeline = () => {
        pipelineState.value = {
            status: 'idle',
            currentStep: 0,
            intent: null,
            taskPlan: null,
            scriptCheck: null,
            generatedScripts: [],
            execution: null,
            error: null
        };
    };

    const togglePipelineMode = () => {
        pipelineMode.value = !pipelineMode.value;
        if (pipelineMode.value) {
            resetPipeline();
        }
    };

    const runPipeline = async (message: string): Promise<void> => {
        if (!currentSession.value?.sessionId || !message.trim() || isLoading.value) return;

        error.value = null;
        isLoading.value = true;
        pipelineState.value = {
            status: 'running',
            currentStep: 1,
            intent: null,
            taskPlan: null,
            scriptCheck: null,
            generatedScripts: [],
            execution: null,
            error: null
        };

        try {
            const response = await $fetch<{
                success: boolean;
                step: string;
                intent?: any;
                taskPlan?: any;
                scriptCheck?: any;
                generatedScripts?: any[];
                execution?: any;
                error?: string;
            }>(
                `${apiBase}/task-generator/sessions/${currentSession.value.sessionId}/pipeline`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: { message }
                }
            );

            // Map response to pipeline state
            if (response.intent) {
                pipelineState.value.intent = response.intent;
                pipelineState.value.currentStep = 2;
            }
            if (response.taskPlan) {
                pipelineState.value.taskPlan = response.taskPlan;
                pipelineState.value.currentStep = 3;
            }
            if (response.scriptCheck) {
                pipelineState.value.scriptCheck = response.scriptCheck;
                pipelineState.value.currentStep = 4;
            }
            if (response.generatedScripts && response.generatedScripts.length > 0) {
                pipelineState.value.generatedScripts = response.generatedScripts;
                pipelineState.value.currentStep = 5;
            }
            if (response.execution) {
                pipelineState.value.execution = response.execution;
                pipelineState.value.currentStep = 6;
            }

            pipelineState.value.status = response.success ? 'completed' : 'error';
            pipelineState.value.error = response.error || null;

            // Refresh messages (pipeline saves summary to DB)
            if (response.success) {
                await selectSession(currentSession.value.sessionId);
            }
        } catch (err: any) {
            pipelineState.value.status = 'error';
            pipelineState.value.error = err?.data?.message || err.message || 'Pipeline failed';
            error.value = pipelineState.value.error;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        // State
        currentSession,
        sessionList,
        messages,
        isLoading,
        isLoadingSessions,
        error,

        // Session actions
        fetchSessions,
        createSession,
        selectSession,
        deleteSession,
        closeSession,

        // Chat (original)
        sendMessage,

        // Pipeline (new, optional)
        pipelineMode,
        pipelineState,
        togglePipelineMode,
        resetPipeline,
        runPipeline
    };
}
