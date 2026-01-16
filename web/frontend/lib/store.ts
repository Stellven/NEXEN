import { create } from 'zustand';

export interface Message {
    role: 'user' | 'assistant' | 'error';
    content: string;
    timestamp: string;
}

interface ResearchState {
    // Session
    currentSessionId: string | null;
    setCurrentSessionId: (id: string | null) => void;

    // Research
    currentResult: string;
    setCurrentResult: (result: string) => void;

    // Messages
    messages: Message[];
    addMessage: (message: Message) => void;
    clearMessages: () => void;

    // Loading
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;

    // Agent status
    agentStatuses: Record<string, { status: string; task?: string }>;
    updateAgentStatus: (agentId: string, status: string, task?: string) => void;
}

export const useResearchStore = create<ResearchState>((set) => ({
    // Session
    currentSessionId: null,
    setCurrentSessionId: (id) => set({ currentSessionId: id }),

    // Research
    currentResult: '',
    setCurrentResult: (result) => set({ currentResult: result }),

    // Messages
    messages: [],
    addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
    clearMessages: () => set({ messages: [] }),

    // Loading
    isLoading: false,
    setIsLoading: (loading) => set({ isLoading: loading }),

    // Agent status
    agentStatuses: {},
    updateAgentStatus: (agentId, status, task) =>
        set((state) => ({
            agentStatuses: {
                ...state.agentStatuses,
                [agentId]: { status, task },
            },
        })),
}));
