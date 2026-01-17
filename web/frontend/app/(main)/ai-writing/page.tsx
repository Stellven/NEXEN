'use client';

import { useState } from 'react';
import {
    FileText,
    Plus,
    MoreVertical,
    Edit3,
    Sparkles,
    Languages,
    Wand2,
    Download,
} from 'lucide-react';

interface WritingProject {
    id: string;
    title: string;
    excerpt: string;
    wordCount: number;
    updatedAt: string;
}

export default function AIWritingPage() {
    const [projects] = useState<WritingProject[]>([
        {
            id: '1',
            title: '产品需求文档',
            excerpt: '本文档描述了新功能的详细需求...',
            wordCount: 2500,
            updatedAt: '2024-01-15',
        },
        {
            id: '2',
            title: '技术方案设计',
            excerpt: '本方案介绍了系统架构的设计思路...',
            wordCount: 1800,
            updatedAt: '2024-01-14',
        },
        {
            id: '3',
            title: '市场分析报告',
            excerpt: '通过对市场数据的深入分析...',
            wordCount: 3200,
            updatedAt: '2024-01-13',
        },
    ]);

    const aiFeatures = [
        { icon: Wand2, label: '续写', description: 'AI 自动续写内容' },
        { icon: Edit3, label: '改写', description: '优化文字表达' },
        { icon: Languages, label: '翻译', description: '多语言翻译' },
        { icon: Sparkles, label: '润色', description: '提升文章质量' },
    ];

    return (
        <div className="flex h-full flex-col">
            {/* 头部 */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">AI Writing</h1>
                        <p className="text-sm text-gray-500">AI 辅助写作，提升创作效率</p>
                    </div>
                    <button className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">
                        <Plus className="h-4 w-4" />
                        新建文档
                    </button>
                </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* AI 功能卡片 */}
                <div className="mb-8">
                    <h2 className="mb-4 font-semibold text-gray-700">AI 写作助手</h2>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {aiFeatures.map((feature) => (
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

                {/* 项目列表 */}
                <div>
                    <h2 className="mb-4 font-semibold text-gray-700">我的文档</h2>
                    <div className="rounded-xl border border-gray-200 bg-white">
                        {projects.map((project, index) => (
                            <div
                                key={project.id}
                                className={`flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-gray-50 ${
                                    index !== projects.length - 1 ? 'border-b border-gray-100' : ''
                                }`}
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
                                    <FileText className="h-6 w-6 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">{project.title}</h3>
                                    <p className="text-sm text-gray-500">{project.excerpt}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">{project.wordCount} 字</p>
                                    <p className="text-xs text-gray-400">{project.updatedAt}</p>
                                </div>
                                <button className="rounded p-2 hover:bg-gray-100">
                                    <MoreVertical className="h-4 w-4 text-gray-400" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 模板区域 */}
                <div className="mt-8">
                    <h2 className="mb-4 font-semibold text-gray-700">写作模板</h2>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {['周报', '技术文档', '产品需求', '会议纪要'].map((template) => (
                            <div
                                key={template}
                                className="cursor-pointer rounded-xl border border-dashed border-gray-300 p-4 text-center transition-all hover:border-blue-400 hover:bg-blue-50/50"
                            >
                                <Plus className="mx-auto mb-2 h-6 w-6 text-gray-400" />
                                <p className="text-sm text-gray-600">{template}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
