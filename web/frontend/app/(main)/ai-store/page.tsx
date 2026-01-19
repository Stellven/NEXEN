'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Package,
    Search,
    Download,
    Check,
    Settings,
    Trash2,
    Power,
    X,
} from 'lucide-react';
import { storeApi, CatalogTool, InstalledTool, ToolCategory, ToolConfigOption } from '@/lib/api';

// Category icon mapping
const categoryIcons: Record<string, string> = {
    databases: '🗄️',
    bioinformatics: '🧬',
    cheminformatics: '⚗️',
    clinical: '🏥',
    machine_learning: '🤖',
    data_analysis: '📈',
    visualization: '📊',
    methodology: '📐',
    literature: '📚',
    communication: '💬',
};

interface ConfigModalProps {
    tool: InstalledTool | CatalogTool | null;
    onClose: () => void;
    onSave: (config: Record<string, unknown>) => void;
}

function ConfigModal({ tool, onClose, onSave }: ConfigModalProps) {
    const [config, setConfig] = useState<Record<string, unknown>>({});

    useEffect(() => {
        if (tool) {
            const initialConfig = 'user_config' in tool && tool.user_config
                ? tool.user_config
                : ('config' in tool ? tool.config : {});

            // Merge with defaults from schema
            const merged: Record<string, unknown> = {};
            for (const [key, schema] of Object.entries(tool.config_schema)) {
                merged[key] = initialConfig?.[key] ?? schema.default;
            }
            setConfig(merged);
        }
    }, [tool]);

    if (!tool) return null;

    const handleChange = (key: string, value: unknown) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const toolName = 'name' in tool ? tool.name : tool.tool_name;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{tool.icon}</span>
                        <div>
                            <h3 className="font-semibold text-gray-900">{toolName}</h3>
                            <p className="text-sm text-gray-500">Configuration</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {Object.keys(tool.config_schema).length === 0 ? (
                    <p className="py-8 text-center text-gray-500">This tool has no configurable options.</p>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(tool.config_schema).map(([key, schema]: [string, ToolConfigOption]) => (
                            <div key={key}>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </label>
                                {schema.type === 'boolean' ? (
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(config[key])}
                                            onChange={(e) => handleChange(key, e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <span className="text-sm text-gray-600">Enabled</span>
                                    </label>
                                ) : schema.options ? (
                                    <select
                                        value={String(config[key] ?? '')}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                    >
                                        {schema.options.map((opt: string) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : schema.type === 'number' ? (
                                    <input
                                        type="number"
                                        value={Number(config[key]) || ''}
                                        min={schema.min}
                                        max={schema.max}
                                        onChange={(e) => handleChange(key, parseInt(e.target.value))}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={String(config[key] ?? '')}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    {Object.keys(tool.config_schema).length > 0 && (
                        <button
                            onClick={() => onSave(config)}
                            className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
                        >
                            Save Configuration
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AIStorePage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'store' | 'installed'>('store');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [categories, setCategories] = useState<ToolCategory[]>([]);
    const [catalogTools, setCatalogTools] = useState<CatalogTool[]>([]);
    const [installedTools, setInstalledTools] = useState<InstalledTool[]>([]);
    const [loading, setLoading] = useState(true);
    const [configTool, setConfigTool] = useState<InstalledTool | CatalogTool | null>(null);

    // Fetch categories
    useEffect(() => {
        storeApi.getCategories().then(res => {
            setCategories(res.categories);
        }).catch(err => {
            console.error('Failed to fetch categories:', err);
        });
    }, []);

    // Fetch catalog or installed tools based on active tab
    const fetchTools = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'store') {
                const params: { category?: string; search?: string } = {};
                if (selectedCategory !== 'all') params.category = selectedCategory;
                if (searchQuery) params.search = searchQuery;
                const res = await storeApi.getCatalog(params);
                setCatalogTools(res.tools);
            } else {
                const res = await storeApi.getInstalledTools();
                setInstalledTools(res.tools);
            }
        } catch (error) {
            console.error('Failed to fetch tools:', error);
        } finally {
            setLoading(false);
        }
    }, [activeTab, selectedCategory, searchQuery]);

    useEffect(() => {
        fetchTools();
    }, [fetchTools]);

    // Install tool
    const handleInstall = async (toolId: string) => {
        try {
            await storeApi.installTool(toolId);
            fetchTools();
        } catch (error) {
            console.error('Failed to install tool:', error);
        }
    };

    // Uninstall tool
    const handleUninstall = async (toolId: string) => {
        if (!confirm('Are you sure you want to uninstall this tool?')) return;
        try {
            await storeApi.uninstallTool(toolId);
            fetchTools();
        } catch (error) {
            console.error('Failed to uninstall tool:', error);
        }
    };

    // Toggle tool enabled state
    const handleToggle = async (toolId: string) => {
        try {
            await storeApi.toggleTool(toolId);
            fetchTools();
        } catch (error) {
            console.error('Failed to toggle tool:', error);
        }
    };

    // Save configuration
    const handleSaveConfig = async (config: Record<string, unknown>) => {
        if (!configTool) return;
        try {
            const toolId = configTool.tool_id;
            await storeApi.updateInstalledTool(toolId, { config });
            setConfigTool(null);
            fetchTools();
        } catch (error) {
            console.error('Failed to save config:', error);
        }
    };

    // Filter installed tools by search
    const filteredInstalledTools = installedTools.filter(tool => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return tool.tool_name.toLowerCase().includes(query) ||
            tool.description.toLowerCase().includes(query);
    });

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">AI Tools</h1>
                        <p className="text-sm text-gray-500">Extend your AI capabilities with specialized tools</p>
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
                            Tool Store
                        </button>
                        <button
                            onClick={() => setActiveTab('installed')}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'installed'
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            Installed ({installedTools.length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search tools..."
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                        />
                    </div>
                    {activeTab === 'store' && (
                        <div className="flex items-center gap-2 overflow-x-auto">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors ${
                                    selectedCategory === 'all'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                All
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors ${
                                        selectedCategory === cat.id
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <span>{cat.icon}</span>
                                    <span>{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Tool Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                    </div>
                ) : activeTab === 'store' ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {catalogTools.map((tool) => (
                            <div
                                key={tool.tool_id}
                                className="rounded-xl border border-gray-200 bg-white p-5 transition-all hover:shadow-md"
                            >
                                <div className="mb-4 flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-2xl">
                                            {tool.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                                            <span className="flex items-center gap-1 text-xs text-gray-500">
                                                <span>{categoryIcons[tool.category] || '📦'}</span>
                                                {tool.category.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    {tool.is_installed && (
                                        <button
                                            onClick={() => setConfigTool(tool)}
                                            className="rounded p-1 hover:bg-gray-100"
                                        >
                                            <Settings className="h-4 w-4 text-gray-400" />
                                        </button>
                                    )}
                                </div>
                                <p className="mb-3 text-sm text-gray-600">{tool.description}</p>
                                <div className="mb-4 flex flex-wrap gap-1">
                                    {tool.features.slice(0, 3).map((feature, i) => (
                                        <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                            {feature}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">v{tool.version} by {tool.author}</span>
                                    <button
                                        onClick={() => tool.is_installed ? handleUninstall(tool.tool_id) : handleInstall(tool.tool_id)}
                                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                            tool.is_installed
                                                ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                        }`}
                                    >
                                        {tool.is_installed ? (
                                            <>
                                                <Check className="h-3.5 w-3.5" />
                                                Installed
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-3.5 w-3.5" />
                                                Install
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredInstalledTools.map((tool) => (
                            <div
                                key={tool.id}
                                className={`rounded-xl border bg-white p-5 transition-all hover:shadow-md ${
                                    tool.is_enabled ? 'border-gray-200' : 'border-gray-200 opacity-60'
                                }`}
                            >
                                <div className="mb-4 flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-2xl">
                                            {tool.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{tool.tool_name}</h3>
                                            <span className="flex items-center gap-1 text-xs text-gray-500">
                                                <span>{categoryIcons[tool.category] || '📦'}</span>
                                                {tool.category.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setConfigTool(tool)}
                                            className="rounded p-1 hover:bg-gray-100"
                                            title="Configure"
                                        >
                                            <Settings className="h-4 w-4 text-gray-400" />
                                        </button>
                                        <button
                                            onClick={() => handleToggle(tool.tool_id)}
                                            className={`rounded p-1 hover:bg-gray-100 ${
                                                tool.is_enabled ? 'text-green-500' : 'text-gray-400'
                                            }`}
                                            title={tool.is_enabled ? 'Disable' : 'Enable'}
                                        >
                                            <Power className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <p className="mb-3 text-sm text-gray-600">{tool.description}</p>
                                <div className="flex items-center justify-between text-xs text-gray-400">
                                    <span>Used {tool.usage_count} times</span>
                                    <button
                                        onClick={() => handleUninstall(tool.tool_id)}
                                        className="flex items-center gap-1 text-red-500 hover:text-red-600"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Uninstall
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && ((activeTab === 'store' && catalogTools.length === 0) ||
                    (activeTab === 'installed' && filteredInstalledTools.length === 0)) && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Package className="mb-4 h-12 w-12 text-gray-300" />
                        <p className="text-gray-500">
                            {activeTab === 'store' ? 'No tools found' : 'No installed tools'}
                        </p>
                        <p className="text-sm text-gray-400">
                            {activeTab === 'store' ? 'Try adjusting your search' : 'Browse the store to install tools'}
                        </p>
                    </div>
                )}
            </div>

            {/* Config Modal */}
            <ConfigModal
                tool={configTool}
                onClose={() => setConfigTool(null)}
                onSave={handleSaveConfig}
            />
        </div>
    );
}
