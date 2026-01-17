'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { Edit3, Languages, Sparkles, Wand2, Loader2, X, ChevronRight } from 'lucide-react';
import { useWritingStore } from '@/lib/writingStore';
import { writingApi, AIWritingRequest } from '@/lib/api';

interface AIFloatingMenuProps {
    editor: Editor | null;
    projectId: string;
}

const LANGUAGES = [
    { code: 'en', name: '英语' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日语' },
    { code: 'ko', name: '韩语' },
    { code: 'fr', name: '法语' },
    { code: 'de', name: '德语' },
    { code: 'es', name: '西班牙语' },
    { code: 'ru', name: '俄语' },
];

export function AIFloatingMenu({ editor, projectId }: AIFloatingMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [showMenu, setShowMenu] = useState(false);
    const [showLanguageSelect, setShowLanguageSelect] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        selectedText,
        setSelectedText,
        selectionRange,
        setSelectionRange,
        isAIProcessing,
        setIsAIProcessing,
        aiStreamingContent,
        setAIStreamingContent,
        appendAIStreamingContent,
        clearAIStreamingContent,
    } = useWritingStore();

    // Update selection state when editor selection changes
    useEffect(() => {
        if (!editor) return;

        const updateSelection = () => {
            const { from, to } = editor.state.selection;
            const text = editor.state.doc.textBetween(from, to);

            if (text && text.trim().length > 0) {
                setSelectedText(text);
                setSelectionRange({ from, to });

                // Position menu below selection
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    setMenuPosition({
                        top: rect.bottom + window.scrollY + 8,
                        left: Math.max(rect.left + window.scrollX, 10),
                    });
                    setShowMenu(true);
                }
            } else {
                setSelectedText('');
                setSelectionRange(null);
                if (!isAIProcessing) {
                    setShowMenu(false);
                }
            }
        };

        editor.on('selectionUpdate', updateSelection);
        return () => {
            editor.off('selectionUpdate', updateSelection);
        };
    }, [editor, isAIProcessing, setSelectedText, setSelectionRange]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                if (!isAIProcessing) {
                    setShowMenu(false);
                    setShowLanguageSelect(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isAIProcessing]);

    const handleAIAction = useCallback(
        async (action: AIWritingRequest['action'], targetLanguage?: string) => {
            if (!editor || !projectId) return;

            setIsAIProcessing(true);
            clearAIStreamingContent();
            setError(null);

            try {
                // Get context around selection
                const { from, to } = selectionRange || { from: 0, to: 0 };
                const doc = editor.state.doc;
                const docSize = doc.content.size;

                const contextBefore = doc.textBetween(Math.max(0, from - 500), from);
                const contextAfter = doc.textBetween(to, Math.min(docSize, to + 500));

                let fullResponse = '';

                await writingApi.aiWriting(
                    projectId,
                    {
                        action,
                        selected_text: selectedText,
                        context_before: contextBefore,
                        context_after: contextAfter,
                        target_language: targetLanguage,
                    },
                    (chunk) => {
                        fullResponse += chunk;
                        appendAIStreamingContent(chunk);
                    },
                    (errorMsg) => {
                        setError(errorMsg);
                    }
                );

                // Insert the AI response
                if (fullResponse && selectionRange) {
                    editor
                        .chain()
                        .focus()
                        .setTextSelection(selectionRange)
                        .deleteSelection()
                        .insertContent(fullResponse)
                        .run();
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'AI 处理失败');
            } finally {
                setIsAIProcessing(false);
                setShowMenu(false);
                setShowLanguageSelect(false);
            }
        },
        [
            editor,
            projectId,
            selectedText,
            selectionRange,
            setIsAIProcessing,
            clearAIStreamingContent,
            appendAIStreamingContent,
        ]
    );

    const handleContinue = useCallback(async () => {
        if (!editor || !projectId) return;

        setIsAIProcessing(true);
        clearAIStreamingContent();
        setError(null);

        try {
            const { to } = editor.state.selection;
            const doc = editor.state.doc;
            const contextBefore = doc.textBetween(Math.max(0, to - 1000), to);

            let fullResponse = '';

            await writingApi.aiWriting(
                projectId,
                {
                    action: 'continue',
                    context_before: contextBefore,
                    cursor_position: to,
                },
                (chunk) => {
                    fullResponse += chunk;
                    appendAIStreamingContent(chunk);
                    // Insert content as it streams
                    editor.chain().focus().insertContent(chunk).run();
                },
                (errorMsg) => {
                    setError(errorMsg);
                }
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'AI 处理失败');
        } finally {
            setIsAIProcessing(false);
            setShowMenu(false);
        }
    }, [editor, projectId, setIsAIProcessing, clearAIStreamingContent, appendAIStreamingContent]);

    if (!showMenu && !isAIProcessing) return null;

    return (
        <div
            ref={menuRef}
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
            style={{ top: menuPosition.top, left: menuPosition.left }}
        >
            {error && (
                <div className="px-3 py-2 bg-red-50 text-red-600 text-sm border-b border-red-100">
                    {error}
                </div>
            )}

            {isAIProcessing ? (
                <div className="flex items-center gap-2 px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm text-gray-600">AI 处理中...</span>
                    <button
                        onClick={() => setIsAIProcessing(false)}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded"
                        title="取消"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ) : showLanguageSelect ? (
                <div className="p-2 min-w-[200px]">
                    <div className="text-xs text-gray-500 px-2 pb-2">选择目标语言</div>
                    <div className="space-y-1">
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleAIAction('translate', lang.name)}
                                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 flex items-center justify-between"
                            >
                                <span>{lang.name}</span>
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowLanguageSelect(false)}
                        className="mt-2 w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1"
                    >
                        返回
                    </button>
                </div>
            ) : (
                <div className="flex items-center p-1">
                    {!selectedText && (
                        <button
                            onClick={handleContinue}
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-100 text-gray-700"
                            title="AI 续写"
                        >
                            <Wand2 className="h-4 w-4 text-purple-500" />
                            <span>续写</span>
                        </button>
                    )}
                    {selectedText && (
                        <>
                            <button
                                onClick={() => handleAIAction('rewrite')}
                                className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-100 text-gray-700"
                                title="改写选中文本"
                            >
                                <Edit3 className="h-4 w-4 text-blue-500" />
                                <span>改写</span>
                            </button>
                            <button
                                onClick={() => setShowLanguageSelect(true)}
                                className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-100 text-gray-700"
                                title="翻译选中文本"
                            >
                                <Languages className="h-4 w-4 text-green-500" />
                                <span>翻译</span>
                            </button>
                            <button
                                onClick={() => handleAIAction('polish')}
                                className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-100 text-gray-700"
                                title="润色选中文本"
                            >
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                <span>润色</span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
