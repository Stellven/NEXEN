'use client';

import { useState, useEffect } from 'react';
import {
    Brain,
    Search,
    BookOpen,
    Users,
    MessageSquare,
    Lightbulb,
    Target,
    Globe,
    FileText,
    Database,
    Eye,
    Compass,
    GitBranch,
    ChevronDown,
    ChevronRight,
    Loader2,
    Wrench,
} from 'lucide-react';
import { agentApi, AgentProfile, DefaultAgentTemplate } from '@/lib/api';

// Agent type to icon mapping
const AGENT_ICONS: Record<string, any> = {
    meta_coordinator: Target,
    explorer: Search,
    logician: Brain,
    connector: GitBranch,
    critic: Eye,
    scribe: FileText,
    archivist: Database,
    historian: BookOpen,
    genealogist: Users,
    social_scout: Globe,
    cn_specialist: Compass,
    vision_analyst: Eye,
    builder: Lightbulb,
    collaborator: MessageSquare,
    prompt_engineer: Lightbulb,
};

// Cluster configuration
const CLUSTER_CONFIG: Record<string, { name: string; nameCn: string; icon: any; color: string }> = {
    coordination: {
        name: 'Coordination',
        nameCn: '协调',
        icon: Target,
        color: 'text-orange-600',
    },
    reasoning: {
        name: 'Reasoning',
        nameCn: '推理',
        icon: Brain,
        color: 'text-purple-600',
    },
    information: {
        name: 'Information',
        nameCn: '信息收集',
        icon: Search,
        color: 'text-blue-600',
    },
    production: {
        name: 'Production',
        nameCn: '内容生产',
        icon: Wrench,
        color: 'text-green-600',
    },
};

// Agent emoji mapping (same as Research Team)
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

interface AgentPaletteProps {
    isLocked: boolean;
    onAgentClick?: (agent: AgentProfile | DefaultAgentTemplate) => void;
}

export default function AgentPalette({ isLocked, onAgentClick }: AgentPaletteProps) {
    const [profiles, setProfiles] = useState<AgentProfile[]>([]);
    const [defaults, setDefaults] = useState<DefaultAgentTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([
        'coordination',
        'reasoning',
        'information',
        'production',
    ]);

    useEffect(() => {
        loadAgents();
    }, []);

    const loadAgents = async () => {
        try {
            setLoading(true);
            const [profilesRes, defaultsRes] = await Promise.all([
                agentApi.getProfiles(),
                agentApi.getDefaults(),
            ]);
            setProfiles(profilesRes.profiles);
            setDefaults(defaultsRes.agents);
        } catch (err) {
            console.error('Failed to load agents:', err);
            // Use defaults as fallback
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories((prev) =>
            prev.includes(categoryId)
                ? prev.filter((id) => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const handleDragStart = (e: React.DragEvent, agent: AgentProfile | DefaultAgentTemplate) => {
        if (isLocked) {
            e.preventDefault();
            return;
        }
        // Pass basic info
        e.dataTransfer.setData('agentType', agent.agent_type);
        e.dataTransfer.setData('agentLabel', agent.display_name_cn || agent.display_name);
        e.dataTransfer.setData('agentCluster', agent.cluster);

        // Pass full agent config as JSON
        const agentConfig = {
            roleModel: agent.role_model,
            fallbackModel: agent.fallback_model || '',
            temperature: agent.temperature,
            maxTokens: agent.max_tokens,
            persona: agent.persona,
            traits: agent.traits || {},
            responsibilities: agent.responsibilities || [],
            dataSources: agent.data_sources || [],
        };
        e.dataTransfer.setData('agentConfig', JSON.stringify(agentConfig));
        e.dataTransfer.effectAllowed = 'copy';
    };

    // Group agents by cluster - use profiles if available, otherwise use defaults
    const agentsByCluster = (profiles.length > 0 ? profiles : defaults).reduce(
        (acc, agent) => {
            const cluster = agent.cluster || 'reasoning';
            if (!acc[cluster]) acc[cluster] = [];
            acc[cluster].push(agent);
            return acc;
        },
        {} as Record<string, (AgentProfile | DefaultAgentTemplate)[]>
    );

    // Order clusters
    const clusterOrder = ['coordination', 'reasoning', 'information', 'production'];

    if (loading) {
        return (
            <div className="w-56 bg-white border-r border-gray-200 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="w-56 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700">Agents</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                    Drag to canvas to add
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {clusterOrder.map((cluster) => {
                    const agents = agentsByCluster[cluster] || [];
                    if (agents.length === 0) return null;

                    const config = CLUSTER_CONFIG[cluster];
                    const ClusterIcon = config?.icon || Brain;

                    return (
                        <div key={cluster} className="mb-2">
                            <button
                                onClick={() => toggleCategory(cluster)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded transition-colors"
                            >
                                {expandedCategories.includes(cluster) ? (
                                    <ChevronDown className="w-3 h-3" />
                                ) : (
                                    <ChevronRight className="w-3 h-3" />
                                )}
                                <ClusterIcon className={`w-3 h-3 ${config?.color || 'text-gray-600'}`} />
                                <span>{config?.nameCn || cluster}</span>
                                <span className="ml-auto text-gray-400">
                                    {agents.length}
                                </span>
                            </button>

                            {expandedCategories.includes(cluster) && (
                                <div className="mt-1 space-y-1">
                                    {agents.map((agent) => {
                                        const Icon = AGENT_ICONS[agent.agent_type] || Brain;
                                        const emoji = AGENT_EMOJIS[agent.agent_type] || '🤖';
                                        const isEnabled = 'is_enabled' in agent ? agent.is_enabled : true;

                                        return (
                                            <div
                                                key={agent.agent_type}
                                                draggable={!isLocked && isEnabled}
                                                onDragStart={(e) => handleDragStart(e, agent)}
                                                onClick={() => onAgentClick?.(agent)}
                                                className={`flex items-center gap-2 px-2 py-2 rounded-lg border transition-all ${
                                                    isLocked || !isEnabled
                                                        ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
                                                        : 'cursor-pointer hover:shadow-md hover:border-blue-300 border-gray-200 bg-white'
                                                }`}
                                                title={`点击查看配置，拖拽添加到画布\n${agent.display_name}\n${agent.persona?.substring(0, 100) || ''}`}
                                            >
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-sm">
                                                    {emoji}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-medium text-gray-900 truncate">
                                                        {agent.display_name_cn || agent.display_name}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 truncate">
                                                        {agent.role_model.split('/').pop()}
                                                    </div>
                                                </div>
                                                {!isEnabled && (
                                                    <span className="text-[9px] text-gray-400">
                                                        已禁用
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Custom agents section */}
                {profiles.filter(p => p.is_custom).length > 0 && (
                    <div className="mb-2 border-t border-gray-100 pt-2 mt-2">
                        <button
                            onClick={() => toggleCategory('custom')}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded transition-colors"
                        >
                            {expandedCategories.includes('custom') ? (
                                <ChevronDown className="w-3 h-3" />
                            ) : (
                                <ChevronRight className="w-3 h-3" />
                            )}
                            <span className="text-pink-500">✨</span>
                            <span>我的自定义</span>
                            <span className="ml-auto text-gray-400">
                                {profiles.filter(p => p.is_custom).length}
                            </span>
                        </button>

                        {expandedCategories.includes('custom') && (
                            <div className="mt-1 space-y-1">
                                {profiles.filter(p => p.is_custom).map((agent) => {
                                    const emoji = AGENT_EMOJIS[agent.agent_type] || '🤖';

                                    return (
                                        <div
                                            key={agent.id}
                                            draggable={!isLocked && agent.is_enabled}
                                            onDragStart={(e) => handleDragStart(e, agent)}
                                            onClick={() => onAgentClick?.(agent)}
                                            className={`flex items-center gap-2 px-2 py-2 rounded-lg border transition-all ${
                                                isLocked || !agent.is_enabled
                                                    ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
                                                    : 'cursor-pointer hover:shadow-md hover:border-pink-300 border-pink-200 bg-pink-50'
                                            }`}
                                            title={`点击查看配置，拖拽添加到画布\n${agent.persona?.substring(0, 100) || ''}`}
                                        >
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 text-sm">
                                                {emoji}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium text-gray-900 truncate">
                                                    {agent.display_name_cn || agent.display_name}
                                                </div>
                                                <div className="text-[10px] text-gray-400 truncate">
                                                    {agent.role_model.split('/').pop()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isLocked && (
                <div className="p-3 bg-amber-50 border-t border-amber-200">
                    <p className="text-xs text-amber-700">
                        Canvas is locked. Unlock to add agents.
                    </p>
                </div>
            )}
        </div>
    );
}
