import { create } from 'zustand';

// =============================================================================
// Types
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

export interface WritingTemplate {
    id: string;
    name: string;
    name_cn: string;
    description: string;
    initial_content: string;
    icon: string;
}

// =============================================================================
// Store Interface
// =============================================================================

interface WritingState {
    // Projects list
    projects: WritingProject[];
    setProjects: (projects: WritingProject[]) => void;
    addProject: (project: WritingProject) => void;
    updateProjectInList: (project: WritingProject) => void;
    removeProject: (id: string) => void;

    // Current project
    currentProject: WritingProject | null;
    setCurrentProject: (project: WritingProject | null) => void;

    // Templates
    templates: WritingTemplate[];
    setTemplates: (templates: WritingTemplate[]) => void;

    // Editor state
    isEditorDirty: boolean;
    setIsEditorDirty: (dirty: boolean) => void;

    // AI state
    isAIProcessing: boolean;
    setIsAIProcessing: (processing: boolean) => void;
    aiStreamingContent: string;
    setAIStreamingContent: (content: string) => void;
    appendAIStreamingContent: (chunk: string) => void;
    clearAIStreamingContent: () => void;

    // Selection state for AI actions
    selectedText: string;
    setSelectedText: (text: string) => void;
    selectionRange: { from: number; to: number } | null;
    setSelectionRange: (range: { from: number; to: number } | null) => void;

    // Auto-save state
    lastSavedAt: Date | null;
    setLastSavedAt: (date: Date | null) => void;
    isSaving: boolean;
    setIsSaving: (saving: boolean) => void;

    // UI state
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    error: string | null;
    setError: (error: string | null) => void;

    // Dialogs
    showNewProjectDialog: boolean;
    setShowNewProjectDialog: (show: boolean) => void;
    showTemplateSelector: boolean;
    setShowTemplateSelector: (show: boolean) => void;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useWritingStore = create<WritingState>((set) => ({
    // Projects
    projects: [],
    setProjects: (projects) => set({ projects }),
    addProject: (project) =>
        set((state) => ({ projects: [project, ...state.projects] })),
    updateProjectInList: (project) =>
        set((state) => ({
            projects: state.projects.map((p) =>
                p.id === project.id ? project : p
            ),
        })),
    removeProject: (id) =>
        set((state) => ({
            projects: state.projects.filter((p) => p.id !== id),
        })),

    // Current project
    currentProject: null,
    setCurrentProject: (project) => set({ currentProject: project }),

    // Templates
    templates: [],
    setTemplates: (templates) => set({ templates }),

    // Editor state
    isEditorDirty: false,
    setIsEditorDirty: (dirty) => set({ isEditorDirty: dirty }),

    // AI state
    isAIProcessing: false,
    setIsAIProcessing: (processing) => set({ isAIProcessing: processing }),
    aiStreamingContent: '',
    setAIStreamingContent: (content) => set({ aiStreamingContent: content }),
    appendAIStreamingContent: (chunk) =>
        set((state) => ({
            aiStreamingContent: state.aiStreamingContent + chunk,
        })),
    clearAIStreamingContent: () => set({ aiStreamingContent: '' }),

    // Selection state
    selectedText: '',
    setSelectedText: (text) => set({ selectedText: text }),
    selectionRange: null,
    setSelectionRange: (range) => set({ selectionRange: range }),

    // Auto-save state
    lastSavedAt: null,
    setLastSavedAt: (date) => set({ lastSavedAt: date }),
    isSaving: false,
    setIsSaving: (saving) => set({ isSaving: saving }),

    // UI state
    isLoading: false,
    setIsLoading: (loading) => set({ isLoading: loading }),
    error: null,
    setError: (error) => set({ error }),

    // Dialogs
    showNewProjectDialog: false,
    setShowNewProjectDialog: (show) => set({ showNewProjectDialog: show }),
    showTemplateSelector: false,
    setShowTemplateSelector: (show) => set({ showTemplateSelector: show }),
}));

// =============================================================================
// Selectors
// =============================================================================

export const selectProjectById = (id: string) => (state: WritingState) =>
    state.projects.find((p) => p.id === id);

export const selectDraftProjects = (state: WritingState) =>
    state.projects.filter((p) => p.status === 'draft');

export const selectCompletedProjects = (state: WritingState) =>
    state.projects.filter((p) => p.status === 'completed');

export const selectHasUnsavedChanges = (state: WritingState) =>
    state.isEditorDirty && !state.isSaving;
