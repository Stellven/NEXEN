'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    BookOpen,
    Microscope,
    User,
    TrendingUp,
    Globe,
    MoreVertical,
    Edit,
    Trash2,
    Play,
    Copy,
    GitBranch,
    Loader2,
    Users,
    Brain,
    Search,
    Wrench,
    Target,
    ChevronDown,
    ChevronRight,
    Settings,
} from 'lucide-react';
import { workflowApi, agentApi, type AgentWorkflow, type AgentProfile, type DefaultAgentTemplate } from '@/lib/api';

// Icon mapping for templates
const TEMPLATE_ICONS: Record<string, any> = {
    BookOpen: BookOpen,
    Microscope: Microscope,
    User: User,
    TrendingUp: TrendingUp,
    Globe: Globe,
    Workflow: GitBranch,
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

// Cluster configuration
const CLUSTER_CONFIG: Record<string, { name: string; nameCn: string; icon: any; color: string; bgColor: string }> = {
    coordination: {
        name: 'Coordination',
        nameCn: '协调',
        icon: Target,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
    },
    reasoning: {
        name: 'Reasoning',
        nameCn: '推理',
        icon: Brain,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
    },
    information: {
        name: 'Information',
        nameCn: '信息收集',
        icon: Search,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
    },
    production: {
        name: 'Production',
        nameCn: '内容生产',
        icon: Wrench,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
    },
};

export default function WorkflowsPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<AgentWorkflow[]>([]);
    const [workflows, setWorkflows] = useState<AgentWorkflow[]>([]);
    const [agentProfiles, setAgentProfiles] = useState<AgentProfile[]>([]);
    const [defaultAgents, setDefaultAgents] = useState<DefaultAgentTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);
    const [expandedClusters, setExpandedClusters] = useState<string[]>(['coordination', 'reasoning', 'information', 'production']);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [templatesRes, workflowsRes, profilesRes, defaultsRes] = await Promise.all([
                workflowApi.getTemplates(),
                workflowApi.list(),
                agentApi.getProfiles(),
                agentApi.getDefaults(),
            ]);
            setTemplates(templatesRes.templates || []);
            setWorkflows(workflowsRes.workflows || []);
            setAgentProfiles(profilesRes.profiles || []);
            setDefaultAgents(defaultsRes.agents || []);
        } catch (err) {
            setError('Failed to load data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleCluster = (cluster: string) => {
        setExpandedClusters((prev) =>
            prev.includes(cluster)
                ? prev.filter((c) => c !== cluster)
                : [...prev, cluster]
        );
    };

    // Merge profiles with defaults - profiles take precedence
    const allAgents = defaultAgents.map((defaultAgent) => {
        const profile = agentProfiles.find((p) => p.agent_type === defaultAgent.agent_type);
        return profile || defaultAgent;
    });

    // Group agents by cluster
    const agentsByCluster = allAgents.reduce(
        (acc, agent) => {
            const cluster = agent.cluster || 'reasoning';
            if (!acc[cluster]) acc[cluster] = [];
            acc[cluster].push(agent);
            return acc;
        },
        {} as Record<string, (AgentProfile | DefaultAgentTemplate)[]>
    );

    // Custom agents (user-created)
    const customAgents = agentProfiles.filter((p) => p.is_custom);

    const handleUseTemplate = async (templateId: string) => {
        try {
            const result = await workflowApi.clone(templateId);
            router.push(`/library/workflows/${result.id}`);
        } catch (err) {
            console.error('Failed to clone template:', err);
        }
    };

    const handleCreateNew = async () => {
        try {
            const result = await workflowApi.create({
                name: 'New Workflow',
                name_cn: '新工作流',
                description: '',
                nodes: [],
                edges: [],
            });
            router.push(`/library/workflows/${result.id}`);
        } catch (err) {
            console.error('Failed to create workflow:', err);
        }
    };

    const handleEdit = (workflowId: string) => {
        router.push(`/library/workflows/${workflowId}`);
        setActionMenuId(null);
    };

    const handleDelete = async (workflowId: string) => {
        if (!confirm('Are you sure you want to delete this workflow?')) return;
        try {
            await workflowApi.delete(workflowId);
            setWorkflows(workflows.filter(w => w.id !== workflowId));
        } catch (err) {
            console.error('Failed to delete workflow:', err);
        }
        setActionMenuId(null);
    };

    const handleDuplicate = async (workflowId: string) => {
        try {
            const result = await workflowApi.clone(workflowId);
            setWorkflows([result, ...workflows]);
        } catch (err) {
            console.error('Failed to duplicate workflow:', err);
        }
        setActionMenuId(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Agent Workflows</h1>
                    <p className="text-gray-500 mt-1">
                        Configure multi-agent DAG workflows for research tasks
                    </p>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    New Workflow
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
                    {error}
                </div>
            )}

            {/* Templates Section */}
            <section className="mb-10">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Workflow Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {templates.map((template) => {
                        const IconComponent = TEMPLATE_ICONS[template.icon] || GitBranch;
                        return (
                            <div
                                key={template.id}
                                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <IconComponent className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                                <h3 className="font-semibold text-gray-900 mb-1">
                                    {template.name_cn || template.name}
                                </h3>
                                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                                    {template.description}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">
                                        {template.node_count} agents
                                    </span>
                                    <button
                                        onClick={() => handleUseTemplate(template.id)}
                                        className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        Use Template
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Agent List Section */}
            <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-800">Agent 列表</h2>
                        <span className="text-sm text-gray-400">
                            ({allAgents.length} 个默认 + {customAgents.length} 个自定义)
                        </span>
                    </div>
                    <button
                        onClick={() => router.push('/ai-teams')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        配置管理
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Cluster sections */}
                    {['coordination', 'reasoning', 'information', 'production'].map((cluster) => {
                        const agents = agentsByCluster[cluster] || [];
                        if (agents.length === 0) return null;

                        const config = CLUSTER_CONFIG[cluster];
                        const ClusterIcon = config?.icon || Brain;
                        const isExpanded = expandedClusters.includes(cluster);

                        return (
                            <div key={cluster} className="border-b border-gray-100 last:border-b-0">
                                {/* Cluster header */}
                                <button
                                    onClick={() => toggleCluster(cluster)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${config?.bgColor || 'bg-gray-50'}`}
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                    <ClusterIcon className={`w-4 h-4 ${config?.color || 'text-gray-600'}`} />
                                    <span className="font-medium text-gray-700">
                                        {config?.nameCn || cluster}
                                    </span>
                                    <span className="text-sm text-gray-400">
                                        ({agents.length} agents)
                                    </span>
                                </button>

                                {/* Agent cards */}
                                {isExpanded && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
                                        {agents.map((agent) => {
                                            const emoji = AGENT_EMOJIS[agent.agent_type] || '🤖';
                                            const isProfile = 'id' in agent;
                                            const isEnabled = isProfile ? (agent as AgentProfile).is_enabled : true;

                                            return (
                                                <div
                                                    key={agent.agent_type}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                                        !isEnabled
                                                            ? 'opacity-50 border-gray-200 bg-gray-50'
                                                            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                                                    }`}
                                                    onClick={() => router.push('/ai-teams')}
                                                >
                                                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${config?.bgColor || 'bg-gray-100'}`}>
                                                        {emoji}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-gray-900 truncate">
                                                                {agent.display_name_cn || agent.display_name}
                                                            </span>
                                                            {!isEnabled && (
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">
                                                                    已禁用
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-400 truncate">
                                                            {agent.role_model.split('/').pop()}
                                                        </div>
                                                    </div>
                                                    <Settings className="w-4 h-4 text-gray-300 hover:text-gray-500" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Custom agents section */}
                    {customAgents.length > 0 && (
                        <div className="border-t border-gray-200">
                            <button
                                onClick={() => toggleCluster('custom')}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-pink-50 hover:bg-pink-100 transition-colors"
                            >
                                {expandedClusters.includes('custom') ? (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="text-pink-500">✨</span>
                                <span className="font-medium text-gray-700">我的自定义 Agent</span>
                                <span className="text-sm text-gray-400">
                                    ({customAgents.length} agents)
                                </span>
                            </button>

                            {expandedClusters.includes('custom') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
                                    {customAgents.map((agent) => {
                                        const emoji = AGENT_EMOJIS[agent.agent_type] || '🤖';

                                        return (
                                            <div
                                                key={agent.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                                    !agent.is_enabled
                                                        ? 'opacity-50 border-gray-200 bg-gray-50'
                                                        : 'border-pink-200 bg-pink-50 hover:border-pink-300 hover:shadow-sm'
                                                }`}
                                                onClick={() => router.push('/ai-teams')}
                                            >
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 text-lg">
                                                    {emoji}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-gray-900 truncate">
                                                            {agent.display_name_cn || agent.display_name}
                                                        </span>
                                                        {!agent.is_enabled && (
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">
                                                                已禁用
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-400 truncate">
                                                        {agent.role_model.split('/').pop()}
                                                    </div>
                                                </div>
                                                <Settings className="w-4 h-4 text-gray-300 hover:text-gray-500" />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <p className="mt-3 text-xs text-gray-400">
                    💡 提示：Agent 配置与 Research Team 模块共享同一数据源，修改后会自动同步到所有工作流
                </p>
            </section>

            {/* My Workflows Section */}
            <section>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">My Workflows</h2>
                {workflows.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                        <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-4">
                            No workflows yet. Create one or use a template to get started.
                        </p>
                        <button
                            onClick={handleCreateNew}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Create Workflow
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Agents
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Updated
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {workflows.map((workflow) => (
                                    <tr key={workflow.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <GitBranch className="w-5 h-5 text-gray-400" />
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {workflow.name_cn || workflow.name}
                                                    </div>
                                                    {workflow.description && (
                                                        <div className="text-sm text-gray-500 truncate max-w-xs">
                                                            {workflow.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {workflow.node_count} agents
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    workflow.status === 'active'
                                                        ? 'bg-green-100 text-green-800'
                                                        : workflow.status === 'archived'
                                                        ? 'bg-gray-100 text-gray-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}
                                            >
                                                {workflow.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {workflow.updated_at
                                                ? new Date(workflow.updated_at).toLocaleDateString()
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right relative">
                                            <button
                                                onClick={() =>
                                                    setActionMenuId(
                                                        actionMenuId === workflow.id ? null : workflow.id
                                                    )
                                                }
                                                className="p-2 hover:bg-gray-100 rounded-lg"
                                            >
                                                <MoreVertical className="w-4 h-4 text-gray-400" />
                                            </button>

                                            {actionMenuId === workflow.id && (
                                                <div className="absolute right-6 top-12 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                                    <button
                                                        onClick={() => handleEdit(workflow.id)}
                                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDuplicate(workflow.id)}
                                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                        Duplicate
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(workflow.id)}
                                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Click outside to close action menu */}
            {actionMenuId && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setActionMenuId(null)}
                />
            )}
        </div>
    );
}
