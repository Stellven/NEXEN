'use client';

import { Editor } from '@tiptap/react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Link,
    Undo,
    Redo,
    Code,
    Quote,
    Minus,
} from 'lucide-react';

interface EditorToolbarProps {
    editor: Editor | null;
}

interface ToolButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
}

function ToolButton({ onClick, isActive, disabled, icon: Icon, title }: ToolButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`p-2 rounded transition-colors ${
                isActive
                    ? 'bg-blue-100 text-blue-600'
                    : 'hover:bg-gray-100 text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={title}
            type="button"
        >
            <Icon className="h-4 w-4" />
        </button>
    );
}

function Divider() {
    return <div className="w-px h-6 bg-gray-300 mx-1" />;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
    if (!editor) {
        return null;
    }

    return (
        <div className="border-b border-gray-200 px-4 py-2 flex flex-wrap items-center gap-0.5 bg-gray-50">
            {/* History */}
            <ToolButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                icon={Undo}
                title="撤销 (Ctrl+Z)"
            />
            <ToolButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                icon={Redo}
                title="重做 (Ctrl+Shift+Z)"
            />

            <Divider />

            {/* Text Formatting */}
            <ToolButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                icon={Bold}
                title="粗体 (Ctrl+B)"
            />
            <ToolButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                icon={Italic}
                title="斜体 (Ctrl+I)"
            />
            <ToolButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                icon={Underline}
                title="下划线 (Ctrl+U)"
            />
            <ToolButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                icon={Strikethrough}
                title="删除线"
            />

            <Divider />

            {/* Headings */}
            <ToolButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                icon={Heading1}
                title="标题 1"
            />
            <ToolButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                icon={Heading2}
                title="标题 2"
            />
            <ToolButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                icon={Heading3}
                title="标题 3"
            />

            <Divider />

            {/* Lists */}
            <ToolButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                icon={List}
                title="无序列表"
            />
            <ToolButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                icon={ListOrdered}
                title="有序列表"
            />

            <Divider />

            {/* Alignment */}
            <ToolButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                isActive={editor.isActive({ textAlign: 'left' })}
                icon={AlignLeft}
                title="左对齐"
            />
            <ToolButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                isActive={editor.isActive({ textAlign: 'center' })}
                icon={AlignCenter}
                title="居中"
            />
            <ToolButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                isActive={editor.isActive({ textAlign: 'right' })}
                icon={AlignRight}
                title="右对齐"
            />

            <Divider />

            {/* Blocks */}
            <ToolButton
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                isActive={editor.isActive('codeBlock')}
                icon={Code}
                title="代码块"
            />
            <ToolButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                icon={Quote}
                title="引用"
            />
            <ToolButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                icon={Minus}
                title="分割线"
            />

            <Divider />

            {/* Link */}
            <ToolButton
                onClick={() => {
                    const url = window.prompt('输入链接地址:', 'https://');
                    if (url) {
                        editor.chain().focus().setLink({ href: url }).run();
                    }
                }}
                isActive={editor.isActive('link')}
                icon={Link}
                title="插入链接"
            />
        </div>
    );
}
