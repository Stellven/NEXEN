'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    MessageSquare,
    Search,
    BookOpen,
    Image,
    Edit3,
    BarChart3,
    FileText,
    Grid3X3,
    Users,
    Package,
    Settings,
    ChevronLeft,
    GitBranch,
} from 'lucide-react';

// Navigation items configuration
const navigationItems = [
    {
        id: 'ai-ask',
        label: 'AI Ask',
        labelCn: 'AI 问答',
        href: '/ai-ask',
        icon: MessageSquare,
    },
    {
        section: 'Knowledge Base',
        sectionCn: '知识库',
        items: [
            {
                id: 'explore',
                label: 'AI Explore',
                labelCn: 'AI 探索',
                href: '/explore',
                icon: Search,
            },
            {
                id: 'library',
                label: 'My Library',
                labelCn: '我的文库',
                href: '/library',
                icon: BookOpen,
            },
            {
                id: 'workflows',
                label: 'Agent Workflows',
                labelCn: 'Agent 工作流',
                href: '/library/workflows',
                icon: GitBranch,
            },
        ],
    },
    {
        section: 'AI Teams',
        sectionCn: 'AI 团队',
        items: [
            {
                id: 'ai-image',
                label: 'AI Image',
                labelCn: 'AI 图像',
                href: '/ai-image',
                icon: Image,
            },
            {
                id: 'ai-writing',
                label: 'AI Writing',
                labelCn: 'AI 写作',
                href: '/ai-writing',
                icon: Edit3,
            },
            {
                id: 'ai-research',
                label: 'AI Research',
                labelCn: 'AI 研究',
                href: '/ai-research',
                icon: BarChart3,
            },
            {
                id: 'ai-office',
                label: 'AI Reports',
                labelCn: 'AI 报告',
                href: '/ai-office',
                icon: FileText,
            },
            {
                id: 'ai-simulation',
                label: 'AI Decision',
                labelCn: 'AI 决策',
                href: '/ai-simulation',
                icon: Grid3X3,
            },
            {
                id: 'ai-teams',
                label: 'Research Team',
                labelCn: '研究团队',
                href: '/ai-teams',
                icon: Users,
            },
        ],
    },
    {
        section: 'AI Tools',
        sectionCn: 'AI 工具',
        items: [
            {
                id: 'ai-store',
                label: 'AI Tools',
                labelCn: 'AI 工具库',
                href: '/ai-store',
                icon: Package,
            },
        ],
    },
];

interface SidebarProps {
    isCollapsed?: boolean;
    onCollapse?: (collapsed: boolean) => void;
}

export function Sidebar({ isCollapsed = false, onCollapse }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(isCollapsed);

    const handleCollapse = () => {
        const newState = !collapsed;
        setCollapsed(newState);
        onCollapse?.(newState);
    };

    const isActive = (href: string) => {
        if (href === '/ai-ask') {
            return pathname === '/' || pathname === '/ai-ask' || pathname.startsWith('/ai-ask/');
        }
        return pathname === href || pathname.startsWith(href + '/');
    };

    return (
        <aside
            className={`relative hidden flex-col border-r border-gray-200 bg-white transition-all duration-300 md:flex ${
                collapsed ? 'w-16' : 'w-52'
            }`}
        >
            {/* Collapse Button */}
            <button
                onClick={handleCollapse}
                className="group absolute -right-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 shadow-sm ring-1 ring-gray-200/50 transition-all duration-200 hover:shadow-md hover:ring-blue-300/50"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                <ChevronLeft
                    className={`h-4 w-4 text-gray-600 transition-all duration-200 group-hover:text-blue-600 ${
                        collapsed ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {/* Logo */}
            <div className={`flex items-center p-4 ${collapsed ? 'justify-center' : ''}`}>
                <Link href="/" className="group relative flex items-center gap-2.5" title="NEXEN">
                    <svg className="h-8 w-8 flex-shrink-0" viewBox="0 0 32 32" fill="none">
                        <defs>
                            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#0F2A46" />
                                <stop offset="40%" stopColor="#2BB7DA" />
                                <stop offset="100%" stopColor="#7C5BFE" />
                            </linearGradient>
                        </defs>
                        <circle cx="16" cy="16" r="10" stroke="url(#logoGradient)" strokeWidth="2" fill="none" />
                        <circle cx="16" cy="6" r="3" fill="#0F2A46" />
                        <circle cx="26" cy="16" r="3" fill="#2BB7DA" />
                        <circle cx="16" cy="26" r="3" fill="#7C5BFE" />
                        <circle cx="6" cy="16" r="3" fill="#2BB7DA" />
                        <circle cx="16" cy="16" r="3" fill="url(#logoGradient)" />
                    </svg>
                    {!collapsed && (
                        <div className="flex flex-col leading-none">
                            <div className="flex items-center gap-1">
                                <span className="bg-gradient-to-r from-[#0F2A46] via-[#2BB7DA] to-[#7C5BFE] bg-clip-text text-[15px] font-bold tracking-tight text-transparent">
                                    NEXEN
                                </span>
                                <span className="rounded bg-gradient-to-r from-amber-500 to-orange-500 px-1 py-0.5 text-[7px] font-bold text-white">
                                    Beta
                                </span>
                            </div>
                            <span className="text-[9px] font-medium tracking-[0.15em] text-gray-400">
                                AI TEAMS
                            </span>
                        </div>
                    )}
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-2">
                <div className="space-y-1">
                    {navigationItems.map((item, index) => {
                        // Single item (AI Ask)
                        if ('href' in item && item.href) {
                            const Icon = item.icon;
                            const href = item.href as string;
                            return (
                                <Link
                                    key={item.id}
                                    href={href}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                        isActive(href)
                                            ? 'bg-violet-50 text-gray-900'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    } ${collapsed ? 'justify-center' : ''}`}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <Icon className="h-5 w-5 flex-shrink-0" />
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            );
                        }

                        // Section with items
                        if (!('items' in item) || !item.items) return null;
                        return (
                            <div key={index}>
                                {!collapsed && (
                                    <div className="px-3 pb-0.5 pt-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                        {item.section}
                                    </div>
                                )}
                                {collapsed && <div className="my-2 border-t border-gray-100" />}
                                {item.items.map((subItem) => {
                                    const Icon = subItem.icon;
                                    return (
                                        <Link
                                            key={subItem.id}
                                            href={subItem.href}
                                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                                isActive(subItem.href)
                                                    ? 'bg-violet-50 text-gray-900'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                            } ${collapsed ? 'justify-center' : ''}`}
                                            title={collapsed ? subItem.label : undefined}
                                        >
                                            <Icon className="h-5 w-5 flex-shrink-0" />
                                            {!collapsed && <span>{subItem.label}</span>}
                                        </Link>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </nav>

            {/* Bottom Section */}
            <div className="border-t border-gray-200 p-3">
                <Link
                    href="/settings"
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 ${
                        collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'Settings' : undefined}
                >
                    <Settings className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>Settings</span>}
                </Link>
            </div>
        </aside>
    );
}

export default Sidebar;
