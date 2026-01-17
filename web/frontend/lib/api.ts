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

// =============================================================================
// Library API Types
// =============================================================================

export interface LibraryFolder {
    id: string;
    name: string;
    parent_id: string | null;
    description?: string;
    color?: string;
    document_count: number;
    children: LibraryFolder[];
    created_at?: string;
    updated_at?: string;
}

export interface LibraryDocument {
    id: string;
    name: string;
    file_type: string;
    file_size: number;
    folder_id: string | null;
    source_url?: string;
    parse_status: string;
    embedding_status: string;
    chunk_count: number;
    tags: string[];
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface LibraryDocumentList {
    documents: LibraryDocument[];
    total: number;
    page: number;
    page_size: number;
}

export interface LibraryTag {
    name: string;
    count: number;
}

export interface DocumentStatus {
    parse_status: string;
    embedding_status: string;
    parse_error?: string;
    chunk_count: number;
}

// =============================================================================
// Library API
// =============================================================================

function getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchApiWithAuth<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || 'Request failed');
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
}

async function fetchApiFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
            ...getAuthHeaders(),
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || 'Request failed');
    }

    return response.json();
}

export const libraryApi = {
    // Folders
    getFolders: () => fetchApiWithAuth<LibraryFolder[]>('/library/folders'),

    createFolder: (data: { name: string; parent_id?: string; description?: string; color?: string }) =>
        fetchApiWithAuth<LibraryFolder>('/library/folders', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateFolder: (id: string, data: { name?: string; parent_id?: string; description?: string; color?: string }) =>
        fetchApiWithAuth<LibraryFolder>(`/library/folders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteFolder: (id: string) =>
        fetchApiWithAuth<void>(`/library/folders/${id}`, {
            method: 'DELETE',
        }),

    // Documents
    getDocuments: (params?: { folder_id?: string; page?: number; page_size?: number; search?: string; tags?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.folder_id) searchParams.set('folder_id', params.folder_id);
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
        if (params?.search) searchParams.set('search', params.search);
        if (params?.tags) searchParams.set('tags', params.tags);
        const query = searchParams.toString();
        return fetchApiWithAuth<LibraryDocumentList>(`/library/documents${query ? `?${query}` : ''}`);
    },

    uploadDocument: (file: File, folderId?: string, tags?: string[]) => {
        const formData = new FormData();
        formData.append('file', file);
        if (folderId) formData.append('folder_id', folderId);
        if (tags && tags.length > 0) formData.append('tags', tags.join(','));
        return fetchApiFormData<LibraryDocument>('/library/documents/upload', formData);
    },

    importUrl: (url: string, folderId?: string, tags?: string[]) =>
        fetchApiWithAuth<LibraryDocument>('/library/documents/import-url', {
            method: 'POST',
            body: JSON.stringify({ url, folder_id: folderId, tags }),
        }),

    getDocument: (id: string) => fetchApiWithAuth<LibraryDocument>(`/library/documents/${id}`),

    updateDocument: (id: string, data: { name?: string; tags?: string[] }) =>
        fetchApiWithAuth<LibraryDocument>(`/library/documents/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteDocument: (id: string) =>
        fetchApiWithAuth<void>(`/library/documents/${id}`, {
            method: 'DELETE',
        }),

    moveDocument: (id: string, folderId: string | null) =>
        fetchApiWithAuth<LibraryDocument>(`/library/documents/${id}/move`, {
            method: 'POST',
            body: JSON.stringify({ folder_id: folderId }),
        }),

    getDocumentStatus: (id: string) => fetchApiWithAuth<DocumentStatus>(`/library/documents/${id}/status`),

    getDocumentContent: (id: string) =>
        fetchApiWithAuth<{ id: string; name: string; content: string; parse_status: string }>(
            `/library/documents/${id}/content`
        ),

    // Tags
    getTags: () => fetchApiWithAuth<{ tags: LibraryTag[] }>('/library/tags'),
};
