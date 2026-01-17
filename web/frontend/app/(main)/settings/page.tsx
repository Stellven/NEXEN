'use client';

import { useState, useEffect } from 'react';
import {
    Settings,
    User,
    Bell,
    Shield,
    Palette,
    Globe,
    Key,
    LogOut,
    ChevronRight,
    Moon,
    Sun,
    Check,
    ExternalLink,
} from 'lucide-react';

interface SettingSection {
    id: string;
    label: string;
    icon: typeof User;
    description: string;
}

interface ApiSettings {
    has_openai: boolean;
    has_anthropic: boolean;
    has_google: boolean;
    default_model: string;
}

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('account');
    const [darkMode, setDarkMode] = useState(false);
    const [language, setLanguage] = useState('zh');
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        updates: false,
    });

    // API Settings state
    const [apiSettings, setApiSettings] = useState<ApiSettings | null>(null);
    const [openaiKey, setOpenaiKey] = useState('');
    const [anthropicKey, setAnthropicKey] = useState('');
    const [googleKey, setGoogleKey] = useState('');
    const [defaultModel, setDefaultModel] = useState('openai/gpt-4o');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (activeSection === 'api') {
            fetchApiSettings();
        }
    }, [activeSection]);

    const fetchApiSettings = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch('/api/settings', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setApiSettings(data);
                setDefaultModel(data.default_model || 'openai/gpt-4o');
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    const handleSaveApiSettings = async () => {
        const token = localStorage.getItem('token');
        setSaving(true);
        setMessage(null);

        try {
            const updates: Record<string, string> = { default_model: defaultModel };
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
            setApiSettings(data);
            setOpenaiKey('');
            setAnthropicKey('');
            setGoogleKey('');
            setMessage({ type: 'success', text: '设置已保存' });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : '保存失败';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setSaving(false);
        }
    };

    const sections: SettingSection[] = [
        { id: 'account', label: '账户设置', icon: User, description: '管理您的账户信息' },
        { id: 'notifications', label: '通知设置', icon: Bell, description: '配置通知偏好' },
        { id: 'security', label: '安全设置', icon: Shield, description: '密码和安全选项' },
        { id: 'appearance', label: '外观设置', icon: Palette, description: '主题和显示选项' },
        { id: 'language', label: '语言和地区', icon: Globe, description: '语言和时区设置' },
        { id: 'api', label: 'API 密钥', icon: Key, description: '管理 API 访问密钥' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    return (
        <div className="flex h-full">
            {/* 左侧导航 */}
            <div className="w-64 border-r border-gray-200 bg-white">
                <div className="p-4">
                    <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                        <Settings className="h-5 w-5" />
                        设置
                    </h2>
                </div>
                <nav className="px-2">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                                activeSection === section.id
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <section.icon className="h-5 w-5" />
                            <span className="text-sm font-medium">{section.label}</span>
                        </button>
                    ))}
                    <hr className="my-2 border-gray-200" />
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-red-600 hover:bg-red-50"
                    >
                        <LogOut className="h-5 w-5" />
                        <span className="text-sm font-medium">退出登录</span>
                    </button>
                </nav>
            </div>

            {/* 右侧内容 */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-2xl">
                    {activeSection === 'account' && (
                        <div>
                            <h2 className="mb-6 text-xl font-bold text-gray-900">账户设置</h2>
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <div className="mb-6 flex items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-2xl font-bold text-white">
                                        L
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">lisihao</h3>
                                        <p className="text-sm text-gray-500">lisihao@gmail.com</p>
                                    </div>
                                    <button className="ml-auto rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
                                        编辑
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            用户名
                                        </label>
                                        <input
                                            type="text"
                                            defaultValue="lisihao"
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            邮箱
                                        </label>
                                        <input
                                            type="email"
                                            defaultValue="lisihao@gmail.com"
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>
                                </div>
                                <button className="mt-6 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">
                                    保存更改
                                </button>
                            </div>
                        </div>
                    )}

                    {activeSection === 'notifications' && (
                        <div>
                            <h2 className="mb-6 text-xl font-bold text-gray-900">通知设置</h2>
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <div className="space-y-4">
                                    {[
                                        { key: 'email', label: '邮件通知', desc: '接收重要更新的邮件' },
                                        { key: 'push', label: '推送通知', desc: '接收浏览器推送消息' },
                                        { key: 'updates', label: '产品更新', desc: '接收新功能和更新通知' },
                                    ].map((item) => (
                                        <div
                                            key={item.key}
                                            className="flex items-center justify-between py-3"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-900">{item.label}</p>
                                                <p className="text-sm text-gray-500">{item.desc}</p>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    setNotifications((prev) => ({
                                                        ...prev,
                                                        [item.key]: !prev[item.key as keyof typeof prev],
                                                    }))
                                                }
                                                className={`relative h-6 w-11 rounded-full transition-colors ${
                                                    notifications[item.key as keyof typeof notifications]
                                                        ? 'bg-blue-500'
                                                        : 'bg-gray-200'
                                                }`}
                                            >
                                                <span
                                                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                                        notifications[item.key as keyof typeof notifications]
                                                            ? 'translate-x-5'
                                                            : 'translate-x-0.5'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'appearance' && (
                        <div>
                            <h2 className="mb-6 text-xl font-bold text-gray-900">外观设置</h2>
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <div className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="font-medium text-gray-900">深色模式</p>
                                        <p className="text-sm text-gray-500">切换明暗主题</p>
                                    </div>
                                    <button
                                        onClick={() => setDarkMode(!darkMode)}
                                        className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                                            darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'
                                        }`}
                                    >
                                        {darkMode ? (
                                            <Moon className="h-4 w-4" />
                                        ) : (
                                            <Sun className="h-4 w-4" />
                                        )}
                                        {darkMode ? '深色' : '浅色'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'language' && (
                        <div>
                            <h2 className="mb-6 text-xl font-bold text-gray-900">语言和地区</h2>
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        显示语言
                                    </label>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    >
                                        <option value="zh">简体中文</option>
                                        <option value="en">English</option>
                                        <option value="ja">日本語</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'security' && (
                        <div>
                            <h2 className="mb-6 text-xl font-bold text-gray-900">安全设置</h2>
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <button className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50">
                                    <div>
                                        <p className="font-medium text-gray-900">修改密码</p>
                                        <p className="text-sm text-gray-500">更新您的登录密码</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeSection === 'api' && (
                        <div>
                            <h2 className="mb-6 text-xl font-bold text-gray-900">API 密钥</h2>

                            {message && (
                                <div
                                    className={`mb-4 rounded-lg p-3 text-sm ${
                                        message.type === 'success'
                                            ? 'bg-green-50 text-green-700'
                                            : 'bg-red-50 text-red-700'
                                    }`}
                                >
                                    {message.text}
                                </div>
                            )}

                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <p className="mb-6 text-sm text-gray-600">
                                    配置您的 API 密钥以使用各大模型厂商的服务
                                </p>

                                <div className="space-y-5">
                                    {/* OpenAI */}
                                    <div>
                                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                                            OpenAI API Key
                                            {apiSettings?.has_openai && (
                                                <span className="flex items-center gap-1 text-xs text-green-600">
                                                    <Check className="h-3 w-3" />
                                                    已配置
                                                </span>
                                            )}
                                        </label>
                                        <input
                                            type="password"
                                            value={openaiKey}
                                            onChange={(e) => setOpenaiKey(e.target.value)}
                                            placeholder={apiSettings?.has_openai ? '已配置 (输入新值覆盖)' : 'sk-...'}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                        />
                                        <a
                                            href="https://platform.openai.com/api-keys"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-1 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                                        >
                                            获取密钥
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>

                                    {/* Anthropic */}
                                    <div>
                                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                                            Anthropic API Key
                                            {apiSettings?.has_anthropic && (
                                                <span className="flex items-center gap-1 text-xs text-green-600">
                                                    <Check className="h-3 w-3" />
                                                    已配置
                                                </span>
                                            )}
                                        </label>
                                        <input
                                            type="password"
                                            value={anthropicKey}
                                            onChange={(e) => setAnthropicKey(e.target.value)}
                                            placeholder={apiSettings?.has_anthropic ? '已配置 (输入新值覆盖)' : 'sk-ant-...'}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>

                                    {/* Google */}
                                    <div>
                                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                                            Google API Key
                                            {apiSettings?.has_google && (
                                                <span className="flex items-center gap-1 text-xs text-green-600">
                                                    <Check className="h-3 w-3" />
                                                    已配置
                                                </span>
                                            )}
                                        </label>
                                        <input
                                            type="password"
                                            value={googleKey}
                                            onChange={(e) => setGoogleKey(e.target.value)}
                                            placeholder={apiSettings?.has_google ? '已配置 (输入新值覆盖)' : 'AIza...'}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>

                                    {/* Default Model */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                            默认模型
                                        </label>
                                        <select
                                            value={defaultModel}
                                            onChange={(e) => setDefaultModel(e.target.value)}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
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

                                <button
                                    onClick={handleSaveApiSettings}
                                    disabled={saving}
                                    className="mt-6 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:bg-gray-300"
                                >
                                    {saving ? '保存中...' : '保存设置'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
