'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Plus, Trash2, Bot, User, Sparkles, Settings2 } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

interface Conversation {
    id: string;
    title: string;
    model: string | null;
    created_at: string;
    updated_at: string;
}

const MODELS = [
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
    { id: 'anthropic/claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { id: 'anthropic/claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'Anthropic' },
    { id: 'google/gemini-2.0-pro', name: 'Gemini 2 Pro', provider: 'Google' },
    { id: 'google/gemini-2.0-flash', name: 'Gemini 2 Flash', provider: 'Google' },
];

export default function AIAskPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [selectedModel, setSelectedModel] = useState('openai/gpt-4o');
    const [showModelSelector, setShowModelSelector] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch conversations on mount
    useEffect(() => {
        fetchConversations();
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent]);

    const getToken = () => localStorage.getItem('token');

    const fetchConversations = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch('/api/chat/conversations', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setConversations(data.conversations);
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        }
    };

    const fetchMessages = async (conversationId: string) => {
        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch(`/api/chat/conversations/${conversationId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages);
                if (data.conversation.model) {
                    setSelectedModel(data.conversation.model);
                }
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const createNewConversation = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch('/api/chat/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ title: '新对话' }),
            });
            if (response.ok) {
                const newConv = await response.json();
                setConversations([newConv, ...conversations]);
                setActiveConversation(newConv);
                setMessages([]);
            }
        } catch (error) {
            console.error('Failed to create conversation:', error);
        }
    };

    const selectConversation = async (conv: Conversation) => {
        setActiveConversation(conv);
        await fetchMessages(conv.id);
    };

    const deleteConversation = async (convId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch(`/api/chat/conversations/${convId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                setConversations(conversations.filter((c) => c.id !== convId));
                if (activeConversation?.id === convId) {
                    setActiveConversation(null);
                    setMessages([]);
                }
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const token = getToken();
        if (!token) return;

        let convId = activeConversation?.id;

        // Create new conversation if needed
        if (!convId) {
            try {
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
                    setConversations([newConv, ...conversations]);
                    setActiveConversation(newConv);
                    convId = newConv.id;
                }
            } catch (error) {
                console.error('Failed to create conversation:', error);
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
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setStreamingContent('');

        try {
            const response = await fetch(`/api/chat/conversations/${convId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    content: userMessage.content,
                    model: selectedModel,
                }),
            });

            if (!response.ok) {
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
                                if (data.content) {
                                    fullContent += data.content;
                                    setStreamingContent(fullContent);
                                } else if (data.error) {
                                    // Handle error
                                    const errorMessage: Message = {
                                        id: Date.now().toString(),
                                        role: 'assistant',
                                        content: `错误: ${data.error}`,
                                        created_at: new Date().toISOString(),
                                    };
                                    setMessages((prev) => [...prev, errorMessage]);
                                    setStreamingContent('');
                                    setIsLoading(false);
                                    return;
                                } else if (data.done) {
                                    // Add final message
                                    const assistantMessage: Message = {
                                        id: data.message_id || Date.now().toString(),
                                        role: 'assistant',
                                        content: fullContent,
                                        created_at: new Date().toISOString(),
                                    };
                                    setMessages((prev) => [...prev, assistantMessage]);
                                    setStreamingContent('');
                                }
                            } catch {
                                // Ignore parse errors
                            }
                        }
                    }
                }
            }

            // Refresh conversations list
            fetchConversations();
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: '发送消息失败，请重试。',
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setStreamingContent('');
        }
    };

    const currentModel = MODELS.find((m) => m.id === selectedModel);

    return (
        <div className="flex h-full">
            {/* 会话列表 */}
            <div className="w-64 border-r border-gray-200 bg-white">
                <div className="p-4">
                    <button
                        onClick={createNewConversation}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:from-blue-600 hover:to-purple-600"
                    >
                        <Plus className="h-4 w-4" />
                        新对话
                    </button>
                </div>
                <div className="space-y-1 px-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                    {conversations.map((conv) => (
                        <div
                            key={conv.id}
                            onClick={() => selectConversation(conv)}
                            className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                activeConversation?.id === conv.id
                                    ? 'bg-violet-50 text-gray-900'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Bot className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1 truncate">{conv.title}</span>
                            <button
                                onClick={(e) => deleteConversation(conv.id, e)}
                                className="hidden rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 group-hover:block"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 聊天区域 */}
            <div className="flex flex-1 flex-col">
                {activeConversation || messages.length > 0 ? (
                    <>
                        {/* 模型选择器 */}
                        <div className="border-b border-gray-200 bg-white px-4 py-2">
                            <div className="relative">
                                <button
                                    onClick={() => setShowModelSelector(!showModelSelector)}
                                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                                >
                                    <Settings2 className="h-4 w-4 text-gray-500" />
                                    <span>{currentModel?.name || selectedModel}</span>
                                </button>
                                {showModelSelector && (
                                    <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                        {MODELS.map((model) => (
                                            <button
                                                key={model.id}
                                                onClick={() => {
                                                    setSelectedModel(model.id);
                                                    setShowModelSelector(false);
                                                }}
                                                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                                                    selectedModel === model.id ? 'bg-blue-50 text-blue-600' : ''
                                                }`}
                                            >
                                                <span>{model.name}</span>
                                                <span className="text-xs text-gray-400">{model.provider}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 消息列表 */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="mx-auto max-w-3xl space-y-6">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
                                    >
                                        {msg.role === 'assistant' && (
                                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
                                                <Bot className="h-4 w-4 text-white" />
                                            </div>
                                        )}
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                                msg.role === 'user'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 text-gray-800'
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

                                {/* Streaming content */}
                                {streamingContent && (
                                    <div className="flex gap-4">
                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
                                            <Bot className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-3 text-gray-800">
                                            <p className="whitespace-pre-wrap text-sm">{streamingContent}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Loading indicator */}
                                {isLoading && !streamingContent && (
                                    <div className="flex gap-4">
                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
                                            <Bot className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="rounded-2xl bg-gray-100 px-4 py-3">
                                            <div className="flex space-x-1">
                                                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                                                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.1s]" />
                                                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* 输入框 */}
                        <div className="border-t border-gray-200 bg-white p-4">
                            <div className="mx-auto max-w-3xl">
                                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                        placeholder="输入您的问题..."
                                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                                        disabled={isLoading}
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || isLoading}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white transition-colors hover:bg-blue-600 disabled:bg-gray-300"
                                    >
                                        <Send className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    /* 空状态 */
                    <div className="flex flex-1 flex-col items-center justify-center">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
                            <Sparkles className="h-10 w-10 text-blue-500" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-gray-800">AI Ask</h2>
                        <p className="mb-6 text-center text-gray-500">与 AI 助手对话，获取智能回答</p>
                        <button
                            onClick={createNewConversation}
                            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 text-sm font-medium text-white transition-all hover:from-blue-600 hover:to-purple-600"
                        >
                            <Plus className="h-4 w-4" />
                            开始新对话
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
