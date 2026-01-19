'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText,
    Plus,
    Download,
    BarChart2,
    Briefcase,
    Code,
    Search as SearchIcon,
    Loader2,
    Clock,
    Trash2,
} from 'lucide-react';
import { reportsApi, Report, ReportTemplate } from '@/lib/api';
import { useReportsStore } from '@/lib/reportsStore';

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    'file-text': FileText,
    briefcase: Briefcase,
    code: Code,
    search: SearchIcon,
};

export default function AIReportsPage() {
    const router = useRouter();
    const { reports, setReports, templates, setTemplates } = useReportsStore();
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
            const [reportsRes, templatesRes] = await Promise.all([
                reportsApi.getReports(),
                reportsApi.getTemplates(),
            ]);
            setReports(reportsRes.reports);
            setTemplates(templatesRes.templates);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateReport = async (templateId?: string) => {
        try {
            setCreating(true);
            const template = templates.find((t) => t.id === templateId);
            const report = await reportsApi.createReport({
                title: template ? template.name_cn : '新报告',
                template_type: templateId || 'standard',
            });
            router.push(`/ai-office/${report.id}`);
        } catch (error) {
            console.error('Failed to create report:', error);
        } finally {
            setCreating(false);
            setShowTemplateModal(false);
        }
    };

    const handleDeleteReport = async (id: string) => {
        try {
            await reportsApi.deleteReport(id);
            setReports(reports.filter((r) => r.id !== id));
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Failed to delete report:', error);
        }
    };

    const handleExportReport = async (reportId: string, format: 'pdf' | 'docx' | 'md') => {
        try {
            const blob = await reportsApi.exportReport(reportId, format);
            const report = reports.find((r) => r.id === reportId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${report?.title || 'report'}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export report:', error);
            alert('导出失败');
        }
    };

    const filteredReports = reports.filter((r) =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-700';
            case 'exported':
                return 'bg-blue-100 text-blue-700';
            case 'generating':
                return 'bg-yellow-100 text-yellow-700';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed':
                return '已完成';
            case 'exported':
                return '已导出';
            case 'generating':
                return '生成中';
            default:
                return '草稿';
        }
    };

    return (
        <div className="flex h-full flex-col overflow-hidden bg-gray-50">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">AI Reports</h1>
                        <p className="mt-1 text-sm text-gray-500">智能报告生成、图表可视化、多格式导出</p>
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
                        新建报告
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* Templates */}
                <div className="mb-8">
                    <h2 className="mb-4 text-sm font-semibold text-gray-700">快速创建</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {templates.map((template) => {
                            const Icon = TEMPLATE_ICONS[template.icon] || FileText;
                            return (
                                <button
                                    key={template.id}
                                    onClick={() => handleCreateReport(template.id)}
                                    disabled={creating}
                                    className="flex flex-col items-start rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-200 hover:shadow-md disabled:opacity-50"
                                >
                                    <div className="mb-3 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 p-2">
                                        <Icon className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <h3 className="font-medium text-gray-900">{template.name_cn}</h3>
                                    <p className="mt-1 text-xs text-gray-500">{template.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Reports List */}
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">我的报告</h2>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="搜索报告..."
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
                    ) : filteredReports.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                            <FileText className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900">
                                {searchQuery ? '没有找到匹配的报告' : '还没有报告'}
                            </h3>
                            <p className="mt-2 text-sm text-gray-500">
                                {searchQuery ? '尝试其他搜索词' : '点击上方模板快速创建报告'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredReports.map((report) => (
                                <div
                                    key={report.id}
                                    className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                                >
                                    <div
                                        className="flex-1 cursor-pointer"
                                        onClick={() => router.push(`/ai-office/${report.id}`)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-gray-50 p-2">
                                                <FileText className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-medium text-gray-900">{report.title}</h3>
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                                                            report.status
                                                        )}`}
                                                    >
                                                        {getStatusLabel(report.status)}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex items-center gap-4 text-xs text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDate(report.updated_at)}
                                                    </span>
                                                    <span>{report.sections.length} 个章节</span>
                                                    <span>{report.charts_data.length} 个图表</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            onClick={() => handleExportReport(report.id, 'pdf')}
                                            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                                        >
                                            <Download className="h-3 w-3" />
                                            导出
                                        </button>
                                        {deleteConfirm === report.id ? (
                                            <div className="flex items-center gap-1 rounded bg-red-50 p-1">
                                                <button
                                                    onClick={() => handleDeleteReport(report.id)}
                                                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                                                >
                                                    确认
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                                                >
                                                    取消
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirm(report.id)}
                                                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
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
                        <h2 className="mb-4 text-lg font-semibold text-gray-900">选择报告模板</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {templates.map((template) => {
                                const Icon = TEMPLATE_ICONS[template.icon] || FileText;
                                return (
                                    <button
                                        key={template.id}
                                        onClick={() => handleCreateReport(template.id)}
                                        disabled={creating}
                                        className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 text-center transition-colors hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
                                    >
                                        <Icon className="h-8 w-8 text-gray-400" />
                                        <span className="font-medium text-gray-700">
                                            {template.name_cn}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {template.sections.length} 个预设章节
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
