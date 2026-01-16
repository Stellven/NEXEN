'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface WorkbenchLayoutProps {
    children?: ReactNode;
}

export function WorkbenchLayout({ children }: WorkbenchLayoutProps) {
    const router = useRouter();
    const [terminalExpanded, setTerminalExpanded] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Load user from localStorage
    if (typeof window !== 'undefined' && !user) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                setUser(JSON.parse(userStr));
            } catch { }
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    return (
        <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
            {/* Header */}
            <header className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 bg-[var(--bg-primary)]">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                            <span className="text-white font-bold text-sm">N</span>
                        </div>
                        <span className="font-semibold text-lg">NEXEN</span>
                    </Link>
                    <span className="text-[var(--text-muted)] text-sm">Research Workbench</span>
                </div>

                <div className="flex items-center gap-3">
                    {user ? (
                        <>
                            <Link href="/settings" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                设置
                            </Link>
                            <div className="w-px h-4 bg-[var(--border)]" />
                            <span className="text-sm font-medium">{user.display_name}</span>
                            <button
                                onClick={handleLogout}
                                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                                退出
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className="btn-primary text-sm py-2 px-4">
                            登录
                        </Link>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {children}
            </div>

            {/* Terminal Panel */}
            <div className={`terminal border-t border-gray-700 transition-all duration-300 ${terminalExpanded ? 'h-64' : 'h-10'}`}>
                <button
                    onClick={() => setTerminalExpanded(!terminalExpanded)}
                    className="w-full h-10 px-4 flex items-center gap-2 text-sm hover:bg-gray-800 transition-colors"
                >
                    <span className="text-gray-400">▶</span>
                    <span className="font-medium">Terminal</span>
                    <span className="text-gray-500 text-xs ml-2">系统日志和输出</span>
                    <span className="ml-auto text-gray-500 text-xs">{terminalExpanded ? '收起' : '展开'}</span>
                </button>

                {terminalExpanded && (
                    <div className="h-[calc(100%-40px)] overflow-auto p-4 terminal-scroll">
                        <div className="log-entry">
                            <span className="log-time">11:35:02</span>
                            <span className="log-agent">[Meta-Coordinator]</span>
                            <span className="log-info">系统就绪，等待研究任务...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
