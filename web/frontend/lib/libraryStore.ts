/**
 * Zustand store for My Library module state management.
 */

import { create } from 'zustand';

// Types
export interface Folder {
    id: string;
    name: string;
    parentId: string | null;
    description?: string;
    color?: string;
    documentCount: number;
    children: Folder[];
}

export interface Document {
    id: string;
    name: string;
    fileType: string;
    fileSize: number;
    folderId: string | null;
    sourceUrl?: string;
    parseStatus: 'pending' | 'parsing' | 'completed' | 'failed';
    embeddingStatus: 'pending' | 'processing' | 'completed' | 'failed';
    chunkCount: number;
    tags: string[];
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface UploadProgress {
    fileName: string;
    progress: number;
    status: 'uploading' | 'processing' | 'completed' | 'error';
    error?: string;
    documentId?: string;
}

export interface Tag {
    name: string;
    count: number;
}

interface LibraryState {
    // Folders
    folders: Folder[];
    currentFolderId: string | null;
    setFolders: (folders: Folder[]) => void;
    setCurrentFolder: (id: string | null) => void;
    addFolder: (folder: Folder) => void;
    updateFolder: (id: string, updates: Partial<Folder>) => void;
    removeFolder: (id: string) => void;

    // Documents
    documents: Document[];
    selectedDocumentId: string | null;
    totalDocuments: number;
    currentPage: number;
    pageSize: number;
    setDocuments: (documents: Document[], total: number) => void;
    selectDocument: (id: string | null) => void;
    addDocument: (document: Document) => void;
    updateDocument: (id: string, updates: Partial<Document>) => void;
    removeDocument: (id: string) => void;
    setPage: (page: number) => void;

    // View
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;

    // Filters
    searchQuery: string;
    tagFilter: string[];
    setSearchQuery: (query: string) => void;
    setTagFilter: (tags: string[]) => void;
    clearFilters: () => void;

    // Tags
    allTags: Tag[];
    setAllTags: (tags: Tag[]) => void;

    // Uploads
    uploadingFiles: Map<string, UploadProgress>;
    setUploadProgress: (fileId: string, progress: UploadProgress) => void;
    clearUpload: (fileId: string) => void;
    clearAllUploads: () => void;

    // UI State
    isLoading: boolean;
    error: string | null;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Dialogs
    showUploadDialog: boolean;
    showImportUrlDialog: boolean;
    showCreateFolderDialog: boolean;
    editingFolderId: string | null;
    setShowUploadDialog: (show: boolean) => void;
    setShowImportUrlDialog: (show: boolean) => void;
    setShowCreateFolderDialog: (show: boolean) => void;
    setEditingFolderId: (id: string | null) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
    // Folders
    folders: [],
    currentFolderId: null,
    setFolders: (folders) => set({ folders }),
    setCurrentFolder: (id) => set({ currentFolderId: id, currentPage: 1 }),
    addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),
    updateFolder: (id, updates) =>
        set((state) => ({
            folders: state.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        })),
    removeFolder: (id) =>
        set((state) => ({
            folders: state.folders.filter((f) => f.id !== id),
            currentFolderId: state.currentFolderId === id ? null : state.currentFolderId,
        })),

    // Documents
    documents: [],
    selectedDocumentId: null,
    totalDocuments: 0,
    currentPage: 1,
    pageSize: 20,
    setDocuments: (documents, total) => set({ documents, totalDocuments: total }),
    selectDocument: (id) => set({ selectedDocumentId: id }),
    addDocument: (document) =>
        set((state) => ({
            documents: [document, ...state.documents],
            totalDocuments: state.totalDocuments + 1,
        })),
    updateDocument: (id, updates) =>
        set((state) => ({
            documents: state.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),
    removeDocument: (id) =>
        set((state) => ({
            documents: state.documents.filter((d) => d.id !== id),
            totalDocuments: state.totalDocuments - 1,
            selectedDocumentId: state.selectedDocumentId === id ? null : state.selectedDocumentId,
        })),
    setPage: (page) => set({ currentPage: page }),

    // View
    viewMode: 'grid',
    setViewMode: (mode) => set({ viewMode: mode }),

    // Filters
    searchQuery: '',
    tagFilter: [],
    setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
    setTagFilter: (tags) => set({ tagFilter: tags, currentPage: 1 }),
    clearFilters: () => set({ searchQuery: '', tagFilter: [], currentPage: 1 }),

    // Tags
    allTags: [],
    setAllTags: (tags) => set({ allTags: tags }),

    // Uploads
    uploadingFiles: new Map(),
    setUploadProgress: (fileId, progress) =>
        set((state) => {
            const newMap = new Map(state.uploadingFiles);
            newMap.set(fileId, progress);
            return { uploadingFiles: newMap };
        }),
    clearUpload: (fileId) =>
        set((state) => {
            const newMap = new Map(state.uploadingFiles);
            newMap.delete(fileId);
            return { uploadingFiles: newMap };
        }),
    clearAllUploads: () => set({ uploadingFiles: new Map() }),

    // UI State
    isLoading: false,
    error: null,
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),

    // Dialogs
    showUploadDialog: false,
    showImportUrlDialog: false,
    showCreateFolderDialog: false,
    editingFolderId: null,
    setShowUploadDialog: (show) => set({ showUploadDialog: show }),
    setShowImportUrlDialog: (show) => set({ showImportUrlDialog: show }),
    setShowCreateFolderDialog: (show) => set({ showCreateFolderDialog: show }),
    setEditingFolderId: (id) => set({ editingFolderId: id }),
}));

// Selector helpers
export const selectFolderById = (id: string | null) => (state: LibraryState) =>
    id ? state.folders.find((f) => f.id === id) : null;

export const selectDocumentById = (id: string | null) => (state: LibraryState) =>
    id ? state.documents.find((d) => d.id === id) : null;

export const selectCurrentFolder = (state: LibraryState) =>
    state.currentFolderId ? state.folders.find((f) => f.id === state.currentFolderId) : null;

export const selectSelectedDocument = (state: LibraryState) =>
    state.selectedDocumentId ? state.documents.find((d) => d.id === state.selectedDocumentId) : null;

export const selectHasActiveUploads = (state: LibraryState) => state.uploadingFiles.size > 0;

export const selectCompletedUploadsCount = (state: LibraryState) =>
    Array.from(state.uploadingFiles.values()).filter((u) => u.status === 'completed').length;
