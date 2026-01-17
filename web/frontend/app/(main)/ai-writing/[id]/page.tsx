'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Download, BookOpen, Loader2, Check, MoreVertical } from 'lucide-react';
import { TipTapEditor } from '@/components/writing/TipTapEditor';
import { writingApi } from '@/lib/api';
import { useWritingStore } from '@/lib/writingStore';
import { useDebounce } from '@/hooks/useDebounce';

export default function WritingEditorPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const {
        currentProject,
        setCurrentProject,
        isEditorDirty,
        setIsEditorDirty,
        lastSavedAt,
        setLastSavedAt,
        isSaving,
        setIsSaving,
    } = useWritingStore();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [content, setContent] = useState('');
    const [contentHtml, setContentHtml] = useState('');
    const [title, setTitle] = useState('');
    const [showSaveToLibrary, setShowSaveToLibrary] = useState(false);
    const [savingToLibrary, setSavingToLibrary] = useState(false);

    // Debounced content for auto-save
    const debouncedContent = useDebounce(content, 2000);
    const debouncedContentHtml = useDebounce(contentHtml, 2000);
    const debouncedTitle = useDebounce(title, 2000);

    // Load project
    useEffect(() => {
        const loadProject = async () => {
            try {
                setLoading(true);
                setError(null);
                const project = await writingApi.getProject(projectId);
                setCurrentProject(project);
                setContent(project.content || '');
                setContentHtml(project.content_html || '');
                setTitle(project.title);
            } catch (err) {
                console.error('Failed to load project:', err);
                setError('加载文档失败');
            } finally {
                setLoading(false);
            }
        };
        loadProject();

        return () => {
            setCurrentProject(null);
            setIsEditorDirty(false);
        };
    }, [projectId, setCurrentProject, setIsEditorDirty]);

    // Auto-save when debounced content changes
    useEffect(() => {
        if (isEditorDirty && currentProject && !loading) {
            saveProject();
        }
    }, [debouncedContent, debouncedContentHtml, debouncedTitle]);

    const saveProject = useCallback(async () => {
        if (!currentProject || isSaving) return;

        setIsSaving(true);
        try {
            await writingApi.updateProject(currentProject.id, {
                title,
                content,
                content_html: contentHtml,
            });
            setIsEditorDirty(false);
            setLastSavedAt(new Date());
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setIsSaving(false);
        }
    }, [currentProject, title, content, contentHtml, isSaving, setIsSaving, setIsEditorDirty, setLastSavedAt]);

    const handleContentUpdate = useCallback(
        (newContent: string, newHtml: string) => {
            setContent(newContent);
            setContentHtml(newHtml);
            setIsEditorDirty(true);
        },
        [setIsEditorDirty]
    );

    const handleTitleChange = useCallback(
        (newTitle: string) => {
            setTitle(newTitle);
            setIsEditorDirty(true);
        },
        [setIsEditorDirty]
    );

    const handleSaveToLibrary = async () => {
        if (!currentProject) return;

        setSavingToLibrary(true);
        try {
            const result = await writingApi.saveToLibrary(currentProject.id);
            alert(`已保存到文库: ${result.title}`);
            setShowSaveToLibrary(false);
        } catch (err) {
            console.error('Failed to save to library:', err);
            alert('保存到文库失败');
        } finally {
            setSavingToLibrary(false);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full flex-col items-center justify-center">
                <p className="text-red-500">{error}</p>
                <button
                    onClick={() => router.push('/ai-writing')}
                    className="mt-4 text-blue-500 hover:underline"
                >
                    返回文档列表
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-hidden bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/ai-writing')}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        title="返回"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="border-none bg-transparent text-lg font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
                        placeholder="文档标题"
                    />
                </div>

                <div className="flex items-center gap-3">
                    {/* Save status */}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>保存中...</span>
                            </>
                        ) : lastSavedAt ? (
                            <>
                                <Check className="h-4 w-4 text-green-500" />
                                <span>已保存 {formatTime(lastSavedAt)}</span>
                            </>
                        ) : isEditorDirty ? (
                            <span className="text-amber-500">未保存</span>
                        ) : null}
                    </div>

                    {/* Save button */}
                    <button
                        onClick={saveProject}
                        disabled={!isEditorDirty || isSaving}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        保存
                    </button>

                    {/* Save to Library */}
                    <button
                        onClick={() => setShowSaveToLibrary(true)}
                        className="flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                    >
                        <BookOpen className="h-4 w-4" />
                        保存到文库
                    </button>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
                <TipTapEditor
                    content={contentHtml || content}
                    projectId={projectId}
                    onUpdate={handleContentUpdate}
                    placeholder="开始写作..."
                />
            </div>

            {/* Save to Library Modal */}
            {showSaveToLibrary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900">保存到文库</h2>
                        <p className="mb-4 text-sm text-gray-600">
                            将此文档保存到我的文库，以便在 AI Explore 中搜索和引用。
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowSaveToLibrary(false)}
                                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSaveToLibrary}
                                disabled={savingToLibrary}
                                className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                            >
                                {savingToLibrary ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <BookOpen className="h-4 w-4" />
                                )}
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
