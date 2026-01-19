'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    X,
    Bot,
    Sparkles,
    Sliders,
    Zap,
    Database,
    Save,
    RotateCcw,
    Play,
    Loader2,
    Check,
    Copy,
    Trash2,
    Power,
    Code,
    FileJson,
} from 'lucide-react';
import { AgentProfile, AgentProfileUpdate, agentApi } from '@/lib/api';
import { MODEL_OPTIONS } from '@/lib/modelConfig';

// =============================================================================
// Types
// =============================================================================

interface AgentConfigModalProps {
    profile: AgentProfile;
    defaultAgent?: { agent_type: string; [key: string]: any };
    onClose: () => void;
    onSave: (updates: AgentProfileUpdate) => Promise<void>;
    onTest?: (task: string) => Promise<string>;
    onClone?: () => Promise<void>;
    onDelete?: () => Promise<void>;
    onReset?: () => Promise<void>;
    onToggleEnabled?: () => Promise<void>;
}

const TRAIT_OPTIONS = ['very_low', 'low', 'medium', 'high', 'very_high'];
const TRAIT_LABELS: Record<string, string> = {
    very_low: '极低',
    low: '低',
    medium: '中等',
    high: '高',
    very_high: '极高',
};

const CLUSTER_OPTIONS = [
    { value: 'reasoning', label: '推理集群' },
    { value: 'information', label: '信息集群' },
    { value: 'production', label: '生产集群' },
    { value: 'coordination', label: '协调集群' },
];

// =============================================================================
// Component
// =============================================================================

export default function AgentConfigModal({
    profile,
    defaultAgent,
    onClose,
    onSave,
    onTest,
    onClone,
    onDelete,
    onReset,
    onToggleEnabled,
}: AgentConfigModalProps) {
    // Form state
    const [editForm, setEditForm] = useState<AgentProfileUpdate>({});
    const [newResponsibility, setNewResponsibility] = useState('');
    const [newDataSource, setNewDataSource] = useState('');

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testTask, setTestTask] = useState('请简要分析 Transformer 架构的核心创新点');
    const [testResult, setTestResult] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'config' | 'test'>('config');

    // Text editor mode
    const [showTextEditor, setShowTextEditor] = useState(false);
    const [textEditorContent, setTextEditorContent] = useState('');
    const [textEditorError, setTextEditorError] = useState<string | null>(null);

    // Convert form to JSON for text editor
    const formToJson = useCallback(() => {
        const config = {
            role_model: editForm.role_model || profile.role_model,
            fallback_model: editForm.fallback_model || profile.fallback_model,
            temperature: editForm.temperature ?? profile.temperature,
            max_tokens: editForm.max_tokens ?? profile.max_tokens,
            persona: editForm.persona ?? profile.persona,
            traits: editForm.traits || profile.traits,
            responsibilities: editForm.responsibilities || profile.responsibilities,
            data_sources: editForm.data_sources || profile.data_sources,
            is_enabled: editForm.is_enabled ?? profile.is_enabled,
        };
        return JSON.stringify(config, null, 2);
    }, [editForm, profile]);

    // Parse JSON back to form
    const jsonToForm = useCallback((json: string): AgentProfileUpdate | null => {
        try {
            const parsed = JSON.parse(json);
            setTextEditorError(null);
            return {
                role_model: parsed.role_model,
                fallback_model: parsed.fallback_model,
                temperature: parsed.temperature,
                max_tokens: parsed.max_tokens,
                persona: parsed.persona,
                traits: parsed.traits,
                responsibilities: parsed.responsibilities,
                data_sources: parsed.data_sources,
                is_enabled: parsed.is_enabled,
            };
        } catch (e) {
            setTextEditorError('JSON 格式错误');
            return null;
        }
    }, []);

    // Toggle text editor
    const handleToggleTextEditor = () => {
        if (!showTextEditor) {
            // Opening text editor - convert form to JSON
            setTextEditorContent(formToJson());
            setTextEditorError(null);
        }
        setShowTextEditor(!showTextEditor);
    };

    // Apply text editor changes
    const handleApplyTextEditor = () => {
        const parsed = jsonToForm(textEditorContent);
        if (parsed) {
            setEditForm(parsed);
            setShowTextEditor(false);
        }
    };

    // Reset form when profile changes
    useEffect(() => {
        if (profile) {
            setEditForm({
                role_model: profile.role_model,
                fallback_model: profile.fallback_model,
                temperature: profile.temperature,
                max_tokens: profile.max_tokens,
                persona: profile.persona,
                traits: { ...profile.traits },
                responsibilities: [...profile.responsibilities],
                data_sources: [...profile.data_sources],
                is_enabled: profile.is_enabled,
            });
            setTestResult(null);
        }
    }, [profile]);

    // Handle save
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(editForm);
            onClose();
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle reset (revert to current profile values)
    const handleReset = () => {
        setEditForm({
            role_model: profile.role_model,
            fallback_model: profile.fallback_model,
            temperature: profile.temperature,
            max_tokens: profile.max_tokens,
            persona: profile.persona,
            traits: { ...profile.traits },
            responsibilities: [...profile.responsibilities],
            data_sources: [...profile.data_sources],
            is_enabled: profile.is_enabled,
        });
    };

    // Handle test
    const handleTest = async () => {
        if (!onTest) return;
        setIsTesting(true);
        setTestResult(null);
        try {
            const result = await onTest(testTask);
            setTestResult(result);
        } catch (error) {
            setTestResult(`测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            setIsTesting(false);
        }
    };

    // Handle clone
    const handleClone = async () => {
        if (!onClone) return;
        try {
            await onClone();
        } catch (error) {
            console.error('Failed to clone:', error);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!onDelete) return;
        if (!confirm(`确定要删除 "${profile.display_name}" 吗？`)) return;
        try {
            await onDelete();
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    };

    // Handle reset to defaults
    const handleResetToDefaults = async () => {
        if (!onReset || !defaultAgent) return;
        if (!confirm('确定要重置为默认配置吗？所有自定义设置将丢失。')) return;
        try {
            await onReset();
            // Refresh form with current profile after reset
        } catch (error) {
            console.error('Failed to reset:', error);
        }
    };

    // Handle toggle enabled
    const handleToggleEnabled = async () => {
        if (!onToggleEnabled) return;
        try {
            await onToggleEnabled();
        } catch (error) {
            console.error('Failed to toggle:', error);
        }
    };

    // Add responsibility
    const addResponsibility = () => {
        if (newResponsibility.trim()) {
            setEditForm(prev => ({
                ...prev,
                responsibilities: [...(prev.responsibilities || []), newResponsibility.trim()],
            }));
            setNewResponsibility('');
        }
    };

    // Remove responsibility
    const removeResponsibility = (index: number) => {
        setEditForm(prev => ({
            ...prev,
            responsibilities: (prev.responsibilities || []).filter((_, i) => i !== index),
        }));
    };

    // Add data source
    const addDataSource = () => {
        if (newDataSource.trim()) {
            setEditForm(prev => ({
                ...prev,
                data_sources: [...(prev.data_sources || []), newDataSource.trim()],
            }));
            setNewDataSource('');
        }
    };

    // Remove data source
    const removeDataSource = (index: number) => {
        setEditForm(prev => ({
            ...prev,
            data_sources: (prev.data_sources || []).filter((_, i) => i !== index),
        }));
    };

    if (!profile) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{profile.display_name === 'Meta-Coordinator' ? '🎯' :
                            profile.agent_type === 'logician' ? '🧮' :
                            profile.agent_type === 'critic' ? '🔬' :
                            profile.agent_type === 'connector' ? '🔗' :
                            profile.agent_type === 'explorer' ? '🔍' :
                            profile.agent_type === 'builder' ? '🛠️' :
                            profile.agent_type === 'genealogist' ? '📜' :
                            profile.agent_type === 'historian' ? '🏛️' :
                            profile.agent_type === 'social_scout' ? '📡' :
                            profile.agent_type === 'cn_specialist' ? '🇨🇳' :
                            profile.agent_type === 'vision_analyst' ? '👁️' :
                            profile.agent_type === 'scribe' ? '✍️' :
                            profile.agent_type === 'archivist' ? '📚' :
                            profile.agent_type === 'prompt_engineer' ? '💡' : '🤖'
                        }</span>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                Agent 配置 - {profile.display_name}
                            </h2>
                            <p className="text-sm text-gray-500">{profile.display_name_cn}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Tab Bar */}
                <div className="flex items-center border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'config'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        配置
                    </button>
                    <button
                        onClick={() => setActiveTab('test')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'test'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        测试
                    </button>
                    {/* JSON Editor Toggle */}
                    <button
                        onClick={handleToggleTextEditor}
                        className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                            showTextEditor
                                ? 'text-purple-600 bg-purple-50'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                        title="JSON 编辑模式"
                    >
                        <FileJson className="h-4 w-4" />
                        JSON
                    </button>
                </div>

                {/* Content */}
                <div className="relative flex-1 overflow-y-auto p-6">
                    {activeTab === 'config' ? (
                        <div className="space-y-6">
                            {/* Model Config Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <Bot className="h-4 w-4" />
                                    模型配置
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">主模型</label>
                                        <select
                                            value={editForm.role_model || ''}
                                            onChange={(e) => setEditForm({ ...editForm, role_model: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        >
                                            {MODEL_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">备选模型</label>
                                        <select
                                            value={editForm.fallback_model || ''}
                                            onChange={(e) => setEditForm({ ...editForm, fallback_model: e.target.value || undefined })}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        >
                                            <option value="">无</option>
                                            {MODEL_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Temperature: {editForm.temperature?.toFixed(1)}
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={editForm.temperature || 0.7}
                                            onChange={(e) => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Max Tokens</label>
                                        <input
                                            type="number"
                                            value={editForm.max_tokens || 4000}
                                            onChange={(e) => setEditForm({ ...editForm, max_tokens: parseInt(e.target.value) })}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Persona Section */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <Sparkles className="h-4 w-4" />
                                    人设描述
                                </div>
                                <textarea
                                    value={editForm.persona || ''}
                                    onChange={(e) => setEditForm({ ...editForm, persona: e.target.value })}
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
                                    placeholder="描述这个 Agent 的角色定位和行为风格..."
                                />
                            </div>

                            {/* Traits Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <Sliders className="h-4 w-4" />
                                    性格特征
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(editForm.traits || {}).map(([trait, value]) => (
                                        <div key={trait} className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 capitalize">{trait}</span>
                                            <select
                                                value={value}
                                                onChange={(e) => setEditForm({
                                                    ...editForm,
                                                    traits: { ...editForm.traits, [trait]: e.target.value }
                                                })}
                                                className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                                            >
                                                {TRAIT_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt}>{TRAIT_LABELS[opt]}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Responsibilities Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <Zap className="h-4 w-4" />
                                    职责
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(editForm.responsibilities || []).map((resp, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                                        >
                                            {resp}
                                            <button
                                                onClick={() => removeResponsibility(i)}
                                                className="hover:text-blue-900"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newResponsibility}
                                        onChange={(e) => setNewResponsibility(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addResponsibility()}
                                        placeholder="添加新职责..."
                                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={addResponsibility}
                                        className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                                    >
                                        添加
                                    </button>
                                </div>
                            </div>

                            {/* Data Sources Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <Database className="h-4 w-4" />
                                    数据源
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(editForm.data_sources || []).map((source, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs"
                                        >
                                            {source}
                                            <button
                                                onClick={() => removeDataSource(i)}
                                                className="hover:text-green-900"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newDataSource}
                                        onChange={(e) => setNewDataSource(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addDataSource()}
                                        placeholder="添加数据源..."
                                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={addDataSource}
                                        className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                                    >
                                        添加
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Test Tab */
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">测试任务</label>
                                <textarea
                                    value={testTask}
                                    onChange={(e) => setTestTask(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
                                    placeholder="输入测试任务..."
                                />
                            </div>
                            <button
                                onClick={handleTest}
                                disabled={isTesting}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50"
                            >
                                {isTesting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Play className="h-4 w-4" />
                                )}
                                {isTesting ? '测试中...' : '运行测试'}
                            </button>

                            {testResult && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">测试结果</label>
                                    <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                                        {testResult}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Text Editor Overlay */}
                    <div
                        className={`absolute inset-0 bg-white transition-all duration-300 ease-in-out ${
                            showTextEditor
                                ? 'opacity-100 translate-y-0 pointer-events-auto'
                                : 'opacity-0 translate-y-4 pointer-events-none'
                        }`}
                    >
                        <div className="h-full flex flex-col p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Code className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-medium text-gray-700">JSON 配置编辑</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const json = formToJson();
                                            setTextEditorContent(json);
                                            setTextEditorError(null);
                                        }}
                                        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                    >
                                        重新加载
                                    </button>
                                    <button
                                        onClick={() => setShowTextEditor(false)}
                                        className="p-1 hover:bg-gray-100 rounded"
                                    >
                                        <X className="h-4 w-4 text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            <textarea
                                value={textEditorContent}
                                onChange={(e) => {
                                    setTextEditorContent(e.target.value);
                                    // Validate on change
                                    try {
                                        JSON.parse(e.target.value);
                                        setTextEditorError(null);
                                    } catch {
                                        setTextEditorError('JSON 格式错误');
                                    }
                                }}
                                className="flex-1 w-full font-mono text-sm bg-gray-900 text-green-400 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                                spellCheck={false}
                            />

                            {textEditorError && (
                                <div className="mt-2 text-sm text-red-500 flex items-center gap-1">
                                    <X className="h-3 w-3" />
                                    {textEditorError}
                                </div>
                            )}

                            <div className="mt-3 flex justify-end gap-2">
                                <button
                                    onClick={() => setShowTextEditor(false)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleApplyTextEditor}
                                    disabled={!!textEditorError}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Check className="h-4 w-4" />
                                    应用更改
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-2">
                        {/* Toggle Enabled */}
                        {onToggleEnabled && (
                            <button
                                onClick={handleToggleEnabled}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                    profile.is_enabled
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <Power className="h-4 w-4" />
                                {profile.is_enabled ? '已启用' : '已禁用'}
                            </button>
                        )}

                        {/* Clone */}
                        {onClone && (
                            <button
                                onClick={handleClone}
                                className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                            >
                                <Copy className="h-4 w-4" />
                                克隆
                            </button>
                        )}

                        {/* Reset to Defaults */}
                        {onReset && defaultAgent && !profile.is_custom && (
                            <button
                                onClick={handleResetToDefaults}
                                className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                            >
                                <RotateCcw className="h-4 w-4" />
                                重置为默认
                            </button>
                        )}

                        {/* Delete (only for custom agents) */}
                        {onDelete && profile.is_custom && (
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                                删除
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                        >
                            <RotateCcw className="h-4 w-4" />
                            撤销更改
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            保存更改
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
