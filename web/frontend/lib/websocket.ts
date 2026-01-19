/**
 * WebSocket client for real-time updates.
 */

// =============================================================================
// Types
// =============================================================================

export type AgentStatus = 'idle' | 'initializing' | 'running' | 'waiting' | 'completed' | 'failed';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
export type SessionStatus = 'planning' | 'executing' | 'completed' | 'failed';

export interface AgentStatusMessage {
    type: 'agent:status';
    agent_id: string;
    status: AgentStatus;
    task?: string;
    progress?: number;
    timestamp: string;
}

export interface DataFlowMessage {
    type: 'data:flow';
    from_agent: string;
    to_agent: string;
    data_type: string;
    timestamp: string;
}

export interface TaskUpdateMessage {
    type: 'task:update';
    task_id: string;
    status: TaskStatus;
    agent_type: string;
    description?: string;
    progress?: number;
    timestamp: string;
}

export interface SessionStatusMessage {
    type: 'session:status';
    session_id: string;
    status: SessionStatus;
    total_tasks: number;
    completed_tasks: number;
    active_agents: string[];
    progress: number;
    timestamp: string;
}

export interface ResearchProgressMessage {
    type: 'research:progress';
    task_id: string;
    stage: string;
    message: string;
    timestamp: string;
}

export type WSMessage =
    | AgentStatusMessage
    | DataFlowMessage
    | TaskUpdateMessage
    | SessionStatusMessage
    | ResearchProgressMessage
    | { type: string; [key: string]: any };

type MessageHandler<T = any> = (message: T) => void;

class WebSocketClient {
    private ws: WebSocket | null = null;
    private handlers: Map<string, Set<MessageHandler>> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    connect(url: string = 'ws://localhost:8000/ws') {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket closed');
            this.attemptReconnect(url);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    private attemptReconnect(url: string) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(url), this.reconnectDelay * this.reconnectAttempts);
        }
    }

    private handleMessage(message: any) {
        const type = message.type;
        const handlers = this.handlers.get(type);

        if (handlers) {
            handlers.forEach(handler => handler(message));
        }

        // Also notify wildcard handlers
        const wildcardHandlers = this.handlers.get('*');
        if (wildcardHandlers) {
            wildcardHandlers.forEach(handler => handler(message));
        }
    }

    subscribe(type: string, handler: MessageHandler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type)!.add(handler);

        // Return unsubscribe function
        return () => {
            this.handlers.get(type)?.delete(handler);
        };
    }

    send(message: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected');
        }
    }

    subscribeToTopic(topic: string) {
        this.send({ type: 'subscribe', topic });
    }

    unsubscribeFromTopic(topic: string) {
        this.send({ type: 'unsubscribe', topic });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // =============================================================================
    // Typed Subscription Helpers
    // =============================================================================

    /**
     * Subscribe to agent status updates.
     */
    onAgentStatus(handler: MessageHandler<AgentStatusMessage>) {
        return this.subscribe('agent:status', handler);
    }

    /**
     * Subscribe to data flow events between agents.
     */
    onDataFlow(handler: MessageHandler<DataFlowMessage>) {
        return this.subscribe('data:flow', handler);
    }

    /**
     * Subscribe to task updates.
     */
    onTaskUpdate(handler: MessageHandler<TaskUpdateMessage>) {
        return this.subscribe('task:update', handler);
    }

    /**
     * Subscribe to session status updates.
     */
    onSessionStatus(handler: MessageHandler<SessionStatusMessage>) {
        return this.subscribe('session:status', handler);
    }

    /**
     * Subscribe to research progress updates.
     */
    onResearchProgress(handler: MessageHandler<ResearchProgressMessage>) {
        return this.subscribe('research:progress', handler);
    }

    /**
     * Subscribe to a specific research session.
     */
    subscribeToSession(sessionId: string) {
        this.subscribeToTopic(`session:${sessionId}`);
    }

    /**
     * Unsubscribe from a specific research session.
     */
    unsubscribeFromSession(sessionId: string) {
        this.unsubscribeFromTopic(`session:${sessionId}`);
    }
}

export const wsClient = new WebSocketClient();
