/**
 * State management for AI Ask module.
 *
 * Uses zustand with localStorage persistence to maintain conversation state
 * across page navigations and browser sessions.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// Types
// =============================================================================

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

interface AIAskState {
    // Conversation
    conversationId: string | null;
    setConversationId: (id: string | null) => void;

    // Messages (cached for quick restore)
    messages: Message[];
    setMessages: (messages: Message[]) => void;
    addMessage: (message: Message) => void;
    clearMessages: () => void;

    // Selected model
    selectedModel: string;
    setSelectedModel: (model: string) => void;

    // Web search preference
    webSearch: boolean;
    setWebSearch: (enabled: boolean) => void;

    // Clear all state (for new conversation)
    clearConversation: () => void;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useAIAskStore = create<AIAskState>()(
    persist(
        (set) => ({
            // Conversation
            conversationId: null,
            setConversationId: (id) => set({ conversationId: id }),

            // Messages
            messages: [],
            setMessages: (messages) => set({ messages }),
            addMessage: (message) =>
                set((state) => ({ messages: [...state.messages, message] })),
            clearMessages: () => set({ messages: [] }),

            // Selected model
            selectedModel: 'openai/gpt-4o',
            setSelectedModel: (model) => set({ selectedModel: model }),

            // Web search
            webSearch: false,
            setWebSearch: (enabled) => set({ webSearch: enabled }),

            // Clear all
            clearConversation: () =>
                set({
                    conversationId: null,
                    messages: [],
                }),
        }),
        {
            name: 'nexen-ai-ask', // localStorage key
            partialize: (state) => ({
                // Only persist these fields
                conversationId: state.conversationId,
                messages: state.messages,
                selectedModel: state.selectedModel,
                webSearch: state.webSearch,
            }),
        }
    )
);
