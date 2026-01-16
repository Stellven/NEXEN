'use client';

import { useEffect, useRef } from 'react';

interface LogEntry {
    id: string;
    timestamp: string;
    agent: string;
    level: 'info' | 'debug' | 'error' | 'success';
    message: string;
}

interface LiveOutputProps {
    logs: LogEntry[];
    autoScroll?: boolean;
}

export function LiveOutput({ logs, autoScroll = true }: LiveOutputProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (autoScroll && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-CN', { hour12: false });
    };

    return (
        <div className="h-full flex flex-col bg-[var(--bg-primary)] border-r border-[var(--border)]">
            <div className="p-4 border-b border-[var(--border)]">
                <h2 className="panel-header mb-0 pb-0 border-none flex items-center gap-2">
                    <span>📡</span>
                    <span>实时输出</span>
                </h2>
            </div>

            <div
                ref={containerRef}
                className="flex-1 overflow-auto p-4 space-y-2"
            >
                {logs.length === 0 ? (
                    <div className="text-center text-[var(--text-muted)] py-8">
                        <p className="text-sm">等待任务开始...</p>
                        <p className="text-xs mt-2">输入研究问题以开始</p>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div
                            key={log.id}
                            className="text-sm border-l-2 pl-3 py-1"
                            style={{
                                borderColor: log.level === 'error' ? 'var(--status-error)' :
                                    log.level === 'success' ? 'var(--status-success)' :
                                        log.level === 'debug' ? 'var(--text-muted)' : 'var(--accent)'
                            }}
                        >
                            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                <span>{formatTime(log.timestamp)}</span>
                                <span className="text-[var(--accent)] font-medium">{log.agent}</span>
                            </div>
                            <p className="text-[var(--text-secondary)] mt-1">{log.message}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
