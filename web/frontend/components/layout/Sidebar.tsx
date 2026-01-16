'use client';

import {
    MessageSquare,
    Users,
    BookOpen,
    FolderOpen,
    Clock,
    Plus
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
    activeTab: 'research' | 'agents' | 'knowledge';
    onTabChange: (tab: 'research' | 'agents' | 'knowledge') => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const tabs = [
        { id: 'research' as const, icon: MessageSquare, label: '研究' },
        { id: 'agents' as const, icon: Users, label: 'Agents' },
        { id: 'knowledge' as const, icon: BookOpen, label: '知识库' },
    ];

    return (
        <aside className="w-16 bg-dark-card border-r border-dark-border flex flex-col items-center py-4">
            {/* Main Tabs */}
            <nav className="flex flex-col gap-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={clsx(
                                'p-3 rounded-lg transition-all group relative',
                                activeTab === tab.id
                                    ? 'bg-nexen-500/20 text-nexen-400'
                                    : 'text-dark-muted hover:text-white hover:bg-dark-bg'
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            {/* Tooltip */}
                            <span className="absolute left-full ml-2 px-2 py-1 bg-dark-bg text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </nav>

            {/* Divider */}
            <div className="w-8 h-px bg-dark-border my-4" />

            {/* Quick Actions */}
            <div className="flex flex-col gap-2">
                <button className="p-3 rounded-lg text-dark-muted hover:text-white hover:bg-dark-bg transition-all group relative">
                    <FolderOpen className="w-5 h-5" />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-dark-bg text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                        会话
                    </span>
                </button>
                <button className="p-3 rounded-lg text-dark-muted hover:text-white hover:bg-dark-bg transition-all group relative">
                    <Clock className="w-5 h-5" />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-dark-bg text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                        历史
                    </span>
                </button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* New Session */}
            <button className="p-3 rounded-lg bg-nexen-500 hover:bg-nexen-600 text-white transition-all group relative">
                <Plus className="w-5 h-5" />
                <span className="absolute left-full ml-2 px-2 py-1 bg-dark-bg text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                    新会话
                </span>
            </button>
        </aside>
    );
}
