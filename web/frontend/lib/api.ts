/**
 * API client for NEXEN backend.
 */

const API_BASE = '/api';

export interface ResearchTask {
    task_id: string;
    status: string;
    message: string;
    created_at: string;
    completed_at?: string;
    subtasks: SubtaskInfo[];
    synthesis?: string;
    total_tokens: number;
}

export interface SubtaskInfo {
    task_id: string;
    description: string;
    assigned_agent: string;
    status: string;
    tokens_used: number;
}

export interface Agent {
    id: string;
    display_name: string;
    display_name_cn: string;
    cluster: string;
    role_model: string;
    fallback_model?: string;
    status: string;
    current_task?: string;
    responsibilities: string[];
}

export interface Session {
    id: string;
    topic: string;
    status: string;
    created_at: string;
    updated_at: string;
    agent_calls: number;
    total_tokens: number;
}

async function fetchApi<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || 'Request failed');
    }

    return response.json();
}

export const api = {
    // Research
    startResearch: (task: string, sessionId?: string, maxAgents = 5) =>
        fetchApi<ResearchTask>('/research', {
            method: 'POST',
            body: JSON.stringify({ task, session_id: sessionId, max_agents: maxAgents }),
        }),

    getResearchStatus: (taskId: string) =>
        fetchApi<ResearchTask>(`/research/${taskId}`),

    cancelResearch: (taskId: string) =>
        fetchApi<{ message: string }>(`/research/${taskId}`, { method: 'DELETE' }),

    // Agents
    getAgents: () =>
        fetchApi<{ agents: Agent[]; total: number }>('/agents'),

    getAgent: (agentId: string) =>
        fetchApi<Agent>(`/agents/${agentId}`),

    executeAgent: (agentId: string, task: string, sessionId?: string) =>
        fetchApi<{ result: string; tokens_used: number; duration_ms: number }>(
            `/agents/${agentId}/execute`,
            {
                method: 'POST',
                body: JSON.stringify({ task, session_id: sessionId }),
            }
        ),

    // Sessions
    getSessions: () =>
        fetchApi<{ sessions: Session[]; total: number }>('/sessions'),

    createSession: (topic: string) =>
        fetchApi<Session>('/sessions', {
            method: 'POST',
            body: JSON.stringify({ topic }),
        }),

    getSession: (sessionId: string) =>
        fetchApi<Session>(`/sessions/${sessionId}`),

    // Skills
    survey: (topic: string, sessionId?: string, maxPapers = 15) =>
        fetchApi<{ skill: string; result: string; tokens_used: number }>(
            '/skills/survey',
            {
                method: 'POST',
                body: JSON.stringify({ topic, session_id: sessionId, max_papers: maxPapers }),
            }
        ),

    who: (person: string, sessionId?: string) =>
        fetchApi<{ skill: string; result: string; tokens_used: number }>(
            '/skills/who',
            {
                method: 'POST',
                body: JSON.stringify({ person, session_id: sessionId }),
            }
        ),

    evolution: (technology: string, sessionId?: string) =>
        fetchApi<{ skill: string; result: string; tokens_used: number }>(
            '/skills/evolution',
            {
                method: 'POST',
                body: JSON.stringify({ technology, session_id: sessionId }),
            }
        ),

    // Knowledge
    browseKnowledge: (path = '', sessionId?: string) =>
        fetchApi<{ path: string; items: { name: string; path: string; type: string; size: number }[] }>(
            `/knowledge?path=${encodeURIComponent(path)}${sessionId ? `&session_id=${sessionId}` : ''}`
        ),

    getFile: (path: string, sessionId?: string) =>
        fetchApi<{ path: string; content: string; size: number }>(
            `/knowledge/file?path=${encodeURIComponent(path)}${sessionId ? `&session_id=${sessionId}` : ''}`
        ),

    searchKnowledge: (query: string, sessionId?: string) =>
        fetchApi<{ query: string; results: { path: string; snippet: string; score: number }[]; total: number }>(
            `/knowledge/search?q=${encodeURIComponent(query)}${sessionId ? `&session_id=${sessionId}` : ''}`
        ),
};
