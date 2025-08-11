<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea';
import { LucideLoaderCircle } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import DOMPurify from 'dompurify';
const config = useRuntimeConfig();
const backendURL = config.public.backend1url
const { $anime } = useNuxtApp();

interface Message {
    id: number;
    sender: string;
    text: string;
}

const isLoading = ref(false);
onMounted(() => {
    watchEffect(() => {
        if (isLoading.value) {
            $anime({
                targets: '#loader',
                rotate: '1turn',
                duration: 1000,
                easing: 'easeInOutQuad',
                loop: true
            });
        }
    });
});
const currentMessage = ref('');
const messages = ref<Message[]>([]);
const renderMarkdown = (text: string): string => {
    let html = text;
    
    // Code blocks first (to prevent interference with other formatting)
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 text-white p-3 rounded-lg my-2 overflow-x-auto"><code>$1</code></pre>');
    
    // Inline code (to prevent interference with other formatting)
    html = html.replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
    
    // Bold text (**text** or __text__) - process before italic to avoid conflicts
    html = html.replace(/\*\*((?:[^*]|\*(?!\*))*)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__((?:[^_]|_(?!_))*)__/g, '<strong>$1</strong>');
    
    // Italic text (*text* or _text_) - more precise regex to avoid leftover asterisks
    html = html.replace(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_(?!_)([^_]+)(?<!_)_(?!_)/g, '<em>$1</em>');
    
    // Strikethrough (~~text~~)
    html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
    
    // Headers (# ## ###)
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
    
    // Lists (- or * for unordered, numbers for ordered)
    html = html.replace(/^\s*[-*+]\s+(.*)$/gm, '<li class="ml-4">• $1</li>');
    html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<li class="ml-4">$1</li>');
    
    // Wrap consecutive list items in ul tags
    html = html.replace(/(<li[^>]*>.*<\/li>\s*)+/g, '<ul class="my-2">$&</ul>');
    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Line breaks - convert double newlines to paragraphs, single newlines to br
    html = html.replace(/\n\n/g, '</p><p class="mb-2">');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraph if not already wrapped
    if (!html.includes('<p>') && !html.includes('<h1>') && !html.includes('<h2>') && !html.includes('<h3>')) {
        html = `<p class="mb-2">${html}</p>`;
    }
    
    // Clean up any remaining asterisks that might be artifacts
    html = html.replace(/\*+/g, '');
    
    // Sanitize HTML to prevent XSS attacks
    return DOMPurify.sanitize(html);
};

const sendMessage = async () => {
    if (!currentMessage.value.trim() || isLoading.value) return;
    
    const messageText = currentMessage.value;
    const userMessage = {
        id: Date.now(),
        sender: 'You',
        text: messageText
    };
    
    messages.value.push(userMessage);
    currentMessage.value = '';
    isLoading.value = true;
    
    try {
        const response = await $fetch(`${backendURL}/v0/ai/generate`, {
            method: 'POST',
            body: { prompt: messageText },
            timeout: 30000
        });
        
        const typedResponse = response as { success: boolean; data: string };
        if (typedResponse.success) {
            messages.value.push({
                id: Date.now() + 1,
                sender: 'AI',
                text: typedResponse.data
            });
        } else {
            messages.value.push({
                id: Date.now() + 1,
                sender: 'AI',
                text: 'Sorry, I could not process your request.'
            });
        }
    } catch (error) {
        console.error('Error sending message:', error);
        messages.value.push({
            id: Date.now() + 1,
            sender: 'System',
            text: 'Error: Failed to send message'
        });
    } finally {
        isLoading.value = false;
    }
};

const handleKeydown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
};

</script>
<template>
    <div class="w-full h-full">
        <div class="flex w-256 h-128 items-center justify-between p-4 bg-white shadow-sm">
            <h1 class="text-xl font-semibold">OAT AI kub nong nong</h1>
            <div class="flex flex-col w-full max-w-md">
                <div class="mb-4 p-4 bg-gray-100 rounded-lg min-h-[200px] max-h-[400px] overflow-y-auto">
                    <div v-for="message in messages" :key="message.id" class="mb-2">
                        <div class="font-semibold text-sm text-gray-600">{{ message.sender }}:</div>
                        <div class="text-gray-800" v-html="renderMarkdown(message.text)"/>
                    </div>
                </div>
                <form class="flex gap-2" @submit.prevent="sendMessage">
                    <Textarea 
                        v-model="currentMessage" 
                        placeholder="Type your message..."
                        class="flex-1 p-2 border border-gray-300 rounded-lg resize-none"
                        rows="2"
                        :disabled="isLoading"
                        @keydown="handleKeydown"
                    />
                    <Button 
                        type="submit" 
                        class="px-4 py-2 text-white rounded-lg disabled:opacity-50"
                        :disabled="isLoading || !currentMessage.trim()"
                    >
                        <span v-if="isLoading" class="flex items-center gap-2">
                            <LucideLoaderCircle id="loader" class="animate-spin w-4 h-4" />
                            Sending...
                        </span>
                        <span v-else>Send</span>
                    </Button>
                </form>
            </div>
        </div>
    </div>
</template>