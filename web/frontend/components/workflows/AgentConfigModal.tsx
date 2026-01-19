'use client';

import { X, Bot, Sparkles, Zap, Sliders, Database, ExternalLink } from 'lucide-react';
import type { AgentProfile, DefaultAgentTemplate } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AgentConfigModalProps {
    agent: AgentProfile | DefaultAgentTemplate;
    onClose: () => void;
}

const TRAIT_LABELS: Record<string, string> = {
    very_low: '极低',
    low: '低',
    medium: '中等',
    high: '高',
    very_high: '极高',
};

// Agent emoji mapping
const AGENT_EMOJIS: Record<string, string> = {
    meta_coordinator: '🎯',
    logician: '🧮',
    critic: '🔬',
    connector: '🔗',
    genealogist: '📜',
    historian: '🏛️',
    explorer: '🔍',
    social_scout: '📡',
    cn_specialist: '🇨🇳',
    vision_analyst: '👁️',
    builder: '🛠️',
    scribe: '✍️',
    archivist: '📚',
    prompt_engineer: '💡',
    collaborator: '🤝',
};

export default function AgentConfigModal({ agent, onClose }: AgentConfigModalProps) {
    const router = useRouter();
    const emoji = AGENT_EMOJIS[agent.agent_type] || '🤖';
    const isProfile = 'id' in agent;
    const isEnabled = isProfile ? (agent as AgentProfile).is_enabled : true;

    const handleEditInTeams = () => {
        router.push('/ai-teams');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-2xl shadow-lg">
                            {emoji}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                {agent.display_name_cn || agent.display_name}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {agent.agent_type.replace(/_/g, ' ')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEnabled && (
                            <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                                已禁用
                            </span>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Model Configuration */}
                    <ConfigSection title="模型配置" icon={Bot}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">主模型</label>
                                <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-900">
                                    {agent.role_model.split('/').pop() || agent.role_model}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">备选模型</label>
                                <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                                    {agent.fallback_model?.split('/').pop() || '无'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Temperature</label>
                                <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-900">
                                    {agent.temperature}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Max Tokens</label>
                                <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-900">
                                    {agent.max_tokens}
                                </div>
                            </div>
                        </div>
                    </ConfigSection>

                    {/* Persona */}
                    <ConfigSection title="人设描述" icon={Sparkles}>
                        <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                            {agent.persona || '暂无描述'}
                        </div>
                    </ConfigSection>

                    {/* Traits */}
                    {agent.traits && Object.keys(agent.traits).length > 0 && (
                        <ConfigSection title="性格特征" icon={Sliders}>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(agent.traits).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-600 capitalize">
                                            {key.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {TRAIT_LABELS[value as string] || value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </ConfigSection>
                    )}

                    {/* Responsibilities */}
                    {agent.responsibilities && agent.responsibilities.length > 0 && (
                        <ConfigSection title="职责" icon={Zap}>
                            <div className="flex flex-wrap gap-2">
                                {agent.responsibilities.map((resp, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                                    >
                                        {resp}
                                    </span>
                                ))}
                            </div>
                        </ConfigSection>
                    )}

                    {/* Data Sources */}
                    {agent.data_sources && agent.data_sources.length > 0 && (
                        <ConfigSection title="数据源" icon={Database}>
                            <div className="flex flex-wrap gap-2">
                                {agent.data_sources.map((source, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                                    >
                                        {source}
                                    </span>
                                ))}
                            </div>
                        </ConfigSection>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <p className="text-xs text-gray-500">
                        💡 拖拽此 Agent 到画布添加到工作流
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            关闭
                        </button>
                        <button
                            onClick={handleEditInTeams}
                            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            在 Research Team 中编辑
                        </button>
                    </div>
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
