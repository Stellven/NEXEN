'use client';

import { useState, useCallback } from 'react';
import {
    Sparkles,
    ChevronDown,
    ChevronUp,
    Trash2,
    Loader2,
    Check,
    GripVertical,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SectionEditorProps {
    id: string;
    title: string;
    content: string;
    order: number;
    isGenerating?: boolean;
    streamingContent?: string;
    onTitleChange: (title: string) => void;
    onContentChange: (content: string) => void;
    onGenerate: () => void;
    onDelete: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    isFirst?: boolean;
    isLast?: boolean;
}

export function SectionEditor({
    id,
    title,
    content,
    order,
    isGenerating = false,
    streamingContent = '',
    onTitleChange,
    onContentChange,
    onGenerate,
    onDelete,
    onMoveUp,
    onMoveDown,
    isFirst = false,
    isLast = false,
}: SectionEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [localContent, setLocalContent] = useState(content);

    const handleSave = useCallback(() => {
        onContentChange(localContent);
        setIsEditing(false);
    }, [localContent, onContentChange]);

    const handleCancel = useCallback(() => {
        setLocalContent(content);
        setIsEditing(false);
    }, [content]);

    const displayContent = isGenerating ? streamingContent : content;

    return (
        <div className="group rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-sm">
            {/* Section Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-3">
                    <button className="cursor-grab text-gray-300 hover:text-gray-400">
                        <GripVertical className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-medium text-gray-400">
                        {order + 1}
                    </span>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        className="border-none bg-transparent font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
                        placeholder="章节标题"
                    />
                </div>

                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {/* AI Generate */}
                    <button
                        onClick={onGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 disabled:opacity-50"
                        title="AI 生成"
                    >
                        {isGenerating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Sparkles className="h-3 w-3" />
                        )}
                        生成
                    </button>

                    {/* Move Up/Down */}
                    {!isFirst && (
                        <button
                            onClick={onMoveUp}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="上移"
                        >
                            <ChevronUp className="h-4 w-4" />
                        </button>
                    )}
                    {!isLast && (
                        <button
                            onClick={onMoveDown}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="下移"
                        >
                            <ChevronDown className="h-4 w-4" />
                        </button>
                    )}

                    {/* Delete */}
                    <button
                        onClick={onDelete}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        title="删除"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>

                    {/* Collapse */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title={isCollapsed ? '展开' : '收起'}
                    >
                        {isCollapsed ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronUp className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Section Content */}
            {!isCollapsed && (
                <div className="p-4">
                    {isEditing ? (
                        <div className="space-y-3">
                            <textarea
                                value={localContent}
                                onChange={(e) => setLocalContent(e.target.value)}
                                className="min-h-[200px] w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="使用 Markdown 编写内容..."
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={handleCancel}
                                    className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
                                >
                                    <Check className="h-3 w-3" />
                                    保存
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => setIsEditing(true)}
                            className="cursor-text rounded-lg p-2 transition-colors hover:bg-gray-50"
                        >
                            {displayContent ? (
                                <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {displayContent}
                                    </ReactMarkdown>
                                    {isGenerating && (
                                        <span className="inline-block h-4 w-1 animate-pulse bg-blue-500" />
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm italic text-gray-400">
                                    点击编辑内容，或点击"生成"让 AI 帮你写...
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
