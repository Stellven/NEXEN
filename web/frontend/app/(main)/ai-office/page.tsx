'use client';

import { useState } from 'react';
import {
    FileText,
    Plus,
    Download,
    BarChart2,
    PieChart,
    TrendingUp,
    FileDown,
    MoreVertical,
} from 'lucide-react';

interface Report {
    id: string;
    title: string;
    type: 'analysis' | 'summary' | 'dashboard';
    status: 'draft' | 'completed';
    createdAt: string;
}

export default function AIReportsPage() {
    const [reports] = useState<Report[]>([
        { id: '1', title: '季度业务分析报告', type: 'analysis', status: 'completed', createdAt: '2024-01-15' },
        { id: '2', title: '用户行为分析', type: 'dashboard', status: 'completed', createdAt: '2024-01-14' },
        { id: '3', title: '市场趋势报告', type: 'summary', status: 'draft', createdAt: '2024-01-13' },
    ]);

    const reportTemplates = [
        { icon: BarChart2, label: '数据分析报告', description: '结构化数据分析' },
        { icon: PieChart, label: '仪表盘报告', description: '可视化数据展示' },
        { icon: TrendingUp, label: '趋势分析报告', description: '时间序列分析' },
        { icon: FileText, label: '研究摘要', description: '自动生成摘要' },
    ];

    const getTypeIcon = (type: Report['type']) => {
        switch (type) {
            case 'analysis':
                return <BarChart2 className="h-5 w-5 text-blue-500" />;
            case 'dashboard':
                return <PieChart className="h-5 w-5 text-purple-500" />;
            case 'summary':
                return <FileText className="h-5 w-5 text-green-500" />;
        }
    };

    return (
        <div className="flex h-full flex-col">
            {/* 头部 */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">AI Reports</h1>
                        <p className="text-sm text-gray-500">智能报告生成与管理</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
                            <FileDown className="h-4 w-4" />
                            导出全部
                        </button>
                        <button className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">
                            <Plus className="h-4 w-4" />
                            新建报告
                        </button>
                    </div>
                </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* 报告模板 */}
                <div className="mb-8">
                    <h2 className="mb-4 font-semibold text-gray-700">快速创建</h2>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {reportTemplates.map((template) => (
                            <div
                                key={template.label}
                                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-md"
                            >
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
                                    <template.icon className="h-5 w-5 text-blue-500" />
                                </div>
                                <h3 className="mb-1 font-medium text-gray-900">{template.label}</h3>
                                <p className="text-xs text-gray-500">{template.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 报告列表 */}
                <div>
                    <h2 className="mb-4 font-semibold text-gray-700">我的报告</h2>
                    <div className="rounded-xl border border-gray-200 bg-white">
                        {reports.map((report, index) => (
                            <div
                                key={report.id}
                                className={`flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-gray-50 ${
                                    index !== reports.length - 1 ? 'border-b border-gray-100' : ''
                                }`}
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50">
                                    {getTypeIcon(report.type)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-gray-900">{report.title}</h3>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                report.status === 'completed'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}
                                        >
                                            {report.status === 'completed' ? '已完成' : '草稿'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">创建于 {report.createdAt}</p>
                                </div>
                                <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
                                    <Download className="h-4 w-4" />
                                    导出
                                </button>
                                <button className="rounded p-2 hover:bg-gray-100">
                                    <MoreVertical className="h-4 w-4 text-gray-400" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
