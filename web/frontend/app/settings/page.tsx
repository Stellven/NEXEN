'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Settings {
    openai_api_key: string | null;
    anthropic_api_key: string | null;
    google_api_key: string | null;
    default_model: string;
    has_openai: boolean;
    has_anthropic: boolean;
    has_google: boolean;
}

export default function SettingsPage() {
    const router = useRouter();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [openaiKey, setOpenaiKey] = useState('');
    const [anthropicKey, setAnthropicKey] = useState('');
    const [googleKey, setGoogleKey] = useState('');
    const [defaultModel, setDefaultModel] = useState('openai/gpt-4o');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        fetchSettings();
    }, [router]);

    const fetchSettings = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch('/api/settings', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.status === 401) {
                router.push('/login');
                return;
            }

            const data = await response.json();
            setSettings(data);
            setDefaultModel(data.default_model);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const token = localStorage.getItem('token');
        setSaving(true);
        setMessage(null);

        try {
            const updates: any = { default_model: defaultModel };
            if (openaiKey) updates.openai_api_key = openaiKey;
            if (anthropicKey) updates.anthropic_api_key = anthropicKey;
            if (googleKey) updates.google_api_key = googleKey;

            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) throw new Error('保存失败');

            const data = await response.json();
            setSettings(data);
            setOpenaiKey('');
            setAnthropicKey('');
            setGoogleKey('');
            setMessage({ type: 'success', text: '设置已保存' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
                <div className="text-[var(--text-muted)]">加载中...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">
                        ← 返回工作台
                    </Link>
                    <h1 className="text-2xl font-bold mt-4">账户设置</h1>
                </div>

                {/* Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg ${message.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-red-50 border border-red-200 text-red-600'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* API Keys */}
                <div className="card mb-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span>🔑</span> API 密钥
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] mb-6">
                        配置您的 API 密钥以使用各大模型厂商的服务。
                    </p>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                OpenAI API Key
                                {settings?.has_openai && <span className="ml-2 text-green-600 text-xs">✓ 已配置</span>}
                            </label>
                            <input
                                type="password"
                                value={openaiKey}
                                onChange={(e) => setOpenaiKey(e.target.value)}
                                placeholder={settings?.has_openai ? "已配置 (输入新值覆盖)" : "sk-..."}
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                获取地址: <a href="https://platform.openai.com/api-keys" target="_blank" className="text-[var(--accent)]">platform.openai.com</a>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Anthropic API Key
                                {settings?.has_anthropic && <span className="ml-2 text-green-600 text-xs">✓ 已配置</span>}
                            </label>
                            <input
                                type="password"
                                value={anthropicKey}
                                onChange={(e) => setAnthropicKey(e.target.value)}
                                placeholder={settings?.has_anthropic ? "已配置 (输入新值覆盖)" : "sk-ant-..."}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Google API Key
                                {settings?.has_google && <span className="ml-2 text-green-600 text-xs">✓ 已配置</span>}
                            </label>
                            <input
                                type="password"
                                value={googleKey}
                                onChange={(e) => setGoogleKey(e.target.value)}
                                placeholder={settings?.has_google ? "已配置 (输入新值覆盖)" : "AIza..."}
                            />
                        </div>
                    </div>
                </div>

                {/* Preferences */}
                <div className="card mb-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span>⚙️</span> 偏好设置
                    </h2>

                    <div>
                        <label className="block text-sm font-medium mb-2">默认模型</label>
                        <select
                            value={defaultModel}
                            onChange={(e) => setDefaultModel(e.target.value)}
                            className="w-full"
                        >
                            <optgroup label="OpenAI">
                                <option value="openai/gpt-4o">GPT-4o</option>
                                <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                            </optgroup>
                            <optgroup label="Anthropic">
                                <option value="anthropic/claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                                <option value="anthropic/claude-3-opus-20240229">Claude 3 Opus</option>
                            </optgroup>
                            <optgroup label="Google">
                                <option value="google/gemini-2.0-pro">Gemini 2 Pro</option>
                                <option value="google/gemini-2.0-flash">Gemini 2 Flash</option>
                            </optgroup>
                        </select>
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full btn-primary py-3 disabled:opacity-50"
                >
                    {saving ? '保存中...' : '保存设置'}
                </button>
            </div>
        </div>
    );
}
