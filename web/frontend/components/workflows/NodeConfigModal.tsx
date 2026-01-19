'use client';

import { useState, useEffect } from 'react';
import { X, Info, Plus, Bot, Sparkles, Zap, Sliders, Database } from 'lucide-react';
import type { WorkflowNode, WorkflowNodeConfig, AgentProfile, DefaultAgentTemplate } from '@/lib/api';
import { useWorkflowStore } from '@/lib/workflowStore';
import { MODEL_OPTIONS } from '@/lib/modelConfig';

interface NodeConfigModalProps {
    node?: WorkflowNode;
    agentProfile?: AgentProfile | DefaultAgentTemplate | null;
    onClose: () => void;
}

const TRAIT_OPTIONS = ['very_low', 'low', 'medium', 'high', 'very_high'];

const TRAIT_LABELS: Record<string, string> = {
    very_low: '极低',
    low: '低',
    medium: '中等',
    high: '高',
    very_high: '极高',
};

export default function NodeConfigModal({ node, agentProfile, onClose }: NodeConfigModalProps) {
    const { updateNode } = useWorkflowStore();

    // Basic info
    const [label, setLabel] = useState('');
    const [labelCn, setLabelCn] = useState('');

    // Model config
    const [roleModel, setRoleModel] = useState('');
    const [fallbackModel, setFallbackModel] = useState('');
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(4000);

    // Persona
    const [persona, setPersona] = useState('');

    // Traits
    const [traits, setTraits] = useState<Record<string, string>>({});

    // Responsibilities
    const [responsibilities, setResponsibilities] = useState<string[]>([]);
    const [newResponsibility, setNewResponsibility] = useState('');

    // Data sources
    const [dataSources, setDataSources] = useState<string[]>([]);
    const [newDataSource, setNewDataSource] = useState('');

    // Custom prompt
    const [customPrompt, setCustomPrompt] = useState('');

    // Active tab
    const [activeTab, setActiveTab] = useState<'config' | 'json'>('config');

    useEffect(() => {
        if (node) {
            // Use node config if available, otherwise fall back to agent profile
            const nodeConfig = node.config || {};
            const hasNodeConfig = Object.keys(nodeConfig).length > 0;

            setLabel(node.label || agentProfile?.display_name || '');
            setLabelCn(node.labelCn || agentProfile?.display_name_cn || '');

            // If node has config, use it; otherwise use agent profile defaults
            if (hasNodeConfig) {
                setRoleModel(nodeConfig.roleModel || '');
                setFallbackModel(nodeConfig.fallbackModel || '');
                setTemperature(nodeConfig.temperature ?? 0.7);
                setMaxTokens(nodeConfig.maxTokens ?? 4000);
                setPersona(nodeConfig.persona || '');
                setTraits(nodeConfig.traits || {});
                setResponsibilities(nodeConfig.responsibilities || []);
                setDataSources(nodeConfig.dataSources || []);
                setCustomPrompt(nodeConfig.customPrompt || '');
            } else if (agentProfile) {
                // Initialize from agent profile
                setRoleModel(agentProfile.role_model || '');
                setFallbackModel(agentProfile.fallback_model || '');
                setTemperature(agentProfile.temperature ?? 0.7);
                setMaxTokens(agentProfile.max_tokens ?? 4000);
                setPersona(agentProfile.persona || '');
                setTraits(agentProfile.traits || {});
                setResponsibilities(agentProfile.responsibilities || []);
                setDataSources(agentProfile.data_sources || []);
                setCustomPrompt('');
            }
        }
    }, [node, agentProfile]);

    const handleSave = () => {
        if (!node) return;

        const config: WorkflowNodeConfig = {
            roleModel: roleModel || undefined,
            fallbackModel: fallbackModel || undefined,
            temperature,
            maxTokens,
            persona: persona || undefined,
            traits: Object.keys(traits).length > 0 ? traits : undefined,
            responsibilities: responsibilities.length > 0 ? responsibilities : undefined,
            dataSources: dataSources.length > 0 ? dataSources : undefined,
            customPrompt: customPrompt || undefined,
        };

        updateNode(node.id, {
            label: label || undefined,
            labelCn: labelCn || undefined,
            config,
        });
        onClose();
    };

    const handleAddResponsibility = () => {
        if (newResponsibility.trim()) {
            setResponsibilities([...responsibilities, newResponsibility.trim()]);
            setNewResponsibility('');
        }
    };

    const handleRemoveResponsibility = (index: number) => {
        setResponsibilities(responsibilities.filter((_, i) => i !== index));
    };

    const handleAddDataSource = () => {
        if (newDataSource.trim()) {
            setDataSources([...dataSources, newDataSource.trim()]);
            setNewDataSource('');
        }
    };

    const handleRemoveDataSource = (index: number) => {
        setDataSources(dataSources.filter((_, i) => i !== index));
    };

    const handleTraitChange = (key: string, value: string) => {
        setTraits({ ...traits, [key]: value });
    };

    if (!node) return null;

    const jsonConfig = JSON.stringify(
        {
            agentType: node.agentType,
            label,
            labelCn,
            config: {
                roleModel,
                fallbackModel,
                temperature,
                maxTokens,
                persona,
                traits,
                responsibilities,
                dataSources,
                customPrompt,
            },
        },
        null,
        2
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Agent 配置 - {node.label || node.agentType}
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {node.labelCn || node.agentType.replace(/_/g, ' ')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6">
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === 'config'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        配置
                    </button>
                    <button
                        onClick={() => setActiveTab('json')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === 'json'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        JSON
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'config' ? (
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        显示名称 (EN)
                                    </label>
                                    <input
                                        type="text"
                                        value={label}
                                        onChange={(e) => setLabel(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder={node.agentType}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        显示名称 (CN)
                                    </label>
                                    <input
                                        type="text"
                                        value={labelCn}
                                        onChange={(e) => setLabelCn(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder="中文名称"
                                    />
                                </div>
                            </div>

                            {/* Model Configuration */}
                            <ConfigSection title="模型配置" icon={Bot}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            主模型
                                        </label>
                                        <select
                                            value={roleModel}
                                            onChange={(e) => setRoleModel(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        >
                                            <option value="">使用默认</option>
                                            {MODEL_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            备选模型
                                        </label>
                                        <select
                                            value={fallbackModel}
                                            onChange={(e) => setFallbackModel(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        >
                                            <option value="">无</option>
                                            {MODEL_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Temperature: {temperature.toFixed(2)}
                                        </label>
                                        <input
                                            type="range"
                                            value={temperature}
                                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>精确 (0)</span>
                                            <span>创意 (1)</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Max Tokens
                                        </label>
                                        <input
                                            type="number"
                                            value={maxTokens}
                                            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            min="1000"
                                            max="32000"
                                            step="1000"
                                        />
                                    </div>
                                </div>
                            </ConfigSection>

                            {/* Persona */}
                            <ConfigSection title="人设描述" icon={Sparkles}>
                                <textarea
                                    value={persona}
                                    onChange={(e) => setPersona(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                                    placeholder="描述 Agent 的角色、专长和行为方式..."
                                />
                            </ConfigSection>

                            {/* Traits */}
                            {Object.keys(traits).length > 0 && (
                                <ConfigSection title="性格特征" icon={Sliders}>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries(traits).map(([key, value]) => (
                                            <div key={key}>
                                                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                                                    {key.replace(/_/g, ' ')}
                                                </label>
                                                <select
                                                    value={value}
                                                    onChange={(e) => handleTraitChange(key, e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                >
                                                    {TRAIT_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {TRAIT_LABELS[opt] || opt.replace(/_/g, ' ')}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </ConfigSection>
                            )}

                            {/* Responsibilities */}
                            <ConfigSection title="职责" icon={Zap}>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {responsibilities.map((resp, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                                        >
                                            {resp}
                                            <button
                                                onClick={() => handleRemoveResponsibility(index)}
                                                className="ml-1 text-blue-400 hover:text-blue-600"
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
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddResponsibility()}
                                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                                        placeholder="添加新职责..."
                                    />
                                    <button
                                        onClick={handleAddResponsibility}
                                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </ConfigSection>

                            {/* Data Sources */}
                            <ConfigSection title="数据源" icon={Database}>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {dataSources.map((source, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                                        >
                                            {source}
                                            <button
                                                onClick={() => handleRemoveDataSource(index)}
                                                className="ml-1 text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                    {dataSources.length === 0 && (
                                        <span className="text-sm text-gray-500">暂无数据源</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newDataSource}
                                        onChange={(e) => setNewDataSource(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddDataSource()}
                                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                                        placeholder="添加数据源..."
                                    />
                                    <button
                                        onClick={handleAddDataSource}
                                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </ConfigSection>

                            {/* Custom Prompt */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    自定义提示词覆盖（可选）
                                </label>
                                <textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                                    placeholder="输入自定义提示词以覆盖默认行为..."
                                />
                                <div className="mt-1 flex items-start gap-2 text-xs text-gray-500">
                                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>
                                        这些指令将追加到 agent 的基础提示词中
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
                                {jsonConfig}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        应用更改
                    </button>
                </div>
            </div>
        </div>
    );
}

interface ConfigSectionProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
}

function ConfigSection({ title, icon: Icon, children }: ConfigSectionProps) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <Icon className="h-4 w-4 text-gray-500" />
                {title}
            </h3>
            {children}
        </div>
    );
}
