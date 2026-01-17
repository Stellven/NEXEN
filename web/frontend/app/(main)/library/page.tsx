'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Folder,
    FileText,
    Upload,
    Link as LinkIcon,
    Plus,
    MoreVertical,
    Grid,
    List,
    Search,
    X,
    ChevronRight,
    ChevronDown,
    Loader2,
    CheckCircle,
    AlertCircle,
    Trash2,
    Edit2,
    FolderOpen,
    ExternalLink,
    RefreshCw,
    File,
    FileType,
    Globe,
} from 'lucide-react';
import { libraryApi, LibraryDocument, LibraryFolder } from '@/lib/api';
import { useLibraryStore, Document, Folder as FolderType } from '@/lib/libraryStore';

// File type icons
const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
        case 'pdf':
            return <FileText className="h-6 w-6 text-red-500" />;
        case 'docx':
            return <FileText className="h-6 w-6 text-blue-500" />;
        case 'md':
        case 'markdown':
            return <FileType className="h-6 w-6 text-gray-600" />;
        case 'txt':
            return <File className="h-6 w-6 text-gray-500" />;
        case 'url':
            return <Globe className="h-6 w-6 text-green-500" />;
        default:
            return <FileText className="h-6 w-6 text-gray-400" />;
    }
};

// Status badge component
function StatusBadge({ parseStatus, embeddingStatus }: { parseStatus: string; embeddingStatus: string }) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'text-green-500';
            case 'pending':
                return 'text-gray-400';
            case 'parsing':
            case 'processing':
                return 'text-blue-500';
            case 'failed':
                return 'text-red-500';
            default:
                return 'text-gray-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-3.5 w-3.5" />;
            case 'pending':
                return <div className="h-3.5 w-3.5 rounded-full border-2 border-current" />;
            case 'parsing':
            case 'processing':
                return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
            case 'failed':
                return <AlertCircle className="h-3.5 w-3.5" />;
            default:
                return null;
        }
    };

    const isProcessing = parseStatus === 'parsing' || embeddingStatus === 'processing';
    const isFailed = parseStatus === 'failed' || embeddingStatus === 'failed';
    const isCompleted = parseStatus === 'completed' && embeddingStatus === 'completed';

    if (isCompleted) {
        return (
            <span className="flex items-center gap-1 text-xs text-green-500">
                <CheckCircle className="h-3.5 w-3.5" />
            </span>
        );
    }

    if (isFailed) {
        return (
            <span className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5" />
            </span>
        );
    }

    if (isProcessing) {
        return (
            <span className="flex items-center gap-1 text-xs text-blue-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </span>
        );
    }

    return (
        <div className="flex items-center gap-2 text-xs">
            <span className={`flex items-center gap-0.5 ${getStatusColor(parseStatus)}`}>
                {getStatusIcon(parseStatus)}
            </span>
            <span className={`flex items-center gap-0.5 ${getStatusColor(embeddingStatus)}`}>
                {getStatusIcon(embeddingStatus)}
            </span>
        </div>
    );
}

// Folder tree item component
function FolderTreeItem({
    folder,
    level,
    currentFolderId,
    onSelect,
    onDelete,
}: {
    folder: LibraryFolder;
    level: number;
    currentFolderId: string | null;
    onSelect: (id: string | null) => void;
    onDelete: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = folder.children && folder.children.length > 0;
    const isSelected = currentFolderId === folder.id;

    return (
        <div>
            <div
                className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                }`}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={() => onSelect(folder.id)}
            >
                {hasChildren ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(!expanded);
                        }}
                        className="p-0.5 hover:bg-gray-200 rounded"
                    >
                        {expanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                        )}
                    </button>
                ) : (
                    <span className="w-4" />
                )}
                <Folder className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate text-sm">{folder.name}</span>
                <span className="text-xs text-gray-400">{folder.document_count}</span>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(folder.id);
                    }}
                    className="hidden group-hover:block p-1 hover:bg-gray-200 rounded"
                >
                    <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                </button>
            </div>
            {expanded && hasChildren && (
                <div>
                    {folder.children.map((child) => (
                        <FolderTreeItem
                            key={child.id}
                            folder={child}
                            level={level + 1}
                            currentFolderId={currentFolderId}
                            onSelect={onSelect}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Create folder dialog
function CreateFolderDialog({
    isOpen,
    onClose,
    onCreate,
    parentId,
}: {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, parentId: string | null) => Promise<void>;
    parentId: string | null;
}) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await onCreate(name.trim(), parentId);
            setName('');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h3 className="mb-4 text-lg font-semibold">New Folder</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Folder name"
                        className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                        autoFocus
                    />
                    <div className="mt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || loading}
                            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Import URL dialog
function ImportUrlDialog({
    isOpen,
    onClose,
    onImport,
    folderId,
}: {
    isOpen: boolean;
    onClose: () => void;
    onImport: (url: string, folderId: string | null) => Promise<void>;
    folderId: string | null;
}) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        setLoading(true);
        try {
            await onImport(url.trim(), folderId);
            setUrl('');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <h3 className="mb-4 text-lg font-semibold">Import from URL</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/article"
                        className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                        autoFocus
                    />
                    <p className="mt-2 text-xs text-gray-500">
                        Enter a URL to import. The content will be extracted and indexed for search.
                    </p>
                    <div className="mt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!url.trim() || loading}
                            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                        >
                            {loading ? 'Importing...' : 'Import'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Document detail panel
function DocumentDetailPanel({
    document,
    onClose,
    onDelete,
}: {
    document: LibraryDocument;
    onClose: () => void;
    onDelete: (id: string) => void;
}) {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (document.parse_status === 'completed') {
            setLoading(true);
            libraryApi
                .getDocumentContent(document.id)
                .then((data) => setContent(data.content))
                .catch(() => setContent(null))
                .finally(() => setLoading(false));
        }
    }, [document.id, document.parse_status]);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed inset-y-0 right-0 z-40 w-96 border-l border-gray-200 bg-white shadow-xl">
            <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <h3 className="font-semibold text-gray-900">Document Details</h3>
                    <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="mb-4 flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50">
                            {getFileTypeIcon(document.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{document.name}</h4>
                            <p className="text-sm text-gray-500">
                                {document.file_type.toUpperCase()} · {formatFileSize(document.file_size)}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500">Status</label>
                            <div className="mt-1 flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">Parse:</span>
                                    <StatusBadge parseStatus={document.parse_status} embeddingStatus="pending" />
                                    <span className="text-xs text-gray-600">{document.parse_status}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">Index:</span>
                                    <StatusBadge parseStatus="completed" embeddingStatus={document.embedding_status} />
                                    <span className="text-xs text-gray-600">{document.embedding_status}</span>
                                </div>
                            </div>
                        </div>

                        {document.chunk_count > 0 && (
                            <div>
                                <label className="text-xs font-medium text-gray-500">Chunks</label>
                                <p className="mt-1 text-sm">{document.chunk_count} chunks indexed</p>
                            </div>
                        )}

                        {document.tags && document.tags.length > 0 && (
                            <div>
                                <label className="text-xs font-medium text-gray-500">Tags</label>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {document.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {document.source_url && (
                            <div>
                                <label className="text-xs font-medium text-gray-500">Source URL</label>
                                <a
                                    href={document.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 flex items-center gap-1 text-sm text-blue-500 hover:underline truncate"
                                >
                                    {document.source_url}
                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </a>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-medium text-gray-500">Created</label>
                            <p className="mt-1 text-sm">
                                {new Date(document.created_at).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {document.parse_status === 'completed' && (
                        <div className="mt-6">
                            <label className="text-xs font-medium text-gray-500">Content Preview</label>
                            {loading ? (
                                <div className="mt-2 flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                </div>
                            ) : content ? (
                                <div className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                                    {content.slice(0, 2000)}
                                    {content.length > 2000 && '...'}
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-gray-400">No content available</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-200 p-4">
                    <button
                        onClick={() => onDelete(document.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete Document
                    </button>
                </div>
            </div>
        </div>
    );
}

// Main library page component
export default function LibraryPage() {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [folders, setFolders] = useState<LibraryFolder[]>([]);
    const [documents, setDocuments] = useState<LibraryDocument[]>([]);
    const [totalDocuments, setTotalDocuments] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
    const [showImportUrlDialog, setShowImportUrlDialog] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const pageSize = 20;

    // Load folders
    const loadFolders = useCallback(async () => {
        try {
            const data = await libraryApi.getFolders();
            setFolders(data);
        } catch (err) {
            console.error('Failed to load folders:', err);
        }
    }, []);

    // Load documents
    const loadDocuments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await libraryApi.getDocuments({
                folder_id: currentFolderId || undefined,
                page: currentPage,
                page_size: pageSize,
                search: searchQuery || undefined,
            });
            setDocuments(data.documents);
            setTotalDocuments(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load documents');
        } finally {
            setIsLoading(false);
        }
    }, [currentFolderId, currentPage, searchQuery]);

    // Initial load
    useEffect(() => {
        loadFolders();
    }, [loadFolders]);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    // Poll for processing status
    useEffect(() => {
        const processingDocs = documents.filter(
            (doc) =>
                doc.parse_status === 'pending' ||
                doc.parse_status === 'parsing' ||
                doc.embedding_status === 'pending' ||
                doc.embedding_status === 'processing'
        );

        if (processingDocs.length === 0) return;

        const interval = setInterval(async () => {
            for (const doc of processingDocs) {
                try {
                    const status = await libraryApi.getDocumentStatus(doc.id);
                    setDocuments((prev) =>
                        prev.map((d) =>
                            d.id === doc.id
                                ? {
                                      ...d,
                                      parse_status: status.parse_status,
                                      embedding_status: status.embedding_status,
                                      chunk_count: status.chunk_count,
                                  }
                                : d
                        )
                    );
                } catch (err) {
                    console.error('Failed to get status:', err);
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [documents]);

    // Handle file upload
    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        for (const file of Array.from(files)) {
            try {
                const doc = await libraryApi.uploadDocument(file, currentFolderId || undefined);
                setDocuments((prev) => [doc, ...prev]);
                setTotalDocuments((prev) => prev + 1);
            } catch (err) {
                console.error('Failed to upload:', err);
                setError(err instanceof Error ? err.message : 'Failed to upload file');
            }
        }

        loadFolders(); // Refresh folder counts
    };

    // Handle folder creation
    const handleCreateFolder = async (name: string, parentId: string | null) => {
        await libraryApi.createFolder({ name, parent_id: parentId || undefined });
        loadFolders();
    };

    // Handle folder deletion
    const handleDeleteFolder = async (id: string) => {
        if (!confirm('Are you sure you want to delete this folder? Documents will be moved to root.')) {
            return;
        }
        await libraryApi.deleteFolder(id);
        if (currentFolderId === id) {
            setCurrentFolderId(null);
        }
        loadFolders();
        loadDocuments();
    };

    // Handle URL import
    const handleImportUrl = async (url: string, folderId: string | null) => {
        const doc = await libraryApi.importUrl(url, folderId || undefined);
        setDocuments((prev) => [doc, ...prev]);
        setTotalDocuments((prev) => prev + 1);
        loadFolders();
    };

    // Handle document deletion
    const handleDeleteDocument = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }
        await libraryApi.deleteDocument(id);
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        setTotalDocuments((prev) => prev - 1);
        setSelectedDocumentId(null);
        loadFolders();
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileUpload(e.dataTransfer.files);
    };

    const selectedDocument = documents.find((d) => d.id === selectedDocumentId);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div
            className="flex h-full"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Sidebar - Folder Tree */}
            <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                <div className="p-4">
                    <button
                        onClick={() => setCurrentFolderId(null)}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                            currentFolderId === null
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <FolderOpen className="h-4 w-4" />
                        All Documents
                    </button>
                </div>

                <div className="px-4">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Folders</span>
                        <button
                            onClick={() => setShowCreateFolderDialog(true)}
                            className="rounded p-1 hover:bg-gray-200"
                        >
                            <Plus className="h-4 w-4 text-gray-500" />
                        </button>
                    </div>

                    <div className="space-y-0.5">
                        {folders.map((folder) => (
                            <FolderTreeItem
                                key={folder.id}
                                folder={folder}
                                level={0}
                                currentFolderId={currentFolderId}
                                onSelect={setCurrentFolderId}
                                onDelete={handleDeleteFolder}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Header */}
                <div className="border-b border-gray-200 bg-white px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">My Library</h1>
                            <p className="text-sm text-gray-500">
                                {totalDocuments} documents
                                {currentFolderId && ` in folder`}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search documents..."
                                    className="w-64 rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            {/* View toggle */}
                            <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                                >
                                    <Grid className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                                >
                                    <List className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Actions */}
                            <button
                                onClick={() => setShowImportUrlDialog(true)}
                                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                            >
                                <LinkIcon className="h-4 w-4" />
                                Import URL
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
                            >
                                <Upload className="h-4 w-4" />
                                Upload
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.docx,.md,.txt"
                                onChange={(e) => handleFileUpload(e.target.files)}
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Drag overlay */}
                    {isDragging && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-50/90">
                            <div className="text-center">
                                <Upload className="mx-auto h-12 w-12 text-blue-500" />
                                <p className="mt-2 text-lg font-medium text-blue-600">
                                    Drop files here to upload
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-red-700">
                            <AlertCircle className="h-5 w-5" />
                            <span>{error}</span>
                            <button onClick={() => setError(null)} className="ml-auto">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Loading */}
                    {isLoading && documents.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : documents.length === 0 ? (
                        /* Empty state */
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                                <FileText className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No documents yet</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Upload files or import URLs to get started
                            </p>
                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                                >
                                    <Upload className="h-4 w-4" />
                                    Upload Files
                                </button>
                                <button
                                    onClick={() => setShowImportUrlDialog(true)}
                                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
                                >
                                    <LinkIcon className="h-4 w-4" />
                                    Import URL
                                </button>
                            </div>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* Grid view */
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    onClick={() => setSelectedDocumentId(doc.id)}
                                    className={`cursor-pointer rounded-xl border bg-white p-4 transition-all hover:shadow-md ${
                                        selectedDocumentId === doc.id
                                            ? 'border-blue-500 ring-2 ring-blue-100'
                                            : 'border-gray-200 hover:border-blue-200'
                                    }`}
                                >
                                    <div className="mb-3 flex items-start justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                                            {getFileTypeIcon(doc.file_type)}
                                        </div>
                                        <StatusBadge
                                            parseStatus={doc.parse_status}
                                            embeddingStatus={doc.embedding_status}
                                        />
                                    </div>
                                    <h3 className="mb-1 truncate text-sm font-medium text-gray-900">
                                        {doc.name}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {formatFileSize(doc.file_size)} ·{' '}
                                        {new Date(doc.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* List view */
                        <div className="rounded-xl border border-gray-200 bg-white">
                            {documents.map((doc, index) => (
                                <div
                                    key={doc.id}
                                    onClick={() => setSelectedDocumentId(doc.id)}
                                    className={`flex cursor-pointer items-center gap-4 p-4 hover:bg-gray-50 ${
                                        index !== documents.length - 1 ? 'border-b border-gray-100' : ''
                                    } ${selectedDocumentId === doc.id ? 'bg-blue-50' : ''}`}
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                                        {getFileTypeIcon(doc.file_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-900 truncate">{doc.name}</h3>
                                        <p className="text-xs text-gray-500">
                                            {formatFileSize(doc.file_size)} · Updated{' '}
                                            {new Date(doc.updated_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        parseStatus={doc.parse_status}
                                        embeddingStatus={doc.embedding_status}
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDocument(doc.id);
                                        }}
                                        className="rounded p-1 hover:bg-gray-100"
                                    >
                                        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalDocuments > pageSize && (
                        <div className="mt-6 flex items-center justify-center gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-600">
                                Page {currentPage} of {Math.ceil(totalDocuments / pageSize)}
                            </span>
                            <button
                                onClick={() =>
                                    setCurrentPage((p) =>
                                        Math.min(Math.ceil(totalDocuments / pageSize), p + 1)
                                    )
                                }
                                disabled={currentPage >= Math.ceil(totalDocuments / pageSize)}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Document detail panel */}
            {selectedDocument && (
                <DocumentDetailPanel
                    document={selectedDocument}
                    onClose={() => setSelectedDocumentId(null)}
                    onDelete={handleDeleteDocument}
                />
            )}

            {/* Dialogs */}
            <CreateFolderDialog
                isOpen={showCreateFolderDialog}
                onClose={() => setShowCreateFolderDialog(false)}
                onCreate={handleCreateFolder}
                parentId={currentFolderId}
            />

            <ImportUrlDialog
                isOpen={showImportUrlDialog}
                onClose={() => setShowImportUrlDialog(false)}
                onImport={handleImportUrl}
                folderId={currentFolderId}
            />
        </div>
    );
}
