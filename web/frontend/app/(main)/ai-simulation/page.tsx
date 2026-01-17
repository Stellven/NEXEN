'use client';

import { useState } from 'react';
import {
    Grid3X3,
    Plus,
    Play,
    Sparkles,
    Scale,
    Target,
    Lightbulb,
    ChevronRight,
} from 'lucide-react';

interface Option {
    id: string;
    name: string;
    scores: Record<string, number>;
}

interface Criterion {
    id: string;
    name: string;
    weight: number;
}

interface Analysis {
    id: string;
    title: string;
    options: Option[];
    criteria: Criterion[];
    recommendation?: string;
    createdAt: string;
}

export default function AIDecisionPage() {
    const [analyses] = useState<Analysis[]>([
        {
            id: '1',
            title: '技术方案选型',
            options: [
                { id: 'o1', name: '方案 A', scores: { c1: 8, c2: 7, c3: 9 } },
                { id: 'o2', name: '方案 B', scores: { c1: 6, c2: 9, c3: 7 } },
            ],
            criteria: [
                { id: 'c1', name: '成本', weight: 0.3 },
                { id: 'c2', name: '性能', weight: 0.4 },
                { id: 'c3', name: '可维护性', weight: 0.3 },
            ],
            recommendation: '推荐方案 A，综合评分更高',
            createdAt: '2024-01-15',
        },
    ]);

    const features = [
        { icon: Grid3X3, label: '决策矩阵', description: '多维度评估选项' },
        { icon: Scale, label: '权重分析', description: '自定义评估标准' },
        { icon: Target, label: '场景模拟', description: '测试不同场景' },
        { icon: Sparkles, label: 'AI 推荐', description: '智能决策建议' },
    ];

    return (
        <div className="flex h-full flex-col">
            {/* 头部 */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">AI Decision</h1>
                        <p className="text-sm text-gray-500">智能决策分析与模拟</p>
                    </div>
                    <button className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">
                        <Plus className="h-4 w-4" />
                        新建分析
                    </button>
                </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* 功能卡片 */}
                <div className="mb-8">
                    <h2 className="mb-4 font-semibold text-gray-700">决策工具</h2>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {features.map((feature) => (
                            <div
                                key={feature.label}
                                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-md"
                            >
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
                                    <feature.icon className="h-5 w-5 text-blue-500" />
                                </div>
                                <h3 className="mb-1 font-medium text-gray-900">{feature.label}</h3>
                                <p className="text-xs text-gray-500">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 分析列表 */}
                <div>
                    <h2 className="mb-4 font-semibold text-gray-700">我的决策分析</h2>
                    {analyses.length > 0 ? (
                        <div className="space-y-4">
                            {analyses.map((analysis) => (
                                <div
                                    key={analysis.id}
                                    className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-blue-200 hover:shadow-md"
                                >
                                    <div className="mb-4 flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {analysis.title}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {analysis.options.length} 个选项 · {analysis.criteria.length} 个评估标准
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {analysis.createdAt}
                                        </span>
                                    </div>

                                    {/* 简化的决策矩阵预览 */}
                                    <div className="mb-4 overflow-hidden rounded-lg border border-gray-100">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                                                        选项
                                                    </th>
                                                    {analysis.criteria.map((c) => (
                                                        <th
                                                            key={c.id}
                                                            className="px-3 py-2 text-center font-medium text-gray-700"
                                                        >
                                                            {c.name}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {analysis.options.map((option) => (
                                                    <tr key={option.id} className="border-t border-gray-100">
                                                        <td className="px-3 py-2 font-medium text-gray-900">
                                                            {option.name}
                                                        </td>
                                                        {analysis.criteria.map((c) => (
                                                            <td
                                                                key={c.id}
                                                                className="px-3 py-2 text-center text-gray-600"
                                                            >
                                                                {option.scores[c.id]}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {analysis.recommendation && (
                                        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                                            <Lightbulb className="h-4 w-4 text-blue-500" />
                                            <span className="text-sm text-blue-700">
                                                {analysis.recommendation}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
                            <Grid3X3 className="mb-4 h-12 w-12 text-gray-300" />
                            <p className="text-gray-500">还没有决策分析</p>
                            <p className="text-sm text-gray-400">创建新的分析开始决策</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
