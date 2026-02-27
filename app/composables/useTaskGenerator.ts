// Composable for Task Generator with session management
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

// ============================================================================
// Shared state (singleton)
// ============================================================================

const currentSession = ref<TaskGeneratorSession | null>(null);
const sessionList = ref<TaskGeneratorSession[]>([]);
const messages = ref<TaskGeneratorMessage[]>([]);
const isLoading = ref(false);
const isLoadingSessions = ref(false);
const error = ref<string | null>(null);

export function useTaskGenerator() {
    const config = useRuntimeConfig();
    const apiBase = `${config.public.backendurl}/v0`;

    // ========================================================================
    // Session Management
    // ========================================================================

    /**
     * Fetch all sessions for the current user
     */
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

    /**
     * Create a new session
     */
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
                // Refresh session list
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

    /**
     * Select and load a session with its messages
     */
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

    /**
     * Delete a session
     */
    const deleteSession = async (sessionId: string): Promise<boolean> => {
        try {
            await $fetch(
                `${apiBase}/task-generator/sessions/${sessionId}`,
                {
                    method: 'DELETE',
                    credentials: 'include'
                }
            );

            // If deleted session was the active one, clear it
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

    /**
     * Close current session (clear UI only, keep in DB)
     */
    const closeSession = () => {
        currentSession.value = null;
        messages.value = [];
        error.value = null;
    };

    // ========================================================================
    // Chat
    // ========================================================================

    /**
     * Send message within the current session
     */
    const sendMessage = async (message: string): Promise<void> => {
        if (!currentSession.value?.sessionId || !message.trim() || isLoading.value) return;

        error.value = null;
        isLoading.value = true;

        // Add user message to UI immediately
        const tempUserMsg: TaskGeneratorMessage = {
            messageId: `temp_user_${Date.now()}`,
            role: 'user',
            userId: null,
            modelName: null,
            content: message,
            timestamp: new Date()
        };
        messages.value.push(tempUserMsg);

        // Add loading placeholder
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

            // Remove loading placeholder
            messages.value = messages.value.filter(m => !m.isLoading);

            if (response.success && response.data) {
                // Update user message with real ID
                const userIdx = messages.value.findIndex(m => m.messageId === tempUserMsg.messageId);
                if (userIdx !== -1) {
                    messages.value[userIdx].messageId = response.data.userMessageId;
                }

                // Add model response
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
            // Remove loading placeholder on error
            messages.value = messages.value.filter(m => !m.isLoading);
            error.value = err?.data?.message || err.message || 'Network error';
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

        // Chat
        sendMessage
    };
}
