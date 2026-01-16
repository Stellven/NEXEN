'use client';

import { useState } from 'react';

interface ResearchInputProps {
    onSubmit: (query: string) => void;
    isLoading?: boolean;
}

export function ResearchInput({ onSubmit, isLoading = false }: ResearchInputProps) {
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim() && !isLoading) {
            onSubmit(query.trim());
        }
    };

    const quickActions = [
        { label: '文献调研', icon: '📚', prompt: '综述以下主题的最新研究进展：' },
        { label: '概念解释', icon: '💡', prompt: '深入解释以下科学概念：' },
        { label: '方法比较', icon: '⚖️', prompt: '比较以下研究方法的优劣：' },
    ];

    return (
        <div className="p-6 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            <form onSubmit={handleSubmit}>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="输入您的研究问题..."
                        className="flex-1 text-base"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin">⏳</span>
                                研究中...
                            </span>
                        ) : (
                            '开始研究'
                        )}
                    </button>
                </div>
            </form>

            <div className="flex gap-2 mt-4">
                {quickActions.map((action) => (
                    <button
                        key={action.label}
                        onClick={() => setQuery(action.prompt)}
                        className="text-xs px-3 py-1.5 rounded-full bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                    >
                        {action.icon} {action.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
