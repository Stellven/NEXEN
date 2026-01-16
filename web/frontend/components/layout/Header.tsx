'use client';

import Link from 'next/link';
import { Brain, Sparkles, Settings, LogOut, User } from 'lucide-react';
import { useCurrentUser } from '@/components/auth/AuthGuard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function Header() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                setUser(JSON.parse(userStr));
            } catch {
                setUser(null);
            }
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    return (
        <header className="h-14 border-b border-dark-border bg-dark-card flex items-center justify-between px-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
                <Link href="/" className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-nexen-500 to-purple-600 rounded-lg">
                        <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold gradient-text">NEXEN</h1>
                    </div>
                </Link>
                <span className="text-xs text-dark-muted bg-dark-bg px-2 py-0.5 rounded-full">
                    v0.2.0
                </span>
            </div>

            {/* Center - Session Info */}
            <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-nexen-400" />
                <span className="text-dark-muted">多Agent研究助手</span>
            </div>

            {/* Right - User Menu */}
            <div className="flex items-center gap-2 relative">
                {user ? (
                    <>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-dark-bg rounded-lg transition-colors"
                        >
                            <div className="w-7 h-7 rounded-full bg-nexen-500/20 flex items-center justify-center">
                                <User className="w-4 h-4 text-nexen-400" />
                            </div>
                            <span className="text-sm font-medium">{user.display_name}</span>
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-dark-card border border-dark-border rounded-lg shadow-xl z-50">
                                <Link
                                    href="/settings"
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-dark-bg text-sm"
                                    onClick={() => setShowMenu(false)}
                                >
                                    <Settings className="w-4 h-4" />
                                    账户设置
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-dark-bg text-sm text-red-400"
                                >
                                    <LogOut className="w-4 h-4" />
                                    退出登录
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <Link
                        href="/login"
                        className="px-4 py-1.5 bg-nexen-500 hover:bg-nexen-600 rounded-lg text-sm font-medium transition-colors"
                    >
                        登录
                    </Link>
                )}
            </div>
        </header>
    );
}
