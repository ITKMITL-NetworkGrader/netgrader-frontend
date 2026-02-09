// Composable for Gemini Chat with SSE streaming
import { ref, computed } from 'vue';

interface ChatMessage {
    messageId: string;
    role: 'user' | 'model' | 'system';
    textContent: string;
    humanReadablePreview?: string;
    jsonPreview?: Record<string, any>;
    functionCall?: {
        name: string;
        args: Record<string, any>;
        status: 'pending' | 'approved' | 'rejected' | 'executed';
    };
    draftData?: {
        type: 'lab' | 'part' | 'task';
        data: any;
        previewText: string;
    };
    timestamp: Date;
    isStreaming?: boolean;
}

interface ChatSession {
    sessionId: string;
    status: 'active' | 'expired';
    currentContext: {
        courseId?: string;
        labId?: string;
        partId?: string;
    };
    wizardState?: WizardState;
    lastMessageAt: Date;
}

interface WizardState {
    step: 'course_list' | 'course_create' | 'course_edit' | 'lab_list' | 'lab_create' | 'lab_edit_menu' | 'lab_edit' | 'part_list' | 'part_create' | 'part_edit';
    courseId?: string;
    labId?: string;
    partId?: string;
    editSection?: 'basic' | 'network' | 'parts';
}

interface WizardCourse {
    id: string;
    title: string;
    description: string;
    visibility: string;
    createdAt: Date;
}

interface WizardLab {
    id: string;
    title: string;
    description?: string;
    type: string;
    status?: string;
    createdAt: Date;
}

interface WizardPart {
    id: string;
    title: string;
    description?: string;
    order: number;
    createdAt: Date;
}

export function useGeminiChat() {
    const session = ref<ChatSession | null>(null);
    const sessionList = ref<ChatSession[]>([]);
    const messages = ref<ChatMessage[]>([]);
    const isLoading = ref(false);
    const isStreaming = ref(false);
    const error = ref<string | null>(null);
    const streamingText = ref('');

    // Wizard State
    const wizardState = ref<WizardState>({ step: 'course_list' });
    const wizardCourses = ref<WizardCourse[]>([]);
    const wizardLabs = ref<WizardLab[]>([]);
    const wizardParts = ref<WizardPart[]>([]);

    const config = useRuntimeConfig();
    const apiBase = `${config.public.backendurl}/v0`;

    // Create new session
    const createSession = async (): Promise<boolean> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await $fetch<{ success: boolean; data?: ChatSession; message?: string }>(
                `${apiBase}/gemini/chat`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: {}
                }
            );

            if (response.success && response.data) {
                session.value = response.data;
                // Fetch initial messages (welcome message)
                await fetchHistory();
                return true;
            } else {
                error.value = response.message || 'Failed to create session';
                return false;
            }
        } catch (err: any) {
            error.value = err.message || 'Network error';
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    // Fetch session history
    const fetchHistory = async (): Promise<void> => {
        if (!session.value?.sessionId) return;

        try {
            const response = await $fetch<{ success: boolean; data?: { messages: ChatMessage[] } }>(
                `${apiBase}/gemini/chat/${session.value.sessionId}`,
                {
                    credentials: 'include'
                }
            );

            if (response.success && response.data) {
                messages.value = response.data.messages.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
            }
        } catch (err: any) {
            console.error('Failed to fetch history:', err);
        }
    };

    // Send message with SSE streaming
    const sendMessage = async (message: string): Promise<void> => {
        if (!session.value?.sessionId || !message.trim()) return;

        isStreaming.value = true;
        streamingText.value = '';
        error.value = null;

        // Add user message immediately
        const userMessage: ChatMessage = {
            messageId: `temp_${Date.now()}`,
            role: 'user',
            textContent: message,
            timestamp: new Date()
        };
        messages.value.push(userMessage);

        // Add streaming placeholder
        const streamingMessage: ChatMessage = {
            messageId: `streaming_${Date.now()}`,
            role: 'model',
            textContent: '',
            timestamp: new Date(),
            isStreaming: true
        };
        messages.value.push(streamingMessage);

        try {
            const response = await fetch(
                `${apiBase}/gemini/chat/${session.value.sessionId}/message`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No response body');
            }

            let buffer = '';
            let finalMessageId = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;

                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === 'text') {
                            streamingText.value += data.content;
                            // Update streaming message
                            const idx = messages.value.findIndex(m => m.isStreaming);
                            if (idx !== -1) {
                                messages.value[idx].textContent = streamingText.value;
                            }
                        } else if (data.type === 'draft') {
                            // Update with draft data
                            const idx = messages.value.findIndex(m => m.isStreaming);
                            if (idx !== -1) {
                                messages.value[idx] = {
                                    ...messages.value[idx],
                                    messageId: data.data.messageId,
                                    humanReadablePreview: data.data.preview,
                                    jsonPreview: data.data.json,
                                    draftData: {
                                        type: data.data.type,
                                        data: data.data.json,
                                        previewText: data.data.preview
                                    },
                                    functionCall: {
                                        name: data.data.type,
                                        args: data.data.json,
                                        status: 'pending'
                                    },
                                    isStreaming: false
                                };
                                finalMessageId = data.data.messageId;
                            }
                        } else if (data.type === 'done') {
                            finalMessageId = data.messageId || finalMessageId;
                            // Finalize streaming message
                            const idx = messages.value.findIndex(m => m.isStreaming);
                            if (idx !== -1) {
                                messages.value[idx] = {
                                    ...messages.value[idx],
                                    messageId: finalMessageId,
                                    isStreaming: false
                                };
                            }
                        } else if (data.type === 'error') {
                            error.value = data.content;
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        } catch (err: any) {
            error.value = err.message || 'Failed to send message';
            // Remove streaming message on error
            messages.value = messages.value.filter(m => !m.isStreaming);
        } finally {
            isStreaming.value = false;
            streamingText.value = '';
        }
    };

    // Confirm draft
    const confirmDraft = async (messageId: string): Promise<boolean> => {
        if (!session.value?.sessionId) return false;

        isLoading.value = true;

        try {
            const response = await $fetch<{ success: boolean; data?: any; message?: string }>(
                `${apiBase}/gemini/chat/${session.value.sessionId}/confirm/${messageId}`,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            );

            if (response.success) {
                // Update message status
                const idx = messages.value.findIndex(m => m.messageId === messageId);
                if (idx !== -1 && messages.value[idx].functionCall) {
                    messages.value[idx].functionCall!.status = 'executed';
                }
                // Refresh history
                await fetchHistory();
                return true;
            } else {
                error.value = response.message || 'Failed to confirm';
                return false;
            }
        } catch (err: any) {
            error.value = err.message || 'Network error';
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    // Reject draft
    const rejectDraft = async (messageId: string): Promise<boolean> => {
        if (!session.value?.sessionId) return false;

        isLoading.value = true;

        try {
            const response = await $fetch<{ success: boolean }>(
                `${apiBase}/gemini/chat/${session.value.sessionId}/reject/${messageId}`,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            );

            if (response.success) {
                // Update message status
                const idx = messages.value.findIndex(m => m.messageId === messageId);
                if (idx !== -1 && messages.value[idx].functionCall) {
                    messages.value[idx].functionCall!.status = 'rejected';
                }
                await fetchHistory();
                return true;
            }
            return false;
        } catch (err: any) {
            error.value = err.message || 'Network error';
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    // Close session (just clear UI, keep session in DB)
    const closeSession = async (): Promise<void> => {
        // Don't delete session, just clear local state
        session.value = null;
        messages.value = [];
    };

    // List all sessions for current user
    const listSessions = async (): Promise<void> => {
        try {
            const response = await $fetch<{ success: boolean; data?: ChatSession[] }>(
                `${apiBase}/gemini/chat`,
                {
                    method: 'GET',
                    credentials: 'include'
                }
            );

            if (response.success && response.data) {
                sessionList.value = response.data.map(s => ({
                    ...s,
                    lastMessageAt: new Date(s.lastMessageAt)
                }));
            }
        } catch (err: any) {
            console.error('Failed to list sessions:', err);
        }
    };

    // Select and load an existing session
    const selectSession = async (sessionId: string): Promise<boolean> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await $fetch<{ success: boolean; data?: { session: ChatSession; messages: ChatMessage[] } }>(
                `${apiBase}/gemini/chat/${sessionId}`,
                {
                    credentials: 'include'
                }
            );

            if (response.success && response.data) {
                session.value = response.data.session;
                messages.value = response.data.messages.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));

                // Restore wizardState from session
                if (response.data.session.wizardState) {
                    wizardState.value = response.data.session.wizardState;
                } else {
                    wizardState.value = { step: 'course_list' };
                }

                return true;
            } else {
                error.value = 'Failed to load session';
                return false;
            }
        } catch (err: any) {
            error.value = err.message || 'Network error';
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    // Computed
    const hasPendingDraft = computed(() => {
        return messages.value.some(m => m.functionCall?.status === 'pending');
    });

    const pendingDraftMessage = computed(() => {
        return messages.value.find(m => m.functionCall?.status === 'pending');
    });

    const isInAIMode = computed(() => {
        const step = wizardState.value.step;
        return step.includes('create') || step.includes('edit');
    });

    // ============================================================================
    // Wizard API Functions
    // ============================================================================

    const fetchWizardState = async (): Promise<void> => {
        if (!session.value?.sessionId) return;
        try {
            const response = await $fetch<{ success: boolean; data?: WizardState }>(
                `${apiBase}/gemini/chat/${session.value.sessionId}/wizard/state`,
                { credentials: 'include' }
            );
            if (response.success && response.data) {
                wizardState.value = response.data;
            }
        } catch (err: any) {
            console.error('Failed to fetch wizard state:', err);
        }
    };

    const fetchCourses = async (): Promise<void> => {
        if (!session.value?.sessionId) return;
        isLoading.value = true;
        try {
            const response = await $fetch<{ success: boolean; data?: WizardCourse[] }>(
                `${apiBase}/gemini/chat/${session.value.sessionId}/wizard/courses`,
                { credentials: 'include' }
            );
            if (response.success && response.data) {
                wizardCourses.value = response.data;
            }
        } catch (err: any) {
            error.value = err.message || 'Failed to fetch courses';
        } finally {
            isLoading.value = false;
        }
    };

    const fetchLabs = async (): Promise<void> => {
        if (!session.value?.sessionId) return;
        isLoading.value = true;
        try {
            const response = await $fetch<{ success: boolean; data?: WizardLab[] }>(
                `${apiBase}/gemini/chat/${session.value.sessionId}/wizard/labs`,
                { credentials: 'include' }
            );
            if (response.success && response.data) {
                wizardLabs.value = response.data;
            }
        } catch (err: any) {
            error.value = err.message || 'Failed to fetch labs';
        } finally {
            isLoading.value = false;
        }
    };

    const fetchParts = async (): Promise<void> => {
        if (!session.value?.sessionId) return;
        isLoading.value = true;
        try {
            const response = await $fetch<{ success: boolean; data?: WizardPart[] }>(
                `${apiBase}/gemini/chat/${session.value.sessionId}/wizard/parts`,
                { credentials: 'include' }
            );
            if (response.success && response.data) {
                wizardParts.value = response.data;
            }
        } catch (err: any) {
            error.value = err.message || 'Failed to fetch parts';
        } finally {
            isLoading.value = false;
        }
    };

    const selectItem = async (type: 'course' | 'lab' | 'part', id: string): Promise<void> => {
        if (!session.value?.sessionId) return;
        try {
            const response = await $fetch<{ success: boolean; data?: WizardState }>(
                `${apiBase}/gemini/chat/${session.value.sessionId}/wizard/select`,
                {
                    method: 'POST',
                    credentials: 'include',
                    body: { type, id }
                }
            );
            if (response.success && response.data) {
                wizardState.value = response.data;
            }
        } catch (err: any) {
            error.value = err.message || 'Failed to select item';
        }
    };

    const setWizardAction = async (
        target: 'course' | 'lab' | 'part',
        action: 'create' | 'edit',
        editSection?: 'basic' | 'network' | 'parts'
    ): Promise<void> => {
        if (!session.value?.sessionId) return;
        try {
            const response = await $fetch<{ success: boolean; data?: WizardState }>(
                `${apiBase}/gemini/chat/${session.value.sessionId}/wizard/action`,
                {
                    method: 'POST',
                    credentials: 'include',
                    body: { target, action, editSection }
                }
            );
            if (response.success && response.data) {
                wizardState.value = response.data;
            }
        } catch (err: any) {
            error.value = err.message || 'Failed to set action';
        }
    };

    const navigateBack = async (): Promise<void> => {
        if (!session.value?.sessionId) return;
        try {
            const response = await $fetch<{ success: boolean; data?: WizardState }>(
                `${apiBase}/gemini/chat/${session.value.sessionId}/wizard/back`,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            );
            if (response.success && response.data) {
                wizardState.value = response.data;
            }
        } catch (err: any) {
            error.value = err.message || 'Failed to navigate back';
        }
    };

    return {
        // State
        session,
        sessionList,
        messages,
        isLoading,
        isStreaming,
        error,
        streamingText,

        // Wizard State
        wizardState,
        wizardCourses,
        wizardLabs,
        wizardParts,

        // Actions
        createSession,
        fetchHistory,
        sendMessage,
        confirmDraft,
        rejectDraft,
        closeSession,
        listSessions,
        selectSession,

        // Wizard Actions
        fetchWizardState,
        fetchCourses,
        fetchLabs,
        fetchParts,
        selectItem,
        setWizardAction,
        navigateBack,

        // Computed
        hasPendingDraft,
        pendingDraftMessage,
        isInAIMode
    };
}
