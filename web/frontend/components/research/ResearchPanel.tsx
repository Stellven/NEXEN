'use client';

import { useState } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useResearchStore } from '@/lib/store';
import { api } from '@/lib/api';

export function ResearchPanel() {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { currentResult, setCurrentResult, addMessage, messages } = useResearchStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const task = input.trim();
        setInput('');
        setIsLoading(true);

        // Add user message
        addMessage({
            role: 'user',
            content: task,
            timestamp: new Date().toISOString(),
        });

        try {
            const result = await api.startResearch(task);

            // Poll for completion
            let status = result;
            while (status.status === 'pending' || status.status === 'running') {
                await new Promise(resolve => setTimeout(resolve, 2000));
                status = await api.getResearchStatus(result.task_id);
            }

            if (status.status === 'completed') {
                setCurrentResult(status.synthesis || '');
                addMessage({
                    role: 'assistant',
                    content: status.synthesis || 'Research completed.',
                    timestamp: new Date().toISOString(),
                });
            } else {
                addMessage({
                    role: 'error',
                    content: `Research failed: ${status.message}`,
                    timestamp: new Date().toISOString(),
                });
            }
        } catch (error) {
            addMessage({
                role: 'error',
                content: `Error: ${error}`,
                timestamp: new Date().toISOString(),
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickAction = (action: string) => {
        const actions: Record<string, string> = {
            survey: '/survey ',
            who: '/who ',
            evolution: '/evolution ',
        };
        setInput(actions[action] || '');
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-dark-border">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-nexen-400" />
                    研究面板
                </h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🧠</div>
                        <h3 className="text-xl font-semibold mb-2">开始你的研究</h3>
                        <p className="text-dark-muted mb-6">
                            输入研究任务，NEXEN 将协调多个 AI Agent 为你工作
                        </p>

                        {/* Quick Actions */}
                        <div className="flex flex-wrap justify-center gap-2">
                            <button
                                onClick={() => handleQuickAction('survey')}
                                className="px-4 py-2 bg-dark-card hover:bg-dark-border rounded-lg text-sm transition-colors"
                            >
                                📚 文献调研
                            </button>
                            <button
                                onClick={() => handleQuickAction('who')}
                                className="px-4 py-2 bg-dark-card hover:bg-dark-border rounded-lg text-sm transition-colors"
                            >
                                👤 人物档案
                            </button>
                            <button
                                onClick={() => handleQuickAction('evolution')}
                                className="px-4 py-2 bg-dark-card hover:bg-dark-border rounded-lg text-sm transition-colors"
                            >
                                🏛️ 技术演进
                            </button>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`p-4 rounded-lg ${msg.role === 'user'
                                    ? 'bg-nexen-500/20 ml-12'
                                    : msg.role === 'error'
                                        ? 'bg-red-500/20 mr-12'
                                        : 'bg-dark-card mr-12'
                                }`}
                        >
                            <div className="text-xs text-dark-muted mb-2">
                                {msg.role === 'user' ? '你' : msg.role === 'error' ? '错误' : 'NEXEN'}
                                {' · '}
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </div>
                            <div className="markdown-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="flex items-center gap-2 text-dark-muted p-4">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>正在协调 Agents 执行研究任务...</span>
                    </div>
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-dark-border">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="输入你的研究任务... 例如: 分析 Transformer 架构的演进历程"
                        className="flex-1 bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-white placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-nexen-500 focus:border-transparent"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-4 py-3 bg-nexen-500 hover:bg-nexen-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
