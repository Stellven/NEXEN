'use client';

interface ResultPanelProps {
    content: string;
    title?: string;
}

export function ResultPanel({ content, title = '研究结果' }: ResultPanelProps) {
    return (
        <div className="h-full flex flex-col bg-[var(--bg-primary)]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="panel-header mb-0 pb-0 border-none flex items-center gap-2">
                    <span>📄</span>
                    <span>{title}</span>
                </h2>

                {content && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigator.clipboard.writeText(content)}
                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded hover:bg-[var(--bg-secondary)]"
                        >
                            复制
                        </button>
                        <button
                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded hover:bg-[var(--bg-secondary)]"
                        >
                            导出
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-auto p-6">
                {content ? (
                    <div className="markdown-content max-w-none">
                        {/* Simple markdown rendering - in production use react-markdown */}
                        {content.split('\n').map((line, i) => {
                            if (line.startsWith('# ')) {
                                return <h1 key={i}>{line.slice(2)}</h1>;
                            }
                            if (line.startsWith('## ')) {
                                return <h2 key={i}>{line.slice(3)}</h2>;
                            }
                            if (line.startsWith('### ')) {
                                return <h3 key={i}>{line.slice(4)}</h3>;
                            }
                            if (line.startsWith('- ')) {
                                return <li key={i}>{line.slice(2)}</li>;
                            }
                            if (line.trim() === '') {
                                return <br key={i} />;
                            }
                            return <p key={i}>{line}</p>;
                        })}
                    </div>
                ) : (
                    <div className="text-center text-[var(--text-muted)] py-12">
                        <div className="text-4xl mb-4">📊</div>
                        <p className="text-sm">研究结果将显示在这里</p>
                        <p className="text-xs mt-2">完成任务后，综合报告将自动生成</p>
                    </div>
                )}
            </div>
        </div>
    );
}
