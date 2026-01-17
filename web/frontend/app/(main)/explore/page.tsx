'use client';

import { useState, useEffect } from 'react';
import {
    Search,
    FileText,
    Tag,
    Calendar,
    X,
    Clock,
    Filter,
    ChevronDown,
    Loader2,
    AlertCircle,
} from 'lucide-react';

interface SearchResult {
    id: string;
    document_id: string;
    title: string;
    snippet: string;
    score: number;
    source: string;
    tags: string[];
    created_at: string;
}

interface SearchHistory {
    id: string;
    query: string;
    results_count: number;
    created_at: string;
}

interface TagItem {
    name: string;
    count: number;
}

export default function ExplorePage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [queryTime, setQueryTime] = useState<number | null>(null);

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [availableTags, setAvailableTags] = useState<TagItem[]>([]);

    // History
    const [history, setHistory] = useState<SearchHistory[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // Preview
    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    const getToken = () => localStorage.getItem('token');

    // Fetch tags and history on mount
    useEffect(() => {
        fetchTags();
        fetchHistory();
    }, []);

    const fetchTags = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch('/api/explore/tags', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setAvailableTags(data.tags);
            }
        } catch (err) {
            console.error('Failed to fetch tags:', err);
        }
    };

    const fetchHistory = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch('/api/explore/history?limit=10', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setHistory(data.history);
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };

    const handleSearch = async (searchQuery?: string) => {
        const q = searchQuery || query;
        if (!q.trim()) return;

        const token = getToken();
        if (!token) return;

        setIsSearching(true);
        setError(null);
        setResults([]);
        setQueryTime(null);

        try {
            const response = await fetch('/api/explore/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: q,
                    limit: 20,
                    offset: 0,
                    filters: {
                        source: selectedSources.length > 0 ? selectedSources : null,
                        tags: selectedTags.length > 0 ? selectedTags : null,
                    },
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || '搜索失败');
            }

            const data = await response.json();
            setResults(data.results);
            setQueryTime(data.query_time_ms);
            fetchHistory(); // Refresh history
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : '搜索失败，请重试';
            setError(errorMessage);
        } finally {
            setIsSearching(false);
        }
    };

    const handleHistoryClick = (historyQuery: string) => {
        setQuery(historyQuery);
        setShowHistory(false);
        handleSearch(historyQuery);
    };

    const deleteHistory = async (historyId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const token = getToken();
        if (!token) return;

        try {
            await fetch(`/api/explore/history/${historyId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setHistory(history.filter((h) => h.id !== historyId));
        } catch (err) {
            console.error('Failed to delete history:', err);
        }
    };

    const handlePreview = async (documentId: string) => {
        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch(`/api/explore/preview/${documentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setPreviewTitle(data.title);
                setPreviewContent(data.content);
                setShowPreview(true);
            }
        } catch (err) {
            console.error('Failed to fetch preview:', err);
        }
    };

    const toggleSource = (source: string) => {
        setSelectedSources((prev) =>
            prev.includes(source)
                ? prev.filter((s) => s !== source)
                : [...prev, source]
        );
    };

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    return (
        <div className="flex h-full flex-col">
            {/* 搜索头部 */}
            <div className="border-b border-gray-200 bg-white px-6 py-8">
                <div className="mx-auto max-w-3xl">
                    <h1 className="mb-2 text-2xl font-bold text-gray-900">AI Explore</h1>
                    <p className="mb-6 text-gray-500">语义搜索您的知识库，发现相关内容</p>

                    {/* 搜索框 */}
                    <div className="relative">
                        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                            <Search className="h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                onFocus={() => setShowHistory(true)}
                                onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                                placeholder="输入关键词或问题进行语义搜索..."
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                            />
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-sm ${
                                    showFilters || selectedSources.length > 0 || selectedTags.length > 0
                                        ? 'bg-blue-100 text-blue-600'
                                        : 'text-gray-500 hover:bg-gray-100'
                                }`}
                            >
                                <Filter className="h-4 w-4" />
                                筛选
                            </button>
                            <button
                                onClick={() => handleSearch()}
                                disabled={!query.trim() || isSearching}
                                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:bg-gray-300"
                            >
                                {isSearching ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    '搜索'
                                )}
                            </button>
                        </div>

                        {/* 搜索历史下拉 */}
                        {showHistory && history.length > 0 && (
                            <div className="absolute left-0 top-full z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                                <div className="mb-1 flex items-center justify-between px-3">
                                    <span className="text-xs font-medium text-gray-500">搜索历史</span>
                                </div>
                                {history.map((h) => (
                                    <div
                                        key={h.id}
                                        onClick={() => handleHistoryClick(h.query)}
                                        className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-gray-50"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-gray-400" />
                                            <span className="text-sm text-gray-700">{h.query}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400">
                                                {h.results_count} 结果
                                            </span>
                                            <button
                                                onClick={(e) => deleteHistory(h.id, e)}
                                                className="rounded p-1 hover:bg-gray-200"
                                            >
                                                <X className="h-3 w-3 text-gray-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 筛选器 */}
                    {showFilters && (
                        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-4">
                                <h3 className="mb-2 text-sm font-medium text-gray-700">来源</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['library', 'url'].map((source) => (
                                        <button
                                            key={source}
                                            onClick={() => toggleSource(source)}
                                            className={`rounded-full px-3 py-1 text-sm ${
                                                selectedSources.includes(source)
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            {source === 'library' ? '文档库' : 'URL 导入'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {availableTags.length > 0 && (
                                <div>
                                    <h3 className="mb-2 text-sm font-medium text-gray-700">标签</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {availableTags.slice(0, 10).map((tag) => (
                                            <button
                                                key={tag.name}
                                                onClick={() => toggleTag(tag.name)}
                                                className={`rounded-full px-3 py-1 text-sm ${
                                                    selectedTags.includes(tag.name)
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                {tag.name} ({tag.count})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 搜索结果 */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="mx-auto max-w-3xl">
                    {error && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-red-700">
                            <AlertCircle className="h-5 w-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {results.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-500">
                                    找到 {results.length} 个相关结果
                                </p>
                                {queryTime !== null && (
                                    <p className="text-xs text-gray-400">
                                        搜索耗时 {queryTime}ms
                                    </p>
                                )}
                            </div>
                            {results.map((result) => (
                                <div
                                    key={result.id}
                                    onClick={() => handlePreview(result.document_id)}
                                    className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-blue-200 hover:shadow-md"
                                >
                                    <div className="mb-2 flex items-start justify-between">
                                        <h3 className="font-semibold text-gray-900">
                                            {result.title}
                                        </h3>
                                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                            {Math.round(result.score * 100)}% 匹配
                                        </span>
                                    </div>
                                    <p className="mb-3 text-sm text-gray-600">{result.snippet}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <FileText className="h-3.5 w-3.5" />
                                            {result.source === 'library' ? '文档库' : 'URL'}
                                        </span>
                                        {result.created_at && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {new Date(result.created_at).toLocaleDateString()}
                                            </span>
                                        )}
                                        {result.tags.length > 0 && (
                                            <div className="flex items-center gap-1">
                                                <Tag className="h-3.5 w-3.5" />
                                                {result.tags.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !isSearching && query.trim() === '' ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                                <Search className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="mb-2 font-medium text-gray-700">
                                开始探索您的知识库
                            </h3>
                            <p className="text-sm text-gray-500">
                                输入关键词或问题，AI 将帮您找到最相关的内容
                            </p>
                            <p className="mt-4 text-xs text-gray-400">
                                提示: 先在「My Library」中上传文档，才能进行搜索
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* 文档预览侧边栏 */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
                    <div
                        className="absolute inset-0"
                        onClick={() => setShowPreview(false)}
                    />
                    <div className="relative w-full max-w-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h2 className="font-semibold text-gray-900">{previewTitle}</h2>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="rounded p-1 hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="h-[calc(100vh-65px)] overflow-y-auto p-6">
                            <pre className="whitespace-pre-wrap text-sm text-gray-700">
                                {previewContent || '无内容'}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
