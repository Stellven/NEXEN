'use client';

import { useState } from 'react';
import { X, FileText, FileCode, Download, Loader2 } from 'lucide-react';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: 'pdf' | 'docx' | 'md') => Promise<void>;
    reportTitle: string;
}

const EXPORT_FORMATS = [
    {
        id: 'pdf',
        name: 'PDF',
        description: '便于分享和打印的标准格式',
        icon: FileText,
        extension: '.pdf',
    },
    {
        id: 'docx',
        name: 'Word 文档',
        description: '可编辑的 Microsoft Word 格式',
        icon: FileCode,
        extension: '.docx',
    },
    {
        id: 'md',
        name: 'Markdown',
        description: '纯文本格式，适合开发者',
        icon: FileText,
        extension: '.md',
    },
];

export function ExportModal({
    isOpen,
    onClose,
    onExport,
    reportTitle,
}: ExportModalProps) {
    const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'docx' | 'md'>('pdf');
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExport = async () => {
        setIsExporting(true);
        setError(null);
        try {
            await onExport(selectedFormat);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : '导出失败');
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-gray-900">导出报告</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="mb-4 text-sm text-gray-600">
                        选择导出格式: <span className="font-medium">{reportTitle}</span>
                    </p>

                    {/* Format Options */}
                    <div className="space-y-2">
                        {EXPORT_FORMATS.map((format) => {
                            const Icon = format.icon;
                            return (
                                <button
                                    key={format.id}
                                    onClick={() => setSelectedFormat(format.id as typeof selectedFormat)}
                                    className={`flex w-full items-center gap-4 rounded-lg border p-4 transition-colors ${
                                        selectedFormat === format.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div
                                        className={`rounded-lg p-2 ${
                                            selectedFormat === format.id
                                                ? 'bg-blue-100 text-blue-600'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`font-medium ${
                                                    selectedFormat === format.id
                                                        ? 'text-blue-900'
                                                        : 'text-gray-900'
                                                }`}
                                            >
                                                {format.name}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {format.extension}
                                            </span>
                                        </div>
                                        <p
                                            className={`text-sm ${
                                                selectedFormat === format.id
                                                    ? 'text-blue-700'
                                                    : 'text-gray-500'
                                            }`}
                                        >
                                            {format.description}
                                        </p>
                                    </div>
                                    <div
                                        className={`h-4 w-4 rounded-full border-2 ${
                                            selectedFormat === format.id
                                                ? 'border-blue-500 bg-blue-500'
                                                : 'border-gray-300'
                                        }`}
                                    >
                                        {selectedFormat === format.id && (
                                            <div className="h-full w-full rounded-full bg-white scale-50" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                    <button
                        onClick={onClose}
                        disabled={isExporting}
                        className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                导出中...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                导出
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
