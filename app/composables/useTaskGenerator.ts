// Composable for Task Generator with session management + step-by-step pipeline
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

// Pipeline types (step-by-step)
interface PipelineModuleData {
    moduleId: string;
    pipelineId: string;
    step: number;
    moduleName: string;
    status: 'pending' | 'running' | 'waiting_confirm' | 'confirmed' | 'error' | 'skipped';
    input: Record<string, unknown>;
    output: Record<string, unknown> | null;
    error: string | null;
    retryCount: number;
    userFeedback: string | null;
    confirmedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

interface PipelineRunData {
    pipelineId: string;
    sessionId: string;
    userId: string;
    userMessage: string;
    status: 'running' | 'waiting_confirm' | 'completed' | 'error';
    currentStep: number;
    createdAt: string;
    updatedAt: string;
}

interface ArgumentValidationError {
    valid: boolean;
    taskId: number;
    action: string;
    missingArgs: string[];
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

// Pipeline state (step-by-step)
const pipelineMode = ref(false);
const pipelineRun = ref<PipelineRunData | null>(null);
const pipelineModules = ref<PipelineModuleData[]>([]);
const pipelineError = ref<string | null>(null);
const validationErrors = ref<ArgumentValidationError[]>([]);

export function useTaskGenerator() {
    const config = useRuntimeConfig();
    const apiBase = `${config.public.backendurl}/v0`;

    // ========================================================================
    // Session Management
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

                // Auto-load active pipeline if exists
                await fetchActivePipeline(sessionId);

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
    // Chat (original)
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
    // Pipeline (Step-by-Step)
    // ========================================================================

    const resetPipeline = () => {
        pipelineRun.value = null;
        pipelineModules.value = [];
        pipelineError.value = null;
        validationErrors.value = [];
    };

    const togglePipelineMode = () => {
        pipelineMode.value = !pipelineMode.value;
        if (!pipelineMode.value) {
            // Switching back to chat mode - keep pipeline data
        }
    };

    /**
     * Auto-load the latest active pipeline (non-completed) from history.
     * If found, switch to pipeline mode and load it.
     */
    const fetchActivePipeline = async (sessionId: string): Promise<void> => {
        try {
            const historyResponse = await $fetch<{
                success: boolean;
                data?: PipelineRunData[];
            }>(
                `${apiBase}/task-generator/sessions/${sessionId}/pipeline/history`,
                { credentials: 'include' }
            );

            if (historyResponse.success && historyResponse.data && historyResponse.data.length > 0) {
                // Find the latest active (non-completed) pipeline, or the latest one
                const activePipeline = historyResponse.data.find(
                    p => p.status !== 'completed'
                ) || historyResponse.data[0];

                if (activePipeline) {
                    // Fetch full pipeline with modules
                    await fetchPipelineRun(activePipeline.pipelineId);
                    pipelineMode.value = true;
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch active pipeline:', err);
        }
    };

    const startPipeline = async (message: string): Promise<void> => {
        if (!currentSession.value?.sessionId || !message.trim() || isLoading.value) return;

        error.value = null;
        pipelineError.value = null;
        validationErrors.value = [];
        isLoading.value = true;

        try {
            const response = await $fetch<{
                success: boolean;
                pipelineId?: string;
                module?: PipelineModuleData;
                error?: string;
            }>(
                `${apiBase}/task-generator/sessions/${currentSession.value.sessionId}/pipeline/start`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: { message }
                }
            );

            if (response.success && response.pipelineId) {
                // Fetch full pipeline data
                await fetchPipelineRun(response.pipelineId);
            } else {
                pipelineError.value = response.error || 'Failed to start pipeline';
            }
        } catch (err: any) {
            pipelineError.value = err?.data?.message || err.message || 'Pipeline start failed';
        } finally {
            isLoading.value = false;
        }
    };

    const fetchPipelineRun = async (pipelineId: string): Promise<void> => {
        if (!currentSession.value?.sessionId) return;

        try {
            const response = await $fetch<{
                success: boolean;
                data?: {
                    pipeline: PipelineRunData;
                    modules: PipelineModuleData[];
                };
                message?: string;
            }>(
                `${apiBase}/task-generator/sessions/${currentSession.value.sessionId}/pipeline/${pipelineId}`,
                { credentials: 'include' }
            );

            if (response.success && response.data) {
                pipelineRun.value = response.data.pipeline;
                pipelineModules.value = response.data.modules;
            }
        } catch (err: any) {
            console.error('Failed to fetch pipeline:', err);
        }
    };

    const confirmModule = async (pipelineId: string, moduleId: string): Promise<void> => {
        if (isLoading.value) return;

        isLoading.value = true;
        pipelineError.value = null;
        validationErrors.value = [];

        try {
            const response = await $fetch<{
                success: boolean;
                nextModule?: PipelineModuleData;
                pipelineCompleted?: boolean;
                validationErrors?: ArgumentValidationError[];
                error?: string;
            }>(
                `${apiBase}/task-generator/pipeline/${pipelineId}/modules/${moduleId}/confirm`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            if (response.validationErrors && response.validationErrors.length > 0) {
                validationErrors.value = response.validationErrors;
            }

            // Refresh pipeline data
            await fetchPipelineRun(pipelineId);

            if (response.pipelineCompleted) {
                // Refresh messages too since pipeline is done
                if (currentSession.value?.sessionId) {
                    await selectSession(currentSession.value.sessionId);
                }
            }

            if (!response.success) {
                pipelineError.value = response.error || 'Confirm failed';
            }
        } catch (err: any) {
            pipelineError.value = err?.data?.message || err.message || 'Confirm failed';
        } finally {
            isLoading.value = false;
        }
    };

    const retryModule = async (
        pipelineId: string,
        moduleId: string,
        feedback?: string
    ): Promise<void> => {
        if (isLoading.value) return;

        isLoading.value = true;
        pipelineError.value = null;
        validationErrors.value = [];

        try {
            const response = await $fetch<{
                success: boolean;
                module?: PipelineModuleData;
                error?: string;
            }>(
                `${apiBase}/task-generator/pipeline/${pipelineId}/modules/${moduleId}/retry`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: { feedback: feedback || undefined }
                }
            );

            // Refresh pipeline data
            await fetchPipelineRun(pipelineId);

            if (!response.success) {
                pipelineError.value = response.error || 'Retry failed';
            }
        } catch (err: any) {
            pipelineError.value = err?.data?.message || err.message || 'Retry failed';
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

        // Pipeline (step-by-step)
        pipelineMode,
        pipelineRun,
        pipelineModules,
        pipelineError,
        validationErrors,
        togglePipelineMode,
        resetPipeline,
        startPipeline,
        fetchPipelineRun,
        confirmModule,
        retryModule
    };
}
