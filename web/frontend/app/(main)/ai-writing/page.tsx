'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText,
    Plus,
    Edit3,
    Sparkles,
    Languages,
    Wand2,
    Trash2,
    Calendar,
    FileCode,
    Users,
    Mail,
    Loader2,
    Clock,
    Search,
} from 'lucide-react';
import { writingApi, WritingProject, WritingTemplate } from '@/lib/api';
import { useWritingStore } from '@/lib/writingStore';

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    calendar: Calendar,
    code: FileCode,
    'file-text': FileText,
    users: Users,
    mail: Mail,
};

export default function AIWritingPage() {
    const router = useRouter();
    const { projects, setProjects, templates, setTemplates } = useWritingStore();
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [projectsRes, templatesRes] = await Promise.all([
                writingApi.getProjects(),
                writingApi.getTemplates(),
            ]);
            setProjects(projectsRes.projects);
            setTemplates(templatesRes.templates);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (templateId?: string) => {
        try {
            setCreating(true);
            const template = templates.find((t) => t.id === templateId);
            const project = await writingApi.createProject({
                title: template ? template.name_cn : '新建文档',
                template_type: templateId,
            });
            router.push(`/ai-writing/${project.id}`);
        } catch (error) {
            console.error('Failed to create project:', error);
        } finally {
            setCreating(false);
            setShowTemplateModal(false);
        }
    };

    const handleDeleteProject = async (id: string) => {
        try {
            await writingApi.deleteProject(id);
            setProjects(projects.filter((p) => p.id !== id));
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Failed to delete project:', error);
        }
    };

    const filteredProjects = projects.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const aiFeatures = [
        {
            icon: Wand2,
            label: '续写',
            description: 'AI 自动续写内容',
            color: 'text-purple-500 bg-purple-50',
        },
        {
            icon: Edit3,
            label: '改写',
            description: '优化文字表达',
            color: 'text-blue-500 bg-blue-50',
        },
        {
            icon: Languages,
            label: '翻译',
            description: '多语言翻译',
            color: 'text-green-500 bg-green-50',
        },
        {
            icon: Sparkles,
            label: '润色',
            description: '提升文章质量',
            color: 'text-amber-500 bg-amber-50',
        },
    ];

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return '昨天';
        } else if (days < 7) {
            return `${days} 天前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    };

    return (
        <div className="flex h-full flex-col overflow-hidden bg-gray-50">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">AI 写作</h1>
                        <p className="mt-1 text-sm text-gray-500">智能写作助手，让写作更高效</p>
                    </div>
                    <button
                        onClick={() => setShowTemplateModal(true)}
                        disabled={creating}
                        className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                    >
                        {creating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="h-4 w-4" />
                        )}
                        新建文档
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* AI Features */}
                <div className="mb-8">
                    <h2 className="mb-4 text-sm font-semibold text-gray-700">AI 写作功能</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {aiFeatures.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={feature.label}
                                    className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                                >
                                    <div
                                        className={`mb-3 inline-flex rounded-lg p-2 ${feature.color}`}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="font-medium text-gray-900">{feature.label}</h3>
                                    <p className="mt-1 text-sm text-gray-500">{feature.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Projects Section */}
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">我的文档</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="搜索文档..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                            <FileText className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900">
                                {searchQuery ? '没有找到匹配的文档' : '还没有文档'}
                            </h3>
                            <p className="mt-2 text-sm text-gray-500">
                                {searchQuery ? '尝试其他搜索词' : '点击"新建文档"开始创作'}
                            </p>
                            {!searchQuery && (
                                <button
                                    onClick={() => setShowTemplateModal(true)}
                                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                                >
                                    <Plus className="h-4 w-4" />
                                    新建文档
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredProjects.map((project) => (
                                <div
                                    key={project.id}
                                    className="group relative rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
                                >
                                    <div
                                        className="cursor-pointer"
                                        onClick={() => router.push(`/ai-writing/${project.id}`)}
                                    >
                                        <div className="mb-3 flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-gray-400" />
                                                <span
                                                    className={`rounded px-2 py-0.5 text-xs ${
                                                        project.status === 'completed'
                                                            ? 'bg-green-100 text-green-700'
                                                            : project.status === 'archived'
                                                            ? 'bg-gray-100 text-gray-600'
                                                            : 'bg-blue-100 text-blue-700'
                                                    }`}
                                                >
                                                    {project.status === 'completed'
                                                        ? '已完成'
                                                        : project.status === 'archived'
                                                        ? '已归档'
                                                        : '草稿'}
                                                </span>
                                            </div>
                                        </div>
                                        <h3 className="mb-2 font-medium text-gray-900 line-clamp-1">
                                            {project.title}
                                        </h3>
                                        <p className="mb-3 text-sm text-gray-500 line-clamp-2">
                                            {project.content
                                                ? project.content.slice(0, 100) + '...'
                                                : '暂无内容'}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(project.updated_at)}
                                            </span>
                                            <span>{project.word_count} 字</span>
                                        </div>
                                    </div>

                                    {/* Delete button */}
                                    <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                                        {deleteConfirm === project.id ? (
                                            <div className="flex items-center gap-1 rounded bg-red-50 p-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteProject(project.id);
                                                    }}
                                                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                                                >
                                                    确认
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteConfirm(null);
                                                    }}
                                                    className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                                                >
                                                    取消
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteConfirm(project.id);
                                                }}
                                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                                                title="删除"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Template Selection Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900">选择模板</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Blank document */}
                            <button
                                onClick={() => handleCreateProject()}
                                disabled={creating}
                                className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 text-center transition-colors hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
                            >
                                <FileText className="h-8 w-8 text-gray-400" />
                                <span className="font-medium text-gray-700">空白文档</span>
                            </button>

                            {/* Templates */}
                            {templates.map((template) => {
                                const Icon =
                                    TEMPLATE_ICONS[template.icon] || FileText;
                                return (
                                    <button
                                        key={template.id}
                                        onClick={() => handleCreateProject(template.id)}
                                        disabled={creating}
                                        className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 text-center transition-colors hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
                                    >
                                        <Icon className="h-8 w-8 text-gray-400" />
                                        <span className="font-medium text-gray-700">
                                            {template.name_cn}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setShowTemplateModal(false)}
                                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
