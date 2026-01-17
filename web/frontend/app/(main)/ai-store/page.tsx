'use client';

import { useState } from 'react';
import {
    Package,
    Search,
    Download,
    Check,
    Star,
    ExternalLink,
    Settings,
    Trash2,
} from 'lucide-react';

interface Tool {
    id: string;
    name: string;
    description: string;
    category: string;
    rating: number;
    downloads: number;
    installed: boolean;
    icon: string;
}

export default function AIToolsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'store' | 'installed'>('store');
    const [tools, setTools] = useState<Tool[]>([
        {
            id: '1',
            name: 'PDF 解析器',
            description: '高级 PDF 文档解析和提取工具',
            category: '文档处理',
            rating: 4.8,
            downloads: 12500,
            installed: true,
            icon: '📄',
        },
        {
            id: '2',
            name: '代码分析器',
            description: '智能代码审查和优化建议',
            category: '开发工具',
            rating: 4.6,
            downloads: 8300,
            installed: true,
            icon: '💻',
        },
        {
            id: '3',
            name: '数据可视化',
            description: '自动生成数据图表和报告',
            category: '数据分析',
            rating: 4.7,
            downloads: 15200,
            installed: false,
            icon: '📊',
        },
        {
            id: '4',
            name: '网页抓取器',
            description: '智能网页内容提取和整理',
            category: '数据采集',
            rating: 4.5,
            downloads: 9800,
            installed: false,
            icon: '🌐',
        },
        {
            id: '5',
            name: '语音转文字',
            description: '高精度语音识别和转录',
            category: '多媒体',
            rating: 4.9,
            downloads: 20100,
            installed: false,
            icon: '🎤',
        },
        {
            id: '6',
            name: 'API 连接器',
            description: '快速集成第三方 API 服务',
            category: '开发工具',
            rating: 4.4,
            downloads: 6700,
            installed: false,
            icon: '🔌',
        },
    ]);

    const categories = ['全部', '文档处理', '开发工具', '数据分析', '数据采集', '多媒体'];
    const [selectedCategory, setSelectedCategory] = useState('全部');

    const filteredTools = tools.filter((tool) => {
        const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === '全部' || tool.category === selectedCategory;
        const matchesTab = activeTab === 'store' ? true : tool.installed;
        return matchesSearch && matchesCategory && matchesTab;
    });

    const toggleInstall = (toolId: string) => {
        setTools((prev) =>
            prev.map((t) => (t.id === toolId ? { ...t, installed: !t.installed } : t))
        );
    };

    return (
        <div className="flex h-full flex-col">
            {/* 头部 */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">AI Tools</h1>
                        <p className="text-sm text-gray-500">扩展您的 AI 工具箱</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('store')}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'store'
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            工具商店
                        </button>
                        <button
                            onClick={() => setActiveTab('installed')}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'installed'
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            已安装 ({tools.filter((t) => t.installed).length})
                        </button>
                    </div>
                </div>
            </div>

            {/* 搜索和筛选 */}
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索工具..."
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                                    selectedCategory === category
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 工具列表 */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTools.map((tool) => (
                        <div
                            key={tool.id}
                            className="rounded-xl border border-gray-200 bg-white p-5 transition-all hover:shadow-md"
                        >
                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-2xl">
                                        {tool.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                                        <span className="text-xs text-gray-500">{tool.category}</span>
                                    </div>
                                </div>
                                {tool.installed && (
                                    <button className="rounded p-1 hover:bg-gray-100">
                                        <Settings className="h-4 w-4 text-gray-400" />
                                    </button>
                                )}
                            </div>
                            <p className="mb-4 text-sm text-gray-600">{tool.description}</p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                        {tool.rating}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Download className="h-3.5 w-3.5" />
                                        {(tool.downloads / 1000).toFixed(1)}k
                                    </span>
                                </div>
                                <button
                                    onClick={() => toggleInstall(tool.id)}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                        tool.installed
                                            ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                >
                                    {tool.installed ? (
                                        <>
                                            <Check className="h-3.5 w-3.5" />
                                            已安装
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-3.5 w-3.5" />
                                            安装
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredTools.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Package className="mb-4 h-12 w-12 text-gray-300" />
                        <p className="text-gray-500">没有找到匹配的工具</p>
                        <p className="text-sm text-gray-400">尝试调整搜索条件</p>
                    </div>
                )}
            </div>
        </div>
    );
}
