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

// =============================================================================
// Writing API Types
// =============================================================================

export interface WritingProject {
    id: string;
    title: string;
    template_type: string | null;
    content: string;
    content_html: string;
    word_count: number;
    character_count: number;
    status: 'draft' | 'completed' | 'archived';
    created_at: string;
    updated_at: string;
}

export interface WritingProjectList {
    projects: WritingProject[];
    total: number;
    page: number;
    page_size: number;
}

export interface WritingTemplate {
    id: string;
    name: string;
    name_cn: string;
    description: string;
    initial_content: string;
    icon: string;
}

export interface AIWritingRequest {
    action: 'continue' | 'rewrite' | 'translate' | 'polish';
    selected_text?: string;
    cursor_position?: number;
    context_before?: string;
    context_after?: string;
    target_language?: string;
    model?: string;
}

// =============================================================================
// Writing API
// =============================================================================

export const writingApi = {
    // Templates
    getTemplates: () => fetchApiWithAuth<{ templates: WritingTemplate[] }>('/writing/templates'),

    // Projects
    getProjects: (params?: { page?: number; page_size?: number; status?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
        if (params?.status) searchParams.set('status', params.status);
        const query = searchParams.toString();
        return fetchApiWithAuth<WritingProjectList>(`/writing/projects${query ? `?${query}` : ''}`);
    },

    createProject: (data: { title: string; template_type?: string; content?: string; content_html?: string }) =>
        fetchApiWithAuth<WritingProject>('/writing/projects', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getProject: (id: string) => fetchApiWithAuth<WritingProject>(`/writing/projects/${id}`),

    updateProject: (id: string, data: { title?: string; content?: string; content_html?: string; status?: string }) =>
        fetchApiWithAuth<WritingProject>(`/writing/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteProject: (id: string) =>
        fetchApiWithAuth<void>(`/writing/projects/${id}`, {
            method: 'DELETE',
        }),

    // AI Writing (streaming)
    aiWriting: async (
        projectId: string,
        request: AIWritingRequest,
        onChunk: (chunk: string) => void,
        onError?: (error: string) => void
    ): Promise<void> => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const response = await fetch(`${API_BASE}/writing/projects/${projectId}/ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'AI request failed' }));
            throw new Error(error.detail || 'AI request failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        while (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.content) {
                            onChunk(data.content);
                        }
                        if (data.error) {
                            onError?.(data.error);
                            throw new Error(data.error);
                        }
                        if (data.done) {
                            return;
                        }
                    } catch (e) {
                        // Skip invalid JSON lines
                        if (e instanceof SyntaxError) continue;
                        throw e;
                    }
                }
            }
        }
    },

    // Save to Library
    saveToLibrary: (projectId: string, folderId?: string, tags?: string[]) =>
        fetchApiWithAuth<{ id: string; title: string; message: string }>(
            `/writing/projects/${projectId}/save-to-library`,
            {
                method: 'POST',
                body: JSON.stringify({ folder_id: folderId, tags }),
            }
        ),
};

// =============================================================================
// Reports API Types
// =============================================================================

export interface ReportSection {
    id: string;
    title: string;
    content: string;
    order: number;
    ai_generated: boolean;
}

export interface ChartDataPoint {
    name: string;
    value: number;
    extra?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface ChartConfig {
    xKey: string;
    yKey: string;
    colors: string[];
}

export interface ReportChart {
    id: string;
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: ChartDataPoint[];
    config: ChartConfig;
}

export interface Report {
    id: string;
    title: string;
    template_type: string;
    status: 'draft' | 'generating' | 'completed' | 'exported';
    sections: ReportSection[];
    charts_data: ReportChart[];
    content: string;
    content_html: string;
    export_format: string | null;
    exported_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ReportList {
    reports: Report[];
    total: number;
    page: number;
    page_size: number;
}

export interface ReportTemplate {
    id: string;
    name: string;
    name_cn: string;
    description: string;
    icon: string;
    sections: { title: string; placeholder: string }[];
}

export interface ChartType {
    id: string;
    name: string;
    description: string;
}

export interface AIGenerateRequest {
    section_id?: string;
    prompt?: string;
    model?: string;
}

// =============================================================================
// Reports API
// =============================================================================

export const reportsApi = {
    // Templates
    getTemplates: () => fetchApiWithAuth<{ templates: ReportTemplate[] }>('/reports/templates'),

    getChartTypes: () => fetchApiWithAuth<{ chart_types: ChartType[] }>('/reports/chart-types'),

    // Reports CRUD
    getReports: (params?: { page?: number; page_size?: number; status?: string; template_type?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
        if (params?.status) searchParams.set('status', params.status);
        if (params?.template_type) searchParams.set('template_type', params.template_type);
        const query = searchParams.toString();
        return fetchApiWithAuth<ReportList>(`/reports/reports${query ? `?${query}` : ''}`);
    },

    createReport: (data: { title: string; template_type?: string; research_session_id?: string }) =>
        fetchApiWithAuth<Report>('/reports/reports', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getReport: (id: string) => fetchApiWithAuth<Report>(`/reports/reports/${id}`),

    updateReport: (id: string, data: { title?: string; content?: string; content_html?: string; status?: string }) =>
        fetchApiWithAuth<Report>(`/reports/reports/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteReport: (id: string) =>
        fetchApiWithAuth<void>(`/reports/reports/${id}`, {
            method: 'DELETE',
        }),

    // Sections
    addSection: (reportId: string, data: { title?: string; content?: string }) =>
        fetchApiWithAuth<{ message: string; section: ReportSection }>(`/reports/reports/${reportId}/sections`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateSection: (reportId: string, sectionId: string, data: { title?: string; content?: string }) =>
        fetchApiWithAuth<{ message: string; section_id: string }>(`/reports/reports/${reportId}/sections/${sectionId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteSection: (reportId: string, sectionId: string) =>
        fetchApiWithAuth<{ message: string }>(`/reports/reports/${reportId}/sections/${sectionId}`, {
            method: 'DELETE',
        }),

    // Charts
    addChart: (reportId: string, data: { type: string; title: string; data: ChartDataPoint[]; config?: ChartConfig }) =>
        fetchApiWithAuth<{ message: string; chart: ReportChart }>(`/reports/reports/${reportId}/charts`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateChart: (reportId: string, chartId: string, data: { title?: string; data?: ChartDataPoint[]; config?: ChartConfig }) =>
        fetchApiWithAuth<{ message: string; chart_id: string }>(`/reports/reports/${reportId}/charts/${chartId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteChart: (reportId: string, chartId: string) =>
        fetchApiWithAuth<{ message: string }>(`/reports/reports/${reportId}/charts/${chartId}`, {
            method: 'DELETE',
        }),

    // AI Generation (streaming)
    generateContent: async (
        reportId: string,
        request: AIGenerateRequest,
        onChunk: (chunk: string) => void,
        onDone?: (sectionId?: string) => void,
        onError?: (error: string) => void
    ): Promise<void> => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const response = await fetch(`${API_BASE}/reports/reports/${reportId}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'AI request failed' }));
            throw new Error(error.detail || 'AI request failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        while (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.content) {
                            onChunk(data.content);
                        }
                        if (data.error) {
                            onError?.(data.error);
                            throw new Error(data.error);
                        }
                        if (data.done) {
                            onDone?.(data.section_id);
                            return;
                        }
                    } catch (e) {
                        if (e instanceof SyntaxError) continue;
                        throw e;
                    }
                }
            }
        }
    },

    // Export
    exportReport: async (reportId: string, format: 'pdf' | 'docx' | 'md'): Promise<Blob> => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const response = await fetch(`${API_BASE}/reports/reports/${reportId}/export`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ format }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Export failed' }));
            throw new Error(error.detail || 'Export failed');
        }

        return response.blob();
    },
};

// =============================================================================
// Image API
// =============================================================================

export interface ImageModel {
    id: string;
    name: string;
    provider: string;
    type: string;
    sizes?: string[];
}

export interface ImageModelsResponse {
    generation_models: ImageModel[];
    analysis_models: ImageModel[];
}

export interface ImageGeneration {
    id: string;
    prompt: string;
    negative_prompt?: string;
    model: string;
    image_url?: string;
    width: number;
    height: number;
    style?: string;
    quality?: string;
    status: string;
    error_message?: string;
    created_at: string;
}

export interface ImageGenerationListResponse {
    generations: ImageGeneration[];
    total: number;
}

export interface ImageGenerateOptions {
    model?: string;
    size?: string;
    style?: string;
    quality?: string;
    negative_prompt?: string;
}

export const imageApi = {
    getModels: () => fetchApiWithAuth<ImageModelsResponse>('/image/models'),

    generate: (prompt: string, options: ImageGenerateOptions = {}) =>
        fetchApiWithAuth<ImageGeneration>('/image/generate', {
            method: 'POST',
            body: JSON.stringify({
                prompt,
                model: options.model || 'dall-e-3',
                size: options.size || '1024x1024',
                style: options.style || 'vivid',
                quality: options.quality || 'standard',
                negative_prompt: options.negative_prompt,
            }),
        }),

    getGenerations: (skip = 0, limit = 20) =>
        fetchApiWithAuth<ImageGenerationListResponse>(`/image/generations?skip=${skip}&limit=${limit}`),

    getGeneration: (id: string) =>
        fetchApiWithAuth<ImageGeneration>(`/image/generations/${id}`),

    deleteGeneration: (id: string) =>
        fetchApiWithAuth<{ message: string }>(`/image/generations/${id}`, {
            method: 'DELETE',
        }),

    analyzeImage: async (
        imageUrl: string,
        prompt: string,
        model: string,
        onChunk: (content: string) => void,
        onDone: () => void,
        onError: (error: string) => void
    ): Promise<void> => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const response = await fetch(`${API_BASE}/image/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ image_url: imageUrl, prompt, model }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Analysis failed' }));
            throw new Error(error.detail || 'Analysis failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.content) {
                                onChunk(data.content);
                            } else if (data.error) {
                                onError(data.error);
                                return;
                            } else if (data.done) {
                                onDone();
                                return;
                            }
                        } catch {
                            // Ignore parse errors
                        }
                    }
                }
            }
        }
    },

    analyzeUploadedImage: async (
        file: File,
        prompt: string,
        model: string,
        onChunk: (content: string) => void,
        onDone: () => void,
        onError: (error: string) => void
    ): Promise<void> => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('prompt', prompt);
        formData.append('model', model);

        const response = await fetch(`${API_BASE}/image/analyze-upload`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Analysis failed' }));
            throw new Error(error.detail || 'Analysis failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.content) {
                                onChunk(data.content);
                            } else if (data.error) {
                                onError(data.error);
                                return;
                            } else if (data.done) {
                                onDone();
                                return;
                            }
                        } catch {
                            // Ignore parse errors
                        }
                    }
                }
            }
        }
    },
};

// =============================================================================
// Teams API
// =============================================================================

export interface TeamMember {
    id: string;
    user_id: string;
    username: string;
    email: string;
    role: string;
    joined_at: string;
}

export interface Team {
    id: string;
    owner_id: string;
    name: string;
    description?: string;
    avatar_url?: string;
    member_count: number;
    created_at: string;
    updated_at: string;
}

export interface TeamDetail extends Team {
    members: TeamMember[];
}

export interface TeamListResponse {
    teams: Team[];
    total: number;
}

export interface TeamTask {
    id: string;
    team_id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    due_date?: string;
    completed_at?: string;
    assignee_id?: string;
    assignee_name?: string;
    created_by_id: string;
    created_at: string;
    updated_at: string;
}

export interface TaskListResponse {
    tasks: TeamTask[];
    total: number;
}

export const teamsApi = {
    // Teams
    getTeams: () => fetchApiWithAuth<TeamListResponse>('/teams/teams'),

    createTeam: (data: { name: string; description?: string }) =>
        fetchApiWithAuth<Team>('/teams/teams', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getTeam: (id: string) => fetchApiWithAuth<TeamDetail>(`/teams/teams/${id}`),

    updateTeam: (id: string, data: { name?: string; description?: string; settings?: Record<string, unknown> }) =>
        fetchApiWithAuth<Team>(`/teams/teams/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteTeam: (id: string) =>
        fetchApiWithAuth<void>(`/teams/teams/${id}`, {
            method: 'DELETE',
        }),

    // Members
    getMembers: (teamId: string) =>
        fetchApiWithAuth<TeamMember[]>(`/teams/teams/${teamId}/members`),

    addMember: (teamId: string, data: { email: string; role?: string }) =>
        fetchApiWithAuth<TeamMember>(`/teams/teams/${teamId}/members`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateMember: (teamId: string, userId: string, data: { role: string }) =>
        fetchApiWithAuth<TeamMember>(`/teams/teams/${teamId}/members/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    removeMember: (teamId: string, userId: string) =>
        fetchApiWithAuth<void>(`/teams/teams/${teamId}/members/${userId}`, {
            method: 'DELETE',
        }),

    // Tasks
    getTasks: (teamId: string, filters?: { status?: string; assignee_id?: string; priority?: string }) => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.assignee_id) params.append('assignee_id', filters.assignee_id);
        if (filters?.priority) params.append('priority', filters.priority);
        const query = params.toString();
        return fetchApiWithAuth<TaskListResponse>(`/teams/teams/${teamId}/tasks${query ? `?${query}` : ''}`);
    },

    createTask: (teamId: string, data: {
        title: string;
        description?: string;
        priority?: string;
        due_date?: string;
        assignee_id?: string;
    }) =>
        fetchApiWithAuth<TeamTask>(`/teams/teams/${teamId}/tasks`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateTask: (teamId: string, taskId: string, data: {
        title?: string;
        description?: string;
        status?: string;
        priority?: string;
        due_date?: string;
        assignee_id?: string;
    }) =>
        fetchApiWithAuth<TeamTask>(`/teams/teams/${teamId}/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteTask: (teamId: string, taskId: string) =>
        fetchApiWithAuth<void>(`/teams/teams/${teamId}/tasks/${taskId}`, {
            method: 'DELETE',
        }),

    // My Tasks (across all teams)
    getMyTasks: (status?: string) => {
        const query = status ? `?status=${status}` : '';
        return fetchApiWithAuth<TaskListResponse>(`/teams/my-tasks${query}`);
    },
};

// =============================================================================
// Store API Types
// =============================================================================

export interface ToolConfigOption {
    type: string;
    default?: unknown;
    min?: number;
    max?: number;
    options?: string[];
}

export interface CatalogTool {
    tool_id: string;
    name: string;
    name_cn: string;
    description: string;
    description_cn: string;
    category: string;
    version: string;
    author: string;
    icon: string;
    config_schema: Record<string, ToolConfigOption>;
    features: string[];
    tags: string[];
    is_installed: boolean;
    is_enabled: boolean;
    user_config: Record<string, unknown> | null;
    usage_count: number;
    installed_at: string | null;
}

export interface InstalledTool {
    id: string;
    tool_id: string;
    tool_name: string;
    tool_version: string;
    is_enabled: boolean;
    config: Record<string, unknown>;
    usage_count: number;
    last_used_at: string | null;
    installed_at: string;
    description: string;
    description_cn: string;
    category: string;
    icon: string;
    config_schema: Record<string, ToolConfigOption>;
}

export interface ToolCategory {
    id: string;
    name: string;
    name_cn: string;
    icon: string;
}

export interface CatalogListResponse {
    tools: CatalogTool[];
    total: number;
    categories: string[];
}

export interface InstalledToolListResponse {
    tools: InstalledTool[];
    total: number;
}

// =============================================================================
// Store API
// =============================================================================

export const storeApi = {
    // Catalog
    getCatalog: (params?: { category?: string; search?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.category) searchParams.set('category', params.category);
        if (params?.search) searchParams.set('search', params.search);
        const query = searchParams.toString();
        return fetchApiWithAuth<CatalogListResponse>(`/store/catalog${query ? `?${query}` : ''}`);
    },

    getCatalogTool: (toolId: string) =>
        fetchApiWithAuth<CatalogTool>(`/store/catalog/${toolId}`),

    getCategories: () =>
        fetchApiWithAuth<{ categories: ToolCategory[] }>('/store/categories'),

    // Installation
    installTool: (toolId: string, config?: Record<string, unknown>) =>
        fetchApiWithAuth<InstalledTool>('/store/install', {
            method: 'POST',
            body: JSON.stringify({ tool_id: toolId, config }),
        }),

    uninstallTool: (toolId: string) =>
        fetchApiWithAuth<void>(`/store/installed/${toolId}`, {
            method: 'DELETE',
        }),

    // Installed tools management
    getInstalledTools: (enabledOnly = false) => {
        const query = enabledOnly ? '?enabled_only=true' : '';
        return fetchApiWithAuth<InstalledToolListResponse>(`/store/installed${query}`);
    },

    getInstalledTool: (toolId: string) =>
        fetchApiWithAuth<InstalledTool>(`/store/installed/${toolId}`),

    updateInstalledTool: (toolId: string, data: { config?: Record<string, unknown>; is_enabled?: boolean }) =>
        fetchApiWithAuth<InstalledTool>(`/store/installed/${toolId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    toggleTool: (toolId: string) =>
        fetchApiWithAuth<InstalledTool>(`/store/installed/${toolId}/toggle`, {
            method: 'POST',
        }),

    recordUsage: (toolId: string) =>
        fetchApiWithAuth<{ message: string; usage_count: number }>(`/store/installed/${toolId}/usage`, {
            method: 'POST',
        }),
};

// =============================================================================
// Decision API Types
// =============================================================================

export interface DecisionOption {
    id: string;
    name: string;
    description?: string;
}

export interface DecisionCriterion {
    id: string;
    name: string;
    description?: string;
    type: 'benefit' | 'cost';
}

export interface DecisionScenario {
    id: string;
    name: string;
    weight_adjustments: Record<string, number>;
    results?: Record<string, number>;
    ranking?: string[];
}

export interface DecisionAnalysis {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    options: DecisionOption[];
    criteria: DecisionCriterion[];
    weights: Record<string, number>;
    scores: Record<string, Record<string, number>>;
    results: Record<string, number>;
    ranking: string[];
    scenarios: DecisionScenario[];
    ai_recommendation?: string;
    ai_analysis?: Record<string, unknown>;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface DecisionListItem {
    id: string;
    title: string;
    description?: string;
    status: string;
    option_count: number;
    criteria_count: number;
    created_at: string;
    updated_at: string;
}

export interface DecisionListResponse {
    analyses: DecisionListItem[];
    total: number;
    page: number;
    page_size: number;
}

export interface CalculationResult {
    results: Record<string, number>;
    ranking: string[];
}

// =============================================================================
// Decision API
// =============================================================================

export const decisionApi = {
    // CRUD
    getAnalyses: (params?: { page?: number; page_size?: number; status?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
        if (params?.status) searchParams.set('status', params.status);
        const query = searchParams.toString();
        return fetchApiWithAuth<DecisionListResponse>(`/decisions${query ? `?${query}` : ''}`);
    },

    createAnalysis: (data: { title: string; description?: string }) =>
        fetchApiWithAuth<DecisionAnalysis>('/decisions', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getAnalysis: (id: string) => fetchApiWithAuth<DecisionAnalysis>(`/decisions/${id}`),

    updateAnalysis: (id: string, data: { title?: string; description?: string; status?: string }) =>
        fetchApiWithAuth<DecisionAnalysis>(`/decisions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteAnalysis: (id: string) =>
        fetchApiWithAuth<void>(`/decisions/${id}`, {
            method: 'DELETE',
        }),

    // Matrix Operations
    updateOptions: (id: string, options: DecisionOption[]) =>
        fetchApiWithAuth<DecisionAnalysis>(`/decisions/${id}/options`, {
            method: 'PUT',
            body: JSON.stringify({ options }),
        }),

    updateCriteria: (id: string, criteria: DecisionCriterion[]) =>
        fetchApiWithAuth<DecisionAnalysis>(`/decisions/${id}/criteria`, {
            method: 'PUT',
            body: JSON.stringify({ criteria }),
        }),

    updateWeights: (id: string, weights: Record<string, number>) =>
        fetchApiWithAuth<DecisionAnalysis>(`/decisions/${id}/weights`, {
            method: 'PUT',
            body: JSON.stringify({ weights }),
        }),

    updateScores: (id: string, scores: Record<string, Record<string, number>>) =>
        fetchApiWithAuth<DecisionAnalysis>(`/decisions/${id}/scores`, {
            method: 'PUT',
            body: JSON.stringify({ scores }),
        }),

    // Calculation
    calculate: (id: string) =>
        fetchApiWithAuth<CalculationResult>(`/decisions/${id}/calculate`, {
            method: 'POST',
        }),

    // Scenarios
    addScenario: (id: string, data: { name: string; weight_adjustments: Record<string, number> }) =>
        fetchApiWithAuth<{ message: string; scenario: DecisionScenario }>(`/decisions/${id}/scenarios`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    deleteScenario: (id: string, scenarioId: string) =>
        fetchApiWithAuth<void>(`/decisions/${id}/scenarios/${scenarioId}`, {
            method: 'DELETE',
        }),

    simulate: (id: string, scenarioId: string) =>
        fetchApiWithAuth<CalculationResult>(`/decisions/${id}/simulate`, {
            method: 'POST',
            body: JSON.stringify({ scenario_id: scenarioId }),
        }),

    // AI Recommendation (streaming)
    generateRecommendation: async (
        id: string,
        request: { prompt?: string; model?: string },
        onChunk: (content: string) => void,
        onDone?: () => void,
        onError?: (error: string) => void
    ): Promise<void> => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const response = await fetch(`${API_BASE}/decisions/${id}/ai-recommendation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'AI request failed' }));
            throw new Error(error.detail || 'AI request failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        while (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.content) {
                            onChunk(data.content);
                        }
                        if (data.error) {
                            onError?.(data.error);
                            throw new Error(data.error);
                        }
                        if (data.done) {
                            onDone?.();
                            return;
                        }
                    } catch (e) {
                        if (e instanceof SyntaxError) continue;
                        throw e;
                    }
                }
            }
        }
    },
};

// =============================================================================
// Agent Profile API Types (Multi-Agent Research System)
// =============================================================================

export interface PipelineModule1Config {
    generator_model: string;
    reviewer_model: string;
    refiner_model: string;
    template_type: string;
    pass_threshold: number;
    max_iterations: number;
    special_instructions: string;
}

export interface PipelineModule2Config {
    analyzer_model: string;
    default_insights: string[];
    agent_digests: string[];
    semantic_search_enabled: boolean;
    semantic_top_k: number;
    token_budget: number;
    focus_topics: string[];
}

export interface PipelineModule3Config {
    preprocessor_model: string;
    tasks: string[];
    temperature: number;
    max_tokens: number;
}

export interface PipelineConfig {
    module1: PipelineModule1Config;
    module2: PipelineModule2Config;
    module3: PipelineModule3Config;
}

export interface AgentProfile {
    id: string;
    user_id: string;
    agent_type: string;
    display_name: string;
    display_name_cn: string;
    cluster: 'reasoning' | 'information' | 'production' | 'coordination';
    role_model: string;
    fallback_model?: string;
    temperature: number;
    max_tokens: number;
    persona: string;
    traits: Record<string, string>;
    responsibilities: string[];
    pipeline_config: PipelineConfig;
    data_sources: string[];
    enabled_skills: string[];
    is_custom: boolean;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface AgentProfileCreate {
    agent_type: string;
    display_name: string;
    display_name_cn: string;
    cluster?: 'reasoning' | 'information' | 'production' | 'coordination';
    role_model: string;
    fallback_model?: string;
    temperature?: number;
    max_tokens?: number;
    persona?: string;
    traits?: Record<string, string>;
    responsibilities?: string[];
    pipeline_config?: Partial<PipelineConfig>;
    data_sources?: string[];
    enabled_skills?: string[];
}

export interface AgentProfileUpdate {
    display_name?: string;
    display_name_cn?: string;
    role_model?: string;
    fallback_model?: string;
    temperature?: number;
    max_tokens?: number;
    persona?: string;
    traits?: Record<string, string>;
    responsibilities?: string[];
    pipeline_config?: Partial<PipelineConfig>;
    data_sources?: string[];
    enabled_skills?: string[];
    is_enabled?: boolean;
}

export interface DefaultAgentTemplate {
    agent_type: string;
    display_name: string;
    display_name_cn: string;
    cluster: string;
    role_model: string;
    fallback_model?: string;
    temperature: number;
    max_tokens: number;
    persona: string;
    traits: Record<string, string>;
    responsibilities: string[];
    pipeline_config: PipelineConfig;
    data_sources: string[];
    enabled_skills: string[];
}

export interface AgentTestResult {
    agent_id: string;
    agent_type: string;
    task: string;
    result: string;
    tokens_used: number;
    duration_ms: number;
    model_used: string;
}

// =============================================================================
// Agent Profile API
// =============================================================================

export const agentApi = {
    // Get all user's agent profiles
    getProfiles: () =>
        fetchApiWithAuth<{ profiles: AgentProfile[]; total: number }>('/agents/profiles'),

    // Get default agent templates (14 agents)
    getDefaults: () =>
        fetchApiWithAuth<{ agents: DefaultAgentTemplate[] }>('/agents/profiles/defaults'),

    // Initialize default agents for user
    initDefaults: () =>
        fetchApiWithAuth<{ message: string; created_count: number }>('/agents/profiles/init-defaults', {
            method: 'POST',
        }),

    // Create custom agent profile
    createProfile: (data: AgentProfileCreate) =>
        fetchApiWithAuth<AgentProfile>('/agents/profiles', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // Get single profile
    getProfile: (id: string) =>
        fetchApiWithAuth<AgentProfile>(`/agents/profiles/${id}`),

    // Update profile
    updateProfile: (id: string, data: AgentProfileUpdate) =>
        fetchApiWithAuth<AgentProfile>(`/agents/profiles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    // Delete profile
    deleteProfile: (id: string) =>
        fetchApiWithAuth<void>(`/agents/profiles/${id}`, {
            method: 'DELETE',
        }),

    // Clone profile
    cloneProfile: (id: string) =>
        fetchApiWithAuth<AgentProfile>(`/agents/profiles/${id}/clone`, {
            method: 'POST',
        }),

    // Test agent with a simple task
    testAgent: (id: string, task: string) =>
        fetchApiWithAuth<AgentTestResult>(`/agents/profiles/${id}/test`, {
            method: 'POST',
            body: JSON.stringify({ task }),
        }),
};

// =============================================================================
// Research Session API Types (Multi-Agent Collaboration)
// =============================================================================

export interface ResearchSession {
    id: string;
    user_id: string;
    name: string;
    task: string;
    status: 'active' | 'running' | 'completed' | 'failed' | 'archived';
    current_stage?: string;
    progress: number;
    workspace_path?: string;
    total_tokens: number;
    total_cost: number;
    created_at: string;
    updated_at: string;
    completed_at?: string;
}

export interface ResearchSessionCreate {
    name: string;
    task: string;
}

export interface ResearchSessionUpdate {
    name?: string;
    status?: string;
}

export interface ResearchTaskItem {
    id: string;
    session_id: string;
    parent_task_id?: string;
    description: string;
    assigned_agent: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
    dependencies: string[];
    execution_order: number;
    execution_group: number;
    output?: string;
    created_at: string;
    updated_at: string;
}

export interface AgentExecution {
    id: string;
    session_id: string;
    agent_profile_id?: string;
    research_task_id?: string;
    agent_type: string;
    agent_name: string;
    task_description: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    input_context?: Record<string, unknown>;
    output_result?: string;
    structured_output?: {
        key_findings?: string[];
        uncertainties?: string[];
        suggestions?: string[];
        references?: string[];
    };
    tokens_used: number;
    duration_ms: number;
    model_used: string;
    confidence?: number;
    raw_output_path?: string;
    error_message?: string;
    retry_count: number;
    started_at?: string;
    completed_at?: string;
}

export interface MemoryLayer {
    layer: string;
    files: {
        name: string;
        path: string;
        size: number;
        modified_at: string;
    }[];
}

export interface MemoryContent {
    layer: string;
    path: string;
    content: string;
}

// Research execution events (SSE)
export interface ResearchEvent {
    type: 'session_started' | 'decomposition_complete' | 'group_started' |
          'task_started' | 'task_progress' | 'task_completed' | 'task_failed' |
          'group_completed' | 'synthesis_started' | 'synthesis_complete' |
          'session_completed' | 'error';
    data: {
        session_id?: string;
        task_id?: string;
        agent_type?: string;
        agent_name?: string;
        message?: string;
        progress?: number;
        tasks?: ResearchTaskItem[];
        result?: string;
        synthesis?: string;
        error?: string;
        [key: string]: unknown;
    };
}

// =============================================================================
// Research Session API
// =============================================================================

export const researchApi = {
    // Sessions CRUD
    getSessions: (params?: { status?: string; page?: number; page_size?: number }) => {
        const searchParams = new URLSearchParams();
        if (params?.status) searchParams.set('status', params.status);
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
        const query = searchParams.toString();
        return fetchApiWithAuth<{ sessions: ResearchSession[]; total: number }>(
            `/research/sessions${query ? `?${query}` : ''}`
        );
    },

    createSession: (data: ResearchSessionCreate) =>
        fetchApiWithAuth<ResearchSession>('/research/sessions', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getSession: (id: string) =>
        fetchApiWithAuth<ResearchSession>(`/research/sessions/${id}`),

    updateSession: (id: string, data: ResearchSessionUpdate) =>
        fetchApiWithAuth<ResearchSession>(`/research/sessions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteSession: (id: string) =>
        fetchApiWithAuth<void>(`/research/sessions/${id}`, {
            method: 'DELETE',
        }),

    // Tasks
    getTasks: (sessionId: string) =>
        fetchApiWithAuth<{ tasks: ResearchTaskItem[]; total: number }>(
            `/research/sessions/${sessionId}/tasks`
        ),

    // Executions
    getExecutions: (sessionId: string) =>
        fetchApiWithAuth<{ executions: AgentExecution[]; total: number }>(
            `/research/sessions/${sessionId}/executions`
        ),

    // Memory
    getMemory: (sessionId: string, layer?: 'L0' | 'L1' | 'L2') => {
        const query = layer ? `?layer=${layer}` : '';
        return fetchApiWithAuth<{ layers: MemoryLayer[] }>(
            `/research/sessions/${sessionId}/memory${query}`
        );
    },

    getMemoryContent: (sessionId: string, path: string) =>
        fetchApiWithAuth<MemoryContent>(
            `/research/sessions/${sessionId}/memory/content?path=${encodeURIComponent(path)}`
        ),

    // Execute research (streaming via SSE)
    executeResearch: async (
        sessionId: string,
        onEvent: (event: ResearchEvent) => void,
        onError?: (error: string) => void
    ): Promise<void> => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const response = await fetch(`${API_BASE}/research/sessions/${sessionId}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Research execution failed' }));
            throw new Error(error.detail || 'Research execution failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        while (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.error) {
                            onError?.(data.error);
                        } else {
                            onEvent(data as ResearchEvent);
                        }
                    } catch {
                        // Skip invalid JSON lines
                    }
                }
            }
        }
    },

    // Execute specific skill
    executeSkill: (sessionId: string, skill: string, params: Record<string, unknown>) =>
        fetchApiWithAuth<{ result: string; tokens_used: number }>(
            `/research/sessions/${sessionId}/skills/${skill}`,
            {
                method: 'POST',
                body: JSON.stringify(params),
            }
        ),
};

// =============================================================================
// Agent Workflow API Types
// =============================================================================

export interface WorkflowNodeConfig {
    // Model settings
    roleModel?: string;
    fallbackModel?: string;
    temperature?: number;
    maxTokens?: number;
    // Persona
    persona?: string;
    // Traits
    traits?: Record<string, string>;
    // Responsibilities
    responsibilities?: string[];
    // Data sources
    dataSources?: string[];
    // Custom prompt override
    customPrompt?: string;
}

export interface WorkflowNode {
    id: string;
    agentType: string;
    agentProfileId?: string;
    position: { x: number; y: number };
    label?: string;
    labelCn?: string;
    cluster?: string;
    config?: WorkflowNodeConfig;
}

export interface WorkflowEdgeConfig {
    dataFormat?: 'markdown' | 'json' | 'text' | 'auto';
    transform?: {
        mode: 'pass' | 'summarize' | 'extract' | 'filter';
        maxTokens?: number;
        extractFields?: string[];
        filterCondition?: string;
    };
    condition?: {
        enabled: boolean;
        field?: string;
        operator?: string;
        value?: string | number;
        fallbackNodeId?: string;
    };
    priority?: number;
    blocking?: boolean;
    timeout?: number;
}

export interface WorkflowEdge {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    edgeType: 'data_flow' | 'conditional' | 'storage_read' | 'storage_write';
    config?: WorkflowEdgeConfig;
}

export interface AgentWorkflow {
    id: string;
    user_id?: string;
    name: string;
    name_cn?: string;
    description?: string;
    icon: string;
    is_template: boolean;
    template_category?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    default_settings?: Record<string, unknown>;
    status: 'draft' | 'active' | 'archived';
    version: number;
    node_count: number;
    edge_count: number;
    created_at: string;
    updated_at: string;
}

export interface WorkflowCreate {
    name: string;
    name_cn?: string;
    description?: string;
    icon?: string;
    nodes?: WorkflowNode[];
    edges?: WorkflowEdge[];
    default_settings?: Record<string, unknown>;
}

export interface WorkflowUpdate {
    name?: string;
    name_cn?: string;
    description?: string;
    icon?: string;
    nodes?: WorkflowNode[];
    edges?: WorkflowEdge[];
    default_settings?: Record<string, unknown>;
    status?: string;
}

// =============================================================================
// Agent Workflow API
// =============================================================================

export const workflowApi = {
    // List user's workflows
    list: () =>
        fetchApiWithAuth<{ workflows: AgentWorkflow[] }>('/workflows'),

    // List system templates
    getTemplates: () =>
        fetchApiWithAuth<{ templates: AgentWorkflow[] }>('/workflows/templates'),

    // Create workflow
    create: (data: WorkflowCreate) =>
        fetchApiWithAuth<AgentWorkflow>('/workflows', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // Get workflow details
    get: (id: string) =>
        fetchApiWithAuth<AgentWorkflow>(`/workflows/${id}`),

    // Update workflow
    update: (id: string, data: WorkflowUpdate) =>
        fetchApiWithAuth<AgentWorkflow>(`/workflows/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    // Delete workflow
    delete: (id: string) =>
        fetchApiWithAuth<void>(`/workflows/${id}`, {
            method: 'DELETE',
        }),

    // Clone workflow
    clone: (id: string) =>
        fetchApiWithAuth<AgentWorkflow>(`/workflows/${id}/clone`, {
            method: 'POST',
        }),

    // Node operations
    addNode: (workflowId: string, node: WorkflowNode) =>
        fetchApiWithAuth<AgentWorkflow>(`/workflows/${workflowId}/nodes`, {
            method: 'POST',
            body: JSON.stringify(node),
        }),

    updateNode: (workflowId: string, nodeId: string, node: WorkflowNode) =>
        fetchApiWithAuth<AgentWorkflow>(`/workflows/${workflowId}/nodes/${nodeId}`, {
            method: 'PUT',
            body: JSON.stringify(node),
        }),

    deleteNode: (workflowId: string, nodeId: string) =>
        fetchApiWithAuth<AgentWorkflow>(`/workflows/${workflowId}/nodes/${nodeId}`, {
            method: 'DELETE',
        }),

    // Edge operations
    addEdge: (workflowId: string, edge: WorkflowEdge) =>
        fetchApiWithAuth<AgentWorkflow>(`/workflows/${workflowId}/edges`, {
            method: 'POST',
            body: JSON.stringify(edge),
        }),

    updateEdge: (workflowId: string, edgeId: string, edge: WorkflowEdge) =>
        fetchApiWithAuth<AgentWorkflow>(`/workflows/${workflowId}/edges/${edgeId}`, {
            method: 'PUT',
            body: JSON.stringify(edge),
        }),

    deleteEdge: (workflowId: string, edgeId: string) =>
        fetchApiWithAuth<AgentWorkflow>(`/workflows/${workflowId}/edges/${edgeId}`, {
            method: 'DELETE',
        }),

    // Mission operations
    listMissions: (workflowId: string) =>
        fetchApiWithAuth<{ missions: WorkflowMission[] }>(`/workflows/${workflowId}/missions`),

    createMission: (workflowId: string, data: MissionCreate) =>
        fetchApiWithAuth<WorkflowMission>(`/workflows/${workflowId}/missions`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getMission: (workflowId: string, missionId: string) =>
        fetchApiWithAuth<WorkflowMission>(`/workflows/${workflowId}/missions/${missionId}`),

    updateMission: (workflowId: string, missionId: string, data: MissionUpdate) =>
        fetchApiWithAuth<WorkflowMission>(`/workflows/${workflowId}/missions/${missionId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteMission: (workflowId: string, missionId: string) =>
        fetchApiWithAuth<void>(`/workflows/${workflowId}/missions/${missionId}`, {
            method: 'DELETE',
        }),

    saveMissionToLibrary: (workflowId: string, missionId: string, data?: { folder_id?: string; tags?: string[] }) =>
        fetchApiWithAuth<{ document_id: string; message: string }>(
            `/workflows/${workflowId}/missions/${missionId}/save-to-library`,
            {
                method: 'POST',
                body: JSON.stringify(data || {}),
            }
        ),

    // Execute mission with SSE (returns URL for EventSource)
    getExecuteMissionUrl: (workflowId: string, missionId: string) =>
        `/api/workflows/${workflowId}/missions/${missionId}/execute`,
};

// =============================================================================
// Workflow Mission Types
// =============================================================================

export interface WorkflowMissionSubTask {
    id: string;
    title: string;
    agent_type: string;
    agent_name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    input?: string;
    output?: string;
    started_at?: string;
    completed_at?: string;
    duration_ms?: number;
}

export interface WorkflowMission {
    id: string;
    workflow_id: string;
    user_id: string;
    leader_type: string;
    leader_name: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
    progress: {
        current: number;
        total: number;
    };
    sub_tasks: WorkflowMissionSubTask[];
    result?: string;
    created_at: string;
    updated_at: string;
    started_at?: string;
    completed_at?: string;
}

export interface MissionCreate {
    leader_type: string;
    leader_name: string;
    description: string;
    email?: string;
    sub_tasks: Array<{
        id: string;
        title: string;
        agent_type: string;
        agent_name: string;
        status?: string;
        input?: string;
    }>;
}

export interface MissionUpdate {
    status?: string;
    progress_current?: number;
    progress_total?: number;
    sub_tasks?: WorkflowMissionSubTask[];
    result?: string;
}
