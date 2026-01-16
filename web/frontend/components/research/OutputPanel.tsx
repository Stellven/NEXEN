'use client';

import { FileText, ListChecks, AlertTriangle, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useResearchStore } from '@/lib/store';

export function OutputPanel() {
    const { currentResult } = useResearchStore();

    if (!currentResult) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <FileText className="w-12 h-12 text-dark-muted mb-4" />
                <h3 className="text-lg font-semibold mb-2">研究输出</h3>
                <p className="text-dark-muted text-sm">
                    执行研究任务后，详细结果将显示在这里
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-dark-border">
                <h2 className="text-lg font-semibold">研究报告</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentResult}
                    </ReactMarkdown>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="p-4 border-t border-dark-border grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-dark-bg rounded-lg">
                    <ListChecks className="w-4 h-4 mx-auto mb-1 text-green-400" />
                    <div className="text-xs text-dark-muted">发现</div>
                    <div className="font-semibold">5</div>
                </div>
                <div className="p-2 bg-dark-bg rounded-lg">
                    <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
                    <div className="text-xs text-dark-muted">待验证</div>
                    <div className="font-semibold">2</div>
                </div>
                <div className="p-2 bg-dark-bg rounded-lg">
                    <Lightbulb className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                    <div className="text-xs text-dark-muted">建议</div>
                    <div className="font-semibold">3</div>
                </div>
            </div>
        </div>
    );
}
