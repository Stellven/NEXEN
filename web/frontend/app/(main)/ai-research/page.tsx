'use client';

import { useState } from 'react';
import {
    BarChart3,
    Play,
    Pause,
    RefreshCw,
    Bot,
    CheckCircle2,
    Circle,
    AlertCircle,
    ChevronRight,
} from 'lucide-react';

interface Agent {
    id: string;
    name: string;
    nameCn: string;
    status: 'idle' | 'running' | 'completed' | 'error';
    task?: string;
}

const defaultAgents: Agent[] = [
    { id: 'meta_coordinator', name: 'Meta-Coordinator', nameCn: '元协调者', status: 'idle' },
    { id: 'explorer', name: 'Explorer', nameCn: '探索者', status: 'idle' },
    { id: 'logician', name: 'Logician', nameCn: '逻辑推理者', status: 'idle' },
    { id: 'critic', name: 'Critic', nameCn: '批判者', status: 'idle' },
    { id: 'builder', name: 'Builder', nameCn: '构建者', status: 'idle' },
    { id: 'scribe', name: 'Scribe', nameCn: '记录者', status: 'idle' },
];

export default function AIResearchPage() {
    const [agents, setAgents] = useState<Agent[]>(defaultAgents);
    const [query, setQuery] = useState('');
    const [isResearching, setIsResearching] = useState(false);
    const [result, setResult] = useState('');

    const getStatusIcon = (status: Agent['status']) => {
        switch (status) {
            case 'idle':
                return <Circle className="h-4 w-4 text-gray-400" />;
            case 'running':
                return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
            case 'completed':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
        }
    };

    const handleResearch = async () => {
        if (!query.trim() || isResearching) return;
        setIsResearching(true);
        setResult('');

        // 模拟研究过程
        for (let i = 0; i < agents.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            setAgents((prev) =>
                prev.map((a, idx) =>
                    idx === i ? { ...a, status: 'running', task: '处理中...' } : a
                )
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setAgents((prev) =>
                prev.map((a, idx) =>
                    idx === i ? { ...a, status: 'completed', task: '完成' } : a
                )
            );
        }

        setResult('研究完成！这里显示 AI 研究的结果摘要。\n\n多智能体系统协同工作，为您提供全面的研究分析。');
        setIsResearching(false);
    };

    const resetAgents = () => {
        setAgents(defaultAgents);
        setResult('');
    };

    return (
        <div className="flex h-full">
            {/* 左侧 Agent 面板 */}
            <div className="w-64 border-r border-gray-200 bg-white">
                <div className="border-b border-gray-200 p-4">
                    <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                        <Bot className="h-5 w-5 text-blue-500" />
                        研究团队
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">多智能体协同研究</p>
                </div>
                <div className="p-2">
                    {agents.map((agent) => (
                        <div
                            key={agent.id}
                            className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                                agent.status === 'running'
                                    ? 'bg-blue-50'
                                    : agent.status === 'completed'
                                    ? 'bg-green-50'
                                    : 'hover:bg-gray-50'
                            }`}
                        >
                            {getStatusIcon(agent.status)}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {agent.nameCn}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {agent.task || agent.name}
                                </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                    ))}
                </div>
            </div>

            {/* 主内容区 */}
            <div className="flex flex-1 flex-col">
                {/* 头部 */}
                <div className="border-b border-gray-200 bg-white px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">AI Research</h1>
                            <p className="text-sm text-gray-500">多智能体深度研究系统</p>
                        </div>
                        <button
                            onClick={resetAgents}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                        >
                            <RefreshCw className="h-4 w-4" />
                            重置
                        </button>
                    </div>
                </div>

                {/* 输入区 */}
                <div className="border-b border-gray-200 bg-gray-50 p-6">
                    <div className="mx-auto max-w-3xl">
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="输入您的研究问题，例如：分析人工智能在医疗领域的应用前景..."
                            className="h-32 w-full resize-none rounded-xl border border-gray-200 bg-white p-4 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleResearch}
                                disabled={!query.trim() || isResearching}
                                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-2.5 text-sm font-medium text-white transition-all hover:from-blue-600 hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-300"
                            >
                                {isResearching ? (
                                    <>
                                        <Pause className="h-4 w-4" />
                                        研究中...
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-4 w-4" />
                                        开始研究
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 结果区 */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mx-auto max-w-3xl">
                        {result ? (
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                                    <BarChart3 className="h-5 w-5 text-blue-500" />
                                    研究结果
                                </h3>
                                <div className="prose prose-sm max-w-none">
                                    <p className="whitespace-pre-wrap text-gray-700">{result}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
                                    <BarChart3 className="h-8 w-8 text-blue-500" />
                                </div>
                                <h3 className="mb-2 font-medium text-gray-700">
                                    开始您的 AI 研究
                                </h3>
                                <p className="text-sm text-gray-500">
                                    输入研究问题，多智能体将协同为您分析
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
