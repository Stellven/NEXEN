'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { useEffect, useCallback } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { AIFloatingMenu } from './AIFloatingMenu';

interface TipTapEditorProps {
    content: string;
    projectId: string;
    onUpdate: (content: string, html: string) => void;
    placeholder?: string;
    editable?: boolean;
}

export function TipTapEditor({
    content,
    projectId,
    onUpdate,
    placeholder = '开始写作...',
    editable = true,
}: TipTapEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
                codeBlock: {
                    HTMLAttributes: {
                        class: 'bg-gray-100 rounded-lg p-4 font-mono text-sm',
                    },
                },
                blockquote: {
                    HTMLAttributes: {
                        class: 'border-l-4 border-gray-300 pl-4 italic',
                    },
                },
            }),
            Placeholder.configure({
                placeholder,
                emptyEditorClass: 'is-editor-empty',
            }),
            CharacterCount,
            Highlight.configure({ multicolor: true }),
            Typography,
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline hover:text-blue-800',
                },
            }),
        ],
        content,
        editable,
        editorProps: {
            attributes: {
                class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] px-8 py-6',
            },
        },
        onUpdate: ({ editor }) => {
            const text = editor.getText();
            const html = editor.getHTML();
            onUpdate(text, html);
        },
    });

    // Update content when prop changes (e.g., loading new project)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    // Update editable state
    useEffect(() => {
        if (editor) {
            editor.setEditable(editable);
        }
    }, [editor, editable]);

    // Get word count
    const wordCount = editor?.storage.characterCount?.words() ?? 0;
    const charCount = editor?.storage.characterCount?.characters() ?? 0;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Toolbar */}
            <EditorToolbar editor={editor} />

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto">
                <EditorContent editor={editor} />
            </div>

            {/* AI Floating Menu */}
            <AIFloatingMenu editor={editor} projectId={projectId} />

            {/* Status Bar */}
            <div className="border-t border-gray-200 px-4 py-2 text-sm text-gray-500 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-4">
                    <span>字数: {wordCount}</span>
                    <span>字符: {charCount}</span>
                </div>
                <div className="text-xs text-gray-400">
                    选中文本后可使用 AI 改写、翻译、润色功能
                </div>
            </div>
        </div>
    );
}
