'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Send,
    Bot,
    User,
    Sparkles,
    Globe,
    BookOpen,
    Code,
    Image as ImageIcon,
    ChevronDown,
    Check,
    Loader2,
    FolderOpen,
    FileText,
    Microscope,
    X,
    Wand2,
    FileSpreadsheet,
    Presentation,
    FileType,
    Terminal,
    Square,
    CheckSquare,
} from 'lucide-react';
import { libraryApi, LibraryFolder, LibraryDocument } from '@/lib/api';
import { MODEL_PROVIDERS, DEFAULT_MODEL, ProviderGroup } from '@/lib/modelConfig';
import { useAIAskStore } from '@/lib/aiAskStore';

// =============================================================================
// Types & Constants
// =============================================================================

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

interface AnthropicSkill {
    name: string;
    display_name: string;
    description: string;
    category: string;
    has_scripts: boolean;
}

interface LogEntry {
    id: string;
    timestamp: Date;
    type: 'info' | 'error' | 'request' | 'response' | 'system';
    title: string;
    content: string;
}

// Skill category icons and colors
const SKILL_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
    document: { icon: FileText, color: 'text-blue-500' },
    development: { icon: Code, color: 'text-green-500' },
    creative: { icon: Wand2, color: 'text-purple-500' },
    communication: { icon: Globe, color: 'text-orange-500' },
    productivity: { icon: FileSpreadsheet, color: 'text-cyan-500' },
    other: { icon: Sparkles, color: 'text-gray-500' },
};

// =============================================================================
// Main Component
// =============================================================================

export default function AIAskPage() {
    // Persistent State (from zustand store)
    const {
        conversationId,
        setConversationId,
        messages,
        setMessages,
        addMessage,
        clearMessages,
        selectedModel,
        setSelectedModel,
        webSearch,
        setWebSearch,
        clearConversation,
    } = useAIAskStore();

    // Local Conversation State
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'done' | 'error' | 'no_key'>('idle');
    const [searchResultsCount, setSearchResultsCount] = useState(0);

    // Configuration State
    const [selectedProvider, setSelectedProvider] = useState('openai');
    const [deepResearch, setDeepResearch] = useState(false);
    const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>([]);

    // Knowledge Base State
    const [folders, setFolders] = useState<LibraryFolder[]>([]);
    const [documents, setDocuments] = useState<LibraryDocument[]>([]);

    // Skills State
    const [skills, setSkills] = useState<AnthropicSkill[]>([]);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

    // UI State
    const [showModelSelector, setShowModelSelector] = useState(false);
    const [showKBSelector, setShowKBSelector] = useState(false);
    const [showSkillSelector, setShowSkillSelector] = useState(false);
    const [showLogPanel, setShowLogPanel] = useState(false);

    // Log State
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // =============================================================================
    // Log Utility
    // =============================================================================

    const addLog = useCallback((type: LogEntry['type'], title: string, content: string) => {
        const entry: LogEntry = {
            id: Date.now().toString(),
            timestamp: new Date(),
            type,
            title,
            content,
        };
        setLogs((prev) => [...prev.slice(-99), entry]); // Keep last 100 logs
    }, []);

    // =============================================================================
    // Data Fetching
    // =============================================================================

    useEffect(() => {
        fetchKnowledgeBases();
        fetchSkills();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent]);

    const getToken = () => localStorage.getItem('token');

    const fetchKnowledgeBases = async () => {
        try {
            const [foldersRes, docsRes] = await Promise.all([
                libraryApi.getFolders(),
                libraryApi.getDocuments(),
            ]);
            setFolders(foldersRes);
            setDocuments(docsRes.documents);
        } catch (error) {
            console.error('Failed to fetch knowledge bases:', error);
        }
    };

    const fetchSkills = async () => {
        try {
            const token = getToken();
            if (!token) return;

            const response = await fetch('/api/skills/anthropic', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setSkills(data.skills || []);
            }
        } catch (error) {
            console.error('Failed to fetch skills:', error);
        }
    };

    const toggleSkill = (skillName: string) => {
        setSelectedSkills((prev) =>
            prev.includes(skillName) ? prev.filter((s) => s !== skillName) : [...prev, skillName]
        );
    };

    // =============================================================================
    // Handlers
    // =============================================================================

    const handleProviderModelChange = (providerId: string, modelId: string) => {
        setSelectedProvider(providerId);
        setSelectedModel(modelId);
        setShowModelSelector(false);
    };

    const toggleKnowledgeBase = (kbId: string) => {
        setSelectedKnowledgeBases((prev) =>
            prev.includes(kbId) ? prev.filter((id) => id !== kbId) : [...prev, kbId]
        );
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const token = getToken();
        if (!token) {
            addLog('error', 'Auth Error', '未找到登录令牌，请重新登录');
            return;
        }

        let convId = conversationId;

        // Create new conversation if needed
        if (!convId) {
            try {
                addLog('system', 'Creating Conversation', '正在创建新对话...');
                const response = await fetch('/api/chat/conversations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ title: input.slice(0, 50) }),
                });
                if (response.ok) {
                    const newConv = await response.json();
                    setConversationId(newConv.id);
                    convId = newConv.id;
                    addLog('info', 'Conversation Created', `ID: ${newConv.id}`);
                } else {
                    const errorText = await response.text();
                    addLog('error', `Create Conversation Failed (${response.status})`, errorText);
                    return;
                }
            } catch (error) {
                console.error('Failed to create conversation:', error);
                addLog('error', 'Create Conversation Failed', String(error));
                return;
            }
        }

        // Add user message to UI immediately
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            created_at: new Date().toISOString(),
        };
        addMessage(userMessage);
        setInput('');
        setIsLoading(true);
        setStreamingContent('');
        setSearchStatus('idle');
        setSearchResultsCount(0);

        try {
            const features: string[] = [];
            if (webSearch) features.push('web_search');
            if (deepResearch) features.push('deep_research');

            const requestPayload = {
                content: userMessage.content,
                model: selectedModel,
                features,
                knowledge_bases: selectedKnowledgeBases,
                skills: selectedSkills,
            };

            // Log the request
            addLog('request', `Request → ${selectedModel}`, JSON.stringify(requestPayload, null, 2));

            const response = await fetch(`/api/chat/conversations/${convId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(requestPayload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                addLog('error', `HTTP ${response.status}`, errorText);
                throw new Error('Failed to send message');
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.search_status) {
                                    // Handle search status events
                                    setSearchStatus(data.search_status);
                                    if (data.results_count !== undefined) {
                                        setSearchResultsCount(data.results_count);
                                    }
                                    if (data.search_status === 'searching') {
                                        addLog('system', 'Web Search', '正在搜索网络...');
                                    } else if (data.search_status === 'done') {
                                        addLog('info', 'Search Complete', `找到 ${data.results_count} 条结果`);
                                    } else if (data.search_status === 'no_key') {
                                        addLog('error', 'Search Error', '未配置 Serper API Key');
                                    }
                                } else if (data.content) {
                                    fullContent += data.content;
                                    setStreamingContent(fullContent);
                                } else if (data.error) {
                                    addLog('error', 'API Error', data.error);
                                    const errorMessage: Message = {
                                        id: Date.now().toString(),
                                        role: 'assistant',
                                        content: `错误: ${data.error}`,
                                        created_at: new Date().toISOString(),
                                    };
                                    addMessage(errorMessage);
                                    setStreamingContent('');
                                    setIsLoading(false);
                                    return;
                                } else if (data.done) {
                                    addLog('response', 'Response Received', `Length: ${fullContent.length} chars${data.usage ? `, Tokens: ${data.usage.prompt_tokens}+${data.usage.completion_tokens}` : ''}`);
                                    const assistantMessage: Message = {
                                        id: data.message_id || Date.now().toString(),
                                        role: 'assistant',
                                        content: fullContent,
                                        created_at: new Date().toISOString(),
                                    };
                                    addMessage(assistantMessage);
                                    setStreamingContent('');
                                    setSearchStatus('idle');
                                }
                            } catch {
                                // Ignore parse errors
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            addLog('error', 'Send Failed', String(error));
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: '发送消息失败，请重试。',
                created_at: new Date().toISOString(),
            };
            addMessage(errorMessage);
        } finally {
            setIsLoading(false);
            setStreamingContent('');
        }
    };

    const currentProvider = MODEL_PROVIDERS.find((p) => p.id === selectedProvider);
    const currentModel = currentProvider?.models.find((m) => m.id === selectedModel);

    // =============================================================================
    // Render
    // =============================================================================

    return (
        <div className="flex h-full flex-col bg-gray-50">
            {/* 消息区域 */}
            <div className="flex-1 overflow-y-auto">
                {messages.length === 0 && !streamingContent ? (
                    /* 空状态 - 欢迎界面 */
                    <div className="flex h-full flex-col items-center justify-center p-6">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                            <Sparkles className="h-10 w-10 text-white" />
                        </div>
                        <h1 className="mb-2 text-2xl font-bold text-gray-900">NEXEN AI</h1>
                        <p className="mb-8 text-gray-500">有什么可以帮您？</p>

                        {/* 快速建议 */}
                        <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                            {[
                                '帮我分析最新的 AI 技术趋势',
                                '写一个 Python 数据处理脚本',
                                '解释量子计算的基本原理',
                                '帮我写一份项目提案',
                            ].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => setInput(suggestion)}
                                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* 消息列表 */
                    <div className="mx-auto max-w-3xl space-y-6 p-6">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'assistant' && (
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
                                        <Bot className="h-4 w-4 text-white" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                        msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800 shadow-sm'
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
                                        <User className="h-4 w-4 text-gray-600" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {streamingContent && (
                            <div className="flex gap-4">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
                                    <Bot className="h-4 w-4 text-white" />
                                </div>
                                <div className="max-w-[80%] rounded-2xl bg-white px-4 py-3 text-gray-800 shadow-sm">
                                    <p className="whitespace-pre-wrap text-sm">{streamingContent}</p>
                                </div>
                            </div>
                        )}
                        {isLoading && !streamingContent && (
                            <div className="flex gap-4">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
                                    <Bot className="h-4 w-4 text-white" />
                                </div>
                                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                                    {searchStatus === 'searching' ? (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Globe className="h-4 w-4 animate-pulse text-blue-500" />
                                            <span>正在联网搜索...</span>
                                        </div>
                                    ) : searchStatus === 'done' ? (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500" />
                                            <span>找到 {searchResultsCount} 条结果，正在生成回答...</span>
                                        </div>
                                    ) : searchStatus === 'no_key' ? (
                                        <div className="flex items-center gap-2 text-sm text-amber-600">
                                            <Globe className="h-4 w-4" />
                                            <span>未配置 Serper API Key，跳过联网搜索</span>
                                        </div>
                                    ) : (
                                        <div className="flex space-x-1">
                                            <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                                            <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.1s]" />
                                            <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* 输入区域 */}
            <div className="border-t border-gray-200 bg-white p-4">
                <div className="mx-auto max-w-3xl">
                    {/* 输入框 */}
                    <div className="mb-3 flex items-end gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                // Check if IME is composing (e.g., typing Chinese characters)
                                if (e.nativeEvent.isComposing || e.keyCode === 229) {
                                    return;
                                }
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="输入您的问题... (Shift+Enter 换行)"
                            className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-gray-400"
                            disabled={isLoading}
                            rows={1}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white transition-colors hover:bg-blue-600 disabled:bg-gray-300"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                    </div>

                    {/* 配置选项栏 */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* 模型选择器 */}
                        <div className="relative">
                            <button
                                onClick={() => setShowModelSelector(!showModelSelector)}
                                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                            >
                                <span>{currentProvider?.icon}</span>
                                <span className="font-medium">{currentModel?.name}</span>
                                {currentModel?.isNew && (
                                    <span className="rounded bg-green-100 px-1 text-xs text-green-700">New</span>
                                )}
                                {currentModel?.isPro && (
                                    <span className="rounded bg-purple-100 px-1 text-xs text-purple-700">Pro</span>
                                )}
                                <ChevronDown className="h-3 w-3 text-gray-400" />
                            </button>
                            {showModelSelector && (
                                <ModelSelector
                                    providers={MODEL_PROVIDERS}
                                    selectedModel={selectedModel}
                                    onSelect={handleProviderModelChange}
                                    onClose={() => setShowModelSelector(false)}
                                />
                            )}
                        </div>

                        <div className="h-4 w-px bg-gray-200" />

                        {/* 联网搜索 */}
                        <button
                            onClick={() => setWebSearch(!webSearch)}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all ${
                                webSearch
                                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Globe className={`h-4 w-4 ${webSearch ? 'text-blue-500' : ''}`} />
                            <span>联网</span>
                        </button>

                        {/* Deep Research */}
                        <button
                            onClick={() => setDeepResearch(!deepResearch)}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all ${
                                deepResearch
                                    ? 'border-purple-300 bg-purple-50 text-purple-700'
                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Microscope className={`h-4 w-4 ${deepResearch ? 'text-purple-500' : ''}`} />
                            <span>深度研究</span>
                        </button>

                        <div className="h-4 w-px bg-gray-200" />

                        {/* 本地知识库 */}
                        <div className="relative">
                            <button
                                onClick={() => setShowKBSelector(!showKBSelector)}
                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all ${
                                    selectedKnowledgeBases.length > 0
                                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <BookOpen className={`h-4 w-4 ${selectedKnowledgeBases.length > 0 ? 'text-amber-500' : ''}`} />
                                <span>知识库{selectedKnowledgeBases.length > 0 && ` (${selectedKnowledgeBases.length})`}</span>
                                <ChevronDown className="h-3 w-3" />
                            </button>
                            {showKBSelector && (
                                <KnowledgeBaseSelector
                                    folders={folders}
                                    documents={documents}
                                    selected={selectedKnowledgeBases}
                                    onToggle={toggleKnowledgeBase}
                                    onClose={() => setShowKBSelector(false)}
                                />
                            )}
                        </div>

                        <div className="h-4 w-px bg-gray-200" />

                        {/* Skills */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSkillSelector(!showSkillSelector)}
                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all ${
                                    selectedSkills.length > 0
                                        ? 'border-purple-300 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <Wand2 className={`h-4 w-4 ${selectedSkills.length > 0 ? 'text-purple-500' : ''}`} />
                                <span>技能{selectedSkills.length > 0 && ` (${selectedSkills.length})`}</span>
                                <ChevronDown className="h-3 w-3" />
                            </button>
                            {showSkillSelector && (
                                <SkillSelector
                                    skills={skills}
                                    selected={selectedSkills}
                                    onToggle={toggleSkill}
                                    onClose={() => setShowSkillSelector(false)}
                                />
                            )}
                        </div>

                        <div className="h-4 w-px bg-gray-200" />

                        {/* System Log */}
                        <button
                            onClick={() => setShowLogPanel(true)}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all ${
                                logs.some(l => l.type === 'error')
                                    ? 'border-red-300 bg-red-50 text-red-700'
                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Terminal className="h-4 w-4" />
                            <span>日志</span>
                            {logs.length > 0 && (
                                <span className={`rounded-full px-1.5 text-xs ${
                                    logs.some(l => l.type === 'error') ? 'bg-red-200' : 'bg-gray-200'
                                }`}>
                                    {logs.length}
                                </span>
                            )}
                        </button>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* New Chat Button */}
                        {messages.length > 0 && (
                            <button
                                onClick={() => {
                                    clearConversation();
                                    setInput('');
                                    setStreamingContent('');
                                    setSearchStatus('idle');
                                }}
                                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                            >
                                <Sparkles className="h-4 w-4" />
                                <span>新对话</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Log Panel Modal */}
            {showLogPanel && (
                <LogPanel
                    logs={logs}
                    onClose={() => setShowLogPanel(false)}
                    onClear={() => setLogs([])}
                />
            )}
        </div>
    );
}

// =============================================================================
// Sub Components
// =============================================================================

interface ModelSelectorProps {
    providers: ProviderGroup[];
    selectedModel: string;
    onSelect: (providerId: string, modelId: string) => void;
    onClose: () => void;
}

function ModelSelector({ providers, selectedModel, onSelect, onClose }: ModelSelectorProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={ref} className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                <span className="text-sm font-medium text-gray-700">选择模型</span>
                <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
                    <X className="h-4 w-4 text-gray-400" />
                </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
                {providers.map((provider) => (
                    <div key={provider.id} className="mb-2">
                        <div className="mb-1 flex items-center gap-1.5 px-2 text-xs font-medium text-gray-400">
                            <span>{provider.icon}</span>
                            <span>{provider.name}</span>
                        </div>
                        {provider.models.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => onSelect(provider.id, model.id)}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                    selectedModel === model.id
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span>{model.name}</span>
                                    {model.isNew && (
                                        <span className="rounded bg-green-100 px-1 text-xs text-green-700">New</span>
                                    )}
                                    {model.isPro && (
                                        <span className="rounded bg-purple-100 px-1 text-xs text-purple-700">Pro</span>
                                    )}
                                </div>
                                {selectedModel === model.id && <Check className="h-4 w-4 text-blue-500" />}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

interface KnowledgeBaseSelectorProps {
    folders: LibraryFolder[];
    documents: LibraryDocument[];
    selected: string[];
    onToggle: (id: string) => void;
    onClose: () => void;
}

function KnowledgeBaseSelector({ folders, documents, selected, onToggle, onClose }: KnowledgeBaseSelectorProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={ref} className="absolute bottom-full left-0 z-20 mb-2 w-72 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-3 py-2">
                <span className="text-sm font-medium text-gray-700">选择知识库</span>
                <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
                    <X className="h-4 w-4 text-gray-400" />
                </button>
            </div>

            {/* Folders */}
            {folders.length > 0 && (
                <div className="border-b border-gray-100 p-2">
                    <p className="mb-1 px-2 text-xs font-medium text-gray-400">文件夹</p>
                    {folders.map((folder) => (
                        <button
                            key={`folder-${folder.id}`}
                            onClick={() => onToggle(`folder:${folder.id}`)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                                selected.includes(`folder:${folder.id}`)
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'hover:bg-gray-50'
                            }`}
                        >
                            <FolderOpen className="h-4 w-4 text-amber-500" />
                            <span className="flex-1 truncate">{folder.name}</span>
                            {selected.includes(`folder:${folder.id}`) && <Check className="h-4 w-4 text-amber-500" />}
                        </button>
                    ))}
                </div>
            )}

            {/* Documents */}
            {documents.length > 0 && (
                <div className="p-2">
                    <p className="mb-1 px-2 text-xs font-medium text-gray-400">文档</p>
                    {documents.slice(0, 10).map((doc) => (
                        <button
                            key={`doc-${doc.id}`}
                            onClick={() => onToggle(`doc:${doc.id}`)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                                selected.includes(`doc:${doc.id}`)
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'hover:bg-gray-50'
                            }`}
                        >
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span className="flex-1 truncate">{doc.name}</span>
                            {selected.includes(`doc:${doc.id}`) && <Check className="h-4 w-4 text-blue-500" />}
                        </button>
                    ))}
                </div>
            )}

            {folders.length === 0 && documents.length === 0 && (
                <div className="p-4 text-center text-sm text-gray-500">
                    暂无知识库，请先在「我的文库」中添加文档
                </div>
            )}
        </div>
    );
}

interface SkillSelectorProps {
    skills: AnthropicSkill[];
    selected: string[];
    onToggle: (name: string) => void;
    onClose: () => void;
}

function SkillSelector({ skills, selected, onToggle, onClose }: SkillSelectorProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Group skills by category
    const skillsByCategory = skills.reduce((acc, skill) => {
        const category = skill.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(skill);
        return acc;
    }, {} as Record<string, AnthropicSkill[]>);

    const categoryLabels: Record<string, string> = {
        document: '📄 文档处理',
        development: '💻 开发工具',
        creative: '🎨 创意设计',
        communication: '💬 沟通协作',
        productivity: '📊 生产力',
        other: '✨ 其他',
    };

    return (
        <div ref={ref} className="absolute bottom-full left-0 z-20 mb-2 w-80 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-3 py-2">
                <span className="text-sm font-medium text-gray-700">选择技能 (可多选)</span>
                {selected.length > 0 && (
                    <span className="text-xs text-purple-600 mr-2">已选 {selected.length} 个</span>
                )}
                <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
                    <X className="h-4 w-4 text-gray-400" />
                </button>
            </div>

            {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                <div key={category} className="border-b border-gray-100 p-2 last:border-b-0">
                    <p className="mb-1 px-2 text-xs font-medium text-gray-400">
                        {categoryLabels[category] || category}
                    </p>
                    {categorySkills.map((skill) => {
                        const iconInfo = SKILL_ICONS[category] || SKILL_ICONS.other;
                        const Icon = iconInfo.icon;
                        const isSelected = selected.includes(skill.name);
                        return (
                            <button
                                key={skill.name}
                                onClick={() => onToggle(skill.name)}
                                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                                    isSelected
                                        ? 'bg-purple-50 text-purple-700'
                                        : 'hover:bg-gray-50'
                                }`}
                            >
                                {/* Checkbox */}
                                {isSelected ? (
                                    <CheckSquare className="h-4 w-4 flex-shrink-0 text-purple-500" />
                                ) : (
                                    <Square className="h-4 w-4 flex-shrink-0 text-gray-300" />
                                )}
                                <Icon className={`h-4 w-4 flex-shrink-0 ${iconInfo.color}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{skill.display_name}</div>
                                    <div className="text-xs text-gray-500 truncate">{skill.description}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ))}

            {skills.length === 0 && (
                <div className="p-4 text-center text-sm text-gray-500">
                    暂无可用技能
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Log Panel Component (Terminal Style)
// =============================================================================

interface LogPanelProps {
    logs: LogEntry[];
    onClose: () => void;
    onClear: () => void;
}

function LogPanel({ logs, onClose, onClear }: LogPanelProps) {
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const getLogColor = (type: LogEntry['type']) => {
        switch (type) {
            case 'error': return 'text-red-400';
            case 'request': return 'text-cyan-400';
            case 'response': return 'text-green-400';
            case 'system': return 'text-yellow-400';
            default: return 'text-gray-400';
        }
    };

    const getLogPrefix = (type: LogEntry['type']) => {
        switch (type) {
            case 'error': return '[ERROR]';
            case 'request': return '[REQ]';
            case 'response': return '[RES]';
            case 'system': return '[SYS]';
            default: return '[INFO]';
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('zh-CN', { hour12: false });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-xl bg-gray-900 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-green-400" />
                        <span className="font-mono text-sm text-gray-200">系统日志</span>
                        <span className="rounded bg-gray-700 px-2 py-0.5 font-mono text-xs text-gray-400">
                            {logs.length} entries
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClear}
                            className="rounded px-3 py-1 font-mono text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                        >
                            Clear
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Log Content */}
                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                    {logs.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-gray-500">
                            <span>No logs yet. Start a conversation to see logs.</span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {logs.map((log) => (
                                <div key={log.id} className="group">
                                    <div className="flex items-start gap-2">
                                        <span className="text-gray-600 select-none">
                                            {formatTime(log.timestamp)}
                                        </span>
                                        <span className={`font-bold ${getLogColor(log.type)}`}>
                                            {getLogPrefix(log.type)}
                                        </span>
                                        <span className="text-gray-300">{log.title}</span>
                                    </div>
                                    {log.content && (
                                        <pre className="mt-1 ml-[120px] whitespace-pre-wrap break-all rounded bg-gray-800/50 p-2 text-xs text-gray-400">
                                            {log.content}
                                        </pre>
                                    )}
                                </div>
                            ))}
                            <div ref={logEndRef} />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-700 px-4 py-2">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-red-400"></span> Error
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-cyan-400"></span> Request
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-green-400"></span> Response
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-yellow-400"></span> System
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

