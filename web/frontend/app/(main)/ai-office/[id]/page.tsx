'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    Download,
    Loader2,
    Plus,
    BarChart2,
    Sparkles,
    Check,
    Trash2,
} from 'lucide-react';
import { reportsApi, Report, ChartDataPoint, ChartConfig } from '@/lib/api';
import { useReportsStore } from '@/lib/reportsStore';
import { SectionEditor, ChartRenderer, ChartBuilder, ExportModal } from '@/components/reports';

export default function ReportEditorPage() {
    const params = useParams();
    const router = useRouter();
    const reportId = params.id as string;

    const {
        currentReport,
        setCurrentReport,
        isGenerating,
        setIsGenerating,
        generatingSectionId,
        setGeneratingSectionId,
        streamingContent,
        setStreamingContent,
        appendStreamingContent,
        clearStreamingContent,
        showChartBuilder,
        setShowChartBuilder,
        editingChartId,
        setEditingChartId,
        showExportModal,
        setShowExportModal,
        isSaving,
        setIsSaving,
    } = useReportsStore();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    // Load report
    useEffect(() => {
        const loadReport = async () => {
            try {
                setLoading(true);
                setError(null);
                const report = await reportsApi.getReport(reportId);
                setCurrentReport(report);
                setTitle(report.title);
            } catch (err) {
                console.error('Failed to load report:', err);
                setError('加载报告失败');
            } finally {
                setLoading(false);
            }
        };
        loadReport();

        return () => {
            setCurrentReport(null);
            clearStreamingContent();
        };
    }, [reportId, setCurrentReport, clearStreamingContent]);

    // Save report
    const saveReport = useCallback(async () => {
        if (!currentReport || isSaving) return;

        setIsSaving(true);
        try {
            await reportsApi.updateReport(currentReport.id, {
                title,
            });
            setLastSavedAt(new Date());
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setIsSaving(false);
        }
    }, [currentReport, title, isSaving, setIsSaving]);

    // Handle title change
    const handleTitleChange = useCallback((newTitle: string) => {
        setTitle(newTitle);
    }, []);

    // Handle section title change
    const handleSectionTitleChange = useCallback(
        async (sectionId: string, newTitle: string) => {
            if (!currentReport) return;
            try {
                await reportsApi.updateSection(currentReport.id, sectionId, { title: newTitle });
                // Update local state
                const updatedSections = currentReport.sections.map((s) =>
                    s.id === sectionId ? { ...s, title: newTitle } : s
                );
                setCurrentReport({ ...currentReport, sections: updatedSections });
            } catch (err) {
                console.error('Failed to update section:', err);
            }
        },
        [currentReport, setCurrentReport]
    );

    // Handle section content change
    const handleSectionContentChange = useCallback(
        async (sectionId: string, content: string) => {
            if (!currentReport) return;
            try {
                await reportsApi.updateSection(currentReport.id, sectionId, { content });
                // Update local state
                const updatedSections = currentReport.sections.map((s) =>
                    s.id === sectionId ? { ...s, content } : s
                );
                setCurrentReport({ ...currentReport, sections: updatedSections });
            } catch (err) {
                console.error('Failed to update section:', err);
            }
        },
        [currentReport, setCurrentReport]
    );

    // Handle AI generate for section
    const handleGenerateSection = useCallback(
        async (sectionId: string) => {
            if (!currentReport || isGenerating) return;

            setIsGenerating(true);
            setGeneratingSectionId(sectionId);
            clearStreamingContent();

            try {
                await reportsApi.generateContent(
                    currentReport.id,
                    { section_id: sectionId },
                    (chunk) => {
                        appendStreamingContent(chunk);
                    },
                    (completedSectionId) => {
                        // Reload to get updated content
                        reportsApi.getReport(currentReport.id).then((updated) => {
                            setCurrentReport(updated);
                        });
                    },
                    (error) => {
                        console.error('AI generation error:', error);
                        alert(error);
                    }
                );
            } catch (err) {
                console.error('Failed to generate:', err);
            } finally {
                setIsGenerating(false);
                setGeneratingSectionId(null);
                clearStreamingContent();
            }
        },
        [
            currentReport,
            isGenerating,
            setIsGenerating,
            setGeneratingSectionId,
            clearStreamingContent,
            appendStreamingContent,
            setCurrentReport,
        ]
    );

    // Handle add section
    const handleAddSection = useCallback(async () => {
        if (!currentReport) return;
        try {
            const result = await reportsApi.addSection(currentReport.id, {
                title: '新章节',
                content: '',
            });
            // Reload report
            const updated = await reportsApi.getReport(currentReport.id);
            setCurrentReport(updated);
        } catch (err) {
            console.error('Failed to add section:', err);
        }
    }, [currentReport, setCurrentReport]);

    // Handle delete section
    const handleDeleteSection = useCallback(
        async (sectionId: string) => {
            if (!currentReport) return;
            try {
                await reportsApi.deleteSection(currentReport.id, sectionId);
                const updatedSections = currentReport.sections.filter((s) => s.id !== sectionId);
                setCurrentReport({ ...currentReport, sections: updatedSections });
            } catch (err) {
                console.error('Failed to delete section:', err);
            }
        },
        [currentReport, setCurrentReport]
    );

    // Handle add chart
    const handleAddChart = useCallback(
        async (chart: { type: string; title: string; data: ChartDataPoint[]; config: ChartConfig }) => {
            if (!currentReport) return;
            try {
                await reportsApi.addChart(currentReport.id, chart);
                const updated = await reportsApi.getReport(currentReport.id);
                setCurrentReport(updated);
            } catch (err) {
                console.error('Failed to add chart:', err);
            }
        },
        [currentReport, setCurrentReport]
    );

    // Handle delete chart
    const handleDeleteChart = useCallback(
        async (chartId: string) => {
            if (!currentReport) return;
            try {
                await reportsApi.deleteChart(currentReport.id, chartId);
                const updatedCharts = currentReport.charts_data.filter((c) => c.id !== chartId);
                setCurrentReport({ ...currentReport, charts_data: updatedCharts });
            } catch (err) {
                console.error('Failed to delete chart:', err);
            }
        },
        [currentReport, setCurrentReport]
    );

    // Handle export
    const handleExport = useCallback(
        async (format: 'pdf' | 'docx' | 'md') => {
            if (!currentReport) return;
            try {
                const blob = await reportsApi.exportReport(currentReport.id, format);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentReport.title}.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error('Failed to export:', err);
                throw err;
            }
        },
        [currentReport]
    );

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
                    onClick={() => router.push('/ai-office')}
                    className="mt-4 text-blue-500 hover:underline"
                >
                    返回报告列表
                </button>
            </div>
        );
    }

    if (!currentReport) return null;

    return (
        <div className="flex h-full flex-col overflow-hidden bg-gray-50">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/ai-office')}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        title="返回"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        onBlur={saveReport}
                        className="border-none bg-transparent text-lg font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
                        placeholder="报告标题"
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
                        ) : null}
                    </div>

                    {/* AI Generate All */}
                    <button
                        onClick={() => {
                            // Generate all sections
                            currentReport.sections.forEach((s) => {
                                if (!s.content) {
                                    handleGenerateSection(s.id);
                                }
                            });
                        }}
                        disabled={isGenerating}
                        className="flex items-center gap-2 rounded-lg border border-purple-200 px-3 py-2 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-50 disabled:opacity-50"
                    >
                        <Sparkles className="h-4 w-4" />
                        AI 生成
                    </button>

                    {/* Export */}
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                    >
                        <Download className="h-4 w-4" />
                        导出
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Main Editor */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Sections */}
                    <div className="mb-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700">报告章节</h2>
                            <button
                                onClick={handleAddSection}
                                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                            >
                                <Plus className="h-3 w-3" />
                                添加章节
                            </button>
                        </div>
                        <div className="space-y-4">
                            {currentReport.sections.map((section, index) => (
                                <SectionEditor
                                    key={section.id}
                                    id={section.id}
                                    title={section.title}
                                    content={section.content}
                                    order={section.order}
                                    isGenerating={generatingSectionId === section.id}
                                    streamingContent={
                                        generatingSectionId === section.id ? streamingContent : ''
                                    }
                                    onTitleChange={(newTitle) =>
                                        handleSectionTitleChange(section.id, newTitle)
                                    }
                                    onContentChange={(content) =>
                                        handleSectionContentChange(section.id, content)
                                    }
                                    onGenerate={() => handleGenerateSection(section.id)}
                                    onDelete={() => handleDeleteSection(section.id)}
                                    isFirst={index === 0}
                                    isLast={index === currentReport.sections.length - 1}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Charts */}
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700">数据图表</h2>
                            <button
                                onClick={() => {
                                    setEditingChartId(null);
                                    setShowChartBuilder(true);
                                }}
                                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                            >
                                <BarChart2 className="h-3 w-3" />
                                添加图表
                            </button>
                        </div>
                        {currentReport.charts_data.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
                                <BarChart2 className="mx-auto h-8 w-8 text-gray-300" />
                                <p className="mt-2 text-sm text-gray-500">暂无图表，点击添加</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {currentReport.charts_data.map((chart) => (
                                    <div key={chart.id} className="group relative">
                                        <ChartRenderer
                                            type={chart.type}
                                            title={chart.title}
                                            data={chart.data}
                                            config={chart.config}
                                            height={250}
                                        />
                                        <button
                                            onClick={() => handleDeleteChart(chart.id)}
                                            className="absolute right-2 top-2 rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                                            title="删除图表"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Chart Builder Modal */}
            <ChartBuilder
                isOpen={showChartBuilder}
                onClose={() => {
                    setShowChartBuilder(false);
                    setEditingChartId(null);
                }}
                onSave={handleAddChart}
            />

            {/* Export Modal */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleExport}
                reportTitle={currentReport.title}
            />
        </div>
    );
}
