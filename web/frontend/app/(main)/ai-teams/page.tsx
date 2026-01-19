'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Brain,
    Search,
    Wrench,
    Users as UsersIcon,
    Plus,
    Settings,
    Copy,
    Play,
    Trash2,
    X,
    Loader2,
    AlertCircle,
    ChevronRight,
    Check,
    Sliders,
    Bot,
    Sparkles,
    Database,
    Zap,
    Edit3,
    Save,
    RotateCcw,
    Activity,
} from 'lucide-react';
import {
    agentApi,
    AgentProfile,
    AgentProfileUpdate,
    DefaultAgentTemplate,
    PipelineConfig,
} from '@/lib/api';
import { MODEL_OPTIONS } from '@/lib/modelConfig';
import { useResearchTeamStore } from '@/lib/researchTeamStore';
import HierarchicalAgentGraph from '@/components/HierarchicalAgentGraph';
import AgentConfigModal from '@/components/AgentConfigModal';
import { wsClient, AgentStatusMessage, DataFlowMessage } from '@/lib/websocket';

// Workspace directory configuration
const DEFAULT_WORKSPACE_DIR = '/research_workspace';

// =============================================================================
// Types & Constants
// =============================================================================

type AgentCluster = 'reasoning' | 'information' | 'production' | 'coordination';

interface ClusterConfig {
    label: string;
    labelCn: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
}

const CLUSTER_CONFIG: Record<AgentCluster, ClusterConfig> = {
    reasoning: {
        label: 'Reasoning',
        labelCn: '推理集群',
        icon: Brain,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
    },
    information: {
        label: 'Information',
        labelCn: '信息集群',
        icon: Search,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
    },
    production: {
        label: 'Production',
        labelCn: '生产集群',
        icon: Wrench,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
    },
    coordination: {
        label: 'Coordination',
        labelCn: '协调集群',
        icon: UsersIcon,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
    },
};

const AGENT_ICONS: Record<string, string> = {
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
};

const TRAIT_OPTIONS = ['very_low', 'low', 'medium', 'high', 'very_high'];

// =============================================================================
// Component
// =============================================================================

export default function ResearchTeamPage() {
    // Persistent State (from zustand store)
    const {
        selectedCluster,
        setSelectedCluster,
        selectedProfileId,
        setSelectedProfileId,
    } = useResearchTeamStore();

    // State
    const [profiles, setProfiles] = useState<AgentProfile[]>([]);
    const [defaultAgents, setDefaultAgents] = useState<DefaultAgentTemplate[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<AgentProfile | null>(null);

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<string | null>(null);
    const [testTask, setTestTask] = useState('请简要分析 Transformer 架构的核心创新点');

    // Edit Form State
    const [editForm, setEditForm] = useState<AgentProfileUpdate>({});

    // Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [configModalAgentId, setConfigModalAgentId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Agent runtime states for visualization (will be populated via WebSocket)
    const [agentStates, setAgentStates] = useState<Map<string, {
        agentId: string;
        status: 'idle' | 'initializing' | 'running' | 'waiting' | 'completed' | 'failed';
        currentTask?: string;
        progress?: number;
    }>>(new Map());

    // Data flow events for animation
    const [dataFlows, setDataFlows] = useState<Array<{
        id: string;
        fromAgent: string;
        toAgent: string;
        progress: number;
    }>>([]);

    // Workspace configuration
    const [workspaceDir, setWorkspaceDir] = useState(DEFAULT_WORKSPACE_DIR);

    // Handle open workspace directory
    const handleOpenWorkspace = useCallback(() => {
        // In a web app, we can't directly open file system
        // But we can show the path or copy it
        navigator.clipboard.writeText(workspaceDir);
        alert(`工作区目录已复制到剪贴板:\n${workspaceDir}\n\n请在终端或文件管理器中打开此目录查看 Agent 输出文件。`);
    }, [workspaceDir]);

    // Restore selected profile from persisted ID
    useEffect(() => {
        if (selectedProfileId && profiles.length > 0) {
            const profile = profiles.find(p => p.id === selectedProfileId);
            if (profile) {
                setSelectedProfile(profile);
            }
        }
    }, [selectedProfileId, profiles]);

    // WebSocket connection for real-time agent status updates
    useEffect(() => {
        // Connect to WebSocket
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const wsUrl = apiUrl.replace('http', 'ws') + '/ws';
        wsClient.connect(wsUrl);

        // Subscribe to agent status updates
        const unsubAgentStatus = wsClient.onAgentStatus((message: AgentStatusMessage) => {
            setAgentStates(prev => {
                const newMap = new Map(prev);
                newMap.set(message.agent_id, {
                    agentId: message.agent_id,
                    status: message.status,
                    currentTask: message.task,
                    progress: message.progress,
                });
                return newMap;
            });
        });

        // Subscribe to data flow events
        const unsubDataFlow = wsClient.onDataFlow((message: DataFlowMessage) => {
            const flowId = `${message.from_agent}-${message.to_agent}-${Date.now()}`;
            setDataFlows(prev => [
                ...prev,
                {
                    id: flowId,
                    fromAgent: message.from_agent,
                    toAgent: message.to_agent,
                    progress: 0,
                },
            ]);

            // Auto-remove data flow after animation
            setTimeout(() => {
                setDataFlows(prev => prev.filter(f => f.id !== flowId));
            }, 2000);
        });

        return () => {
            unsubAgentStatus();
            unsubDataFlow();
        };
    }, []);

    // =============================================================================
    // Data Fetching
    // =============================================================================

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [profilesRes, defaultsRes] = await Promise.all([
                agentApi.getProfiles(),
                agentApi.getDefaults(),
            ]);
            setProfiles(profilesRes.profiles);
            setDefaultAgents(defaultsRes.agents);

            // Auto-initialize default agents if no default agents exist
            const hasDefaultAgents = profilesRes.profiles.some(p => !p.is_custom);
            if (!hasDefaultAgents && defaultsRes.agents.length > 0) {
                try {
                    await agentApi.initDefaults();
                    const newProfilesRes = await agentApi.getProfiles();
                    setProfiles(newProfilesRes.profiles);
                } catch {
                    // Ignore init errors
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    // =============================================================================
    // Handlers
    // =============================================================================

    const handleSelectProfile = (profile: AgentProfile) => {
        setSelectedProfile(profile);
        setSelectedProfileId(profile.id); // Persist to store
        setEditForm({});
        setIsEditing(false);
        setTestResult(null);
    };

    // Handle click on agent in hierarchical graph - opens config modal
    const handleAgentGraphClick = useCallback((agentId: string) => {
        const profile = profiles.find(p => p.agent_type === agentId);
        if (profile) {
            setConfigModalAgentId(agentId);
        }
    }, [profiles]);

    // Get profile for config modal
    const configModalProfile = configModalAgentId
        ? profiles.find(p => p.agent_type === configModalAgentId)
        : null;

    const handleStartEdit = () => {
        if (!selectedProfile) return;
        setEditForm({
            display_name: selectedProfile.display_name,
            display_name_cn: selectedProfile.display_name_cn,
            role_model: selectedProfile.role_model,
            fallback_model: selectedProfile.fallback_model,
            temperature: selectedProfile.temperature,
            max_tokens: selectedProfile.max_tokens,
            persona: selectedProfile.persona,
            traits: { ...selectedProfile.traits },
            responsibilities: [...selectedProfile.responsibilities],
            is_enabled: selectedProfile.is_enabled,
        });
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setEditForm({});
        setIsEditing(false);
    };

    const handleSaveEdit = async () => {
        if (!selectedProfile || isSubmitting) return;
        setIsSubmitting(true);
        setError(null);

        try {
            const updated = await agentApi.updateProfile(selectedProfile.id, editForm);
            setProfiles(profiles.map((p) => (p.id === updated.id ? updated : p)));
            setSelectedProfile(updated);
            setIsEditing(false);
            setEditForm({});
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save changes');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloneProfile = async (profile: AgentProfile) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setError(null);

        try {
            const cloned = await agentApi.cloneProfile(profile.id);
            setProfiles([cloned, ...profiles]);
            setSelectedProfile(cloned);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to clone agent');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProfile = async (profile: AgentProfile) => {
        if (!profile.is_custom) {
            setError('Cannot delete default agents');
            return;
        }
        if (!confirm(`确定要删除 "${profile.display_name}" 吗？`)) return;

        try {
            await agentApi.deleteProfile(profile.id);
            setProfiles(profiles.filter((p) => p.id !== profile.id));
            if (selectedProfile?.id === profile.id) {
                setSelectedProfile(null);
                setSelectedProfileId(null); // Clear from store
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete agent');
        }
    };

    const handleTestAgent = async () => {
        if (!selectedProfile || isTesting || !testTask.trim()) return;
        setIsTesting(true);
        setTestResult(null);
        setError(null);

        try {
            const result = await agentApi.testAgent(selectedProfile.id, testTask);
            setTestResult(result.result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Test failed');
        } finally {
            setIsTesting(false);
        }
    };

    const handleToggleEnabled = async (profile: AgentProfile) => {
        try {
            const updated = await agentApi.updateProfile(profile.id, {
                is_enabled: !profile.is_enabled,
            });
            setProfiles(profiles.map((p) => (p.id === updated.id ? updated : p)));
            if (selectedProfile?.id === updated.id) {
                setSelectedProfile(updated);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update agent');
        }
    };

    const handleResetToDefault = async () => {
        if (!selectedProfile) return;
        const defaultAgent = defaultAgents.find((a) => a.agent_type === selectedProfile.agent_type);
        if (!defaultAgent) return;

        if (!confirm('确定要重置为默认配置吗？所有自定义设置将丢失。')) return;

        try {
            const updated = await agentApi.updateProfile(selectedProfile.id, {
                role_model: defaultAgent.role_model,
                fallback_model: defaultAgent.fallback_model,
                temperature: defaultAgent.temperature,
                max_tokens: defaultAgent.max_tokens,
                persona: defaultAgent.persona,
                traits: defaultAgent.traits,
                responsibilities: defaultAgent.responsibilities,
            });
            setProfiles(profiles.map((p) => (p.id === updated.id ? updated : p)));
            setSelectedProfile(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reset agent');
        }
    };

    // =============================================================================
    // Filtered Profiles
    // =============================================================================

    const filteredProfiles = profiles.filter((p) => {
        if (selectedCluster === 'all') return true;
        if (selectedCluster === 'custom') return p.is_custom;
        return p.cluster === selectedCluster;
    });

    const groupedProfiles = filteredProfiles.reduce(
        (acc, profile) => {
            const cluster = profile.cluster as AgentCluster;
            if (!acc[cluster]) acc[cluster] = [];
            acc[cluster].push(profile);
            return acc;
        },
        {} as Record<AgentCluster, AgentProfile[]>
    );

    // =============================================================================
    // Render
    // =============================================================================

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="min-h-full overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Research Team</h1>
                        <p className="text-sm text-gray-500">配置和管理您的 AI 研究团队成员</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                    >
                        <Plus className="h-4 w-4" />
                        创建自定义 Agent
                    </button>
                </div>

                {/* Cluster Tabs */}
                <div className="mt-4 flex gap-2">
                    <button
                        onClick={() => setSelectedCluster('all')}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                            selectedCluster === 'all'
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        全部
                    </button>
                    {(Object.keys(CLUSTER_CONFIG) as AgentCluster[]).map((cluster) => {
                        const config = CLUSTER_CONFIG[cluster];
                        const Icon = config.icon;
                        return (
                            <button
                                key={cluster}
                                onClick={() => setSelectedCluster(cluster)}
                                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                                    selectedCluster === cluster
                                        ? `${config.bgColor} ${config.color}`
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {config.labelCn}
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setSelectedCluster('custom')}
                        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                            selectedCluster === 'custom'
                                ? 'bg-pink-100 text-pink-600'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        我的自定义
                    </button>
                </div>
            </div>

            {/* Hierarchical Agent Graph */}
            <div className="bg-white px-6 py-4">
                <HierarchicalAgentGraph
                    onAgentClick={handleAgentGraphClick}
                    selectedAgentId={configModalAgentId}
                    enabledAgents={new Set(profiles.filter(p => p.is_enabled).map(p => p.agent_type))}
                    agentStates={agentStates}
                    workspaceDir={workspaceDir}
                    onOpenWorkspace={handleOpenWorkspace}
                />
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="flex flex-col lg:flex-row">
                {/* Agent List */}
                <div className="w-full lg:w-80 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 p-4">
                    {selectedCluster === 'all' ? (
                        // Grouped by cluster
                        (Object.keys(CLUSTER_CONFIG) as AgentCluster[]).map((cluster) => {
                            const clusterProfiles = groupedProfiles[cluster] || [];
                            if (clusterProfiles.length === 0) return null;
                            const config = CLUSTER_CONFIG[cluster];
                            const Icon = config.icon;

                            return (
                                <div key={cluster} className="mb-6">
                                    <div className="mb-2 flex items-center gap-2 px-2">
                                        <Icon className={`h-4 w-4 ${config.color}`} />
                                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            {config.labelCn}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {clusterProfiles.map((profile) => (
                                            <AgentCard
                                                key={profile.id}
                                                profile={profile}
                                                isSelected={selectedProfile?.id === profile.id}
                                                onSelect={() => handleSelectProfile(profile)}
                                                onToggle={() => handleToggleEnabled(profile)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        // Flat list
                        <div className="space-y-1">
                            {filteredProfiles.map((profile) => (
                                <AgentCard
                                    key={profile.id}
                                    profile={profile}
                                    isSelected={selectedProfile?.id === profile.id}
                                    onSelect={() => handleSelectProfile(profile)}
                                    onToggle={() => handleToggleEnabled(profile)}
                                />
                            ))}
                            {filteredProfiles.length === 0 && (
                                <div className="py-8 text-center text-sm text-gray-500">
                                    暂无 Agent
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Detail Panel */}
                <div className="flex-1 bg-white min-h-[400px]">
                    {selectedProfile ? (
                        <div className="p-6">
                            {/* Profile Header */}
                            <div className="mb-6 flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-3xl">
                                        {AGENT_ICONS[selectedProfile.agent_type] || '🤖'}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">
                                            {selectedProfile.display_name}
                                        </h2>
                                        <p className="text-gray-500">{selectedProfile.display_name_cn}</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    CLUSTER_CONFIG[selectedProfile.cluster as AgentCluster]?.bgColor || 'bg-gray-100'
                                                } ${CLUSTER_CONFIG[selectedProfile.cluster as AgentCluster]?.color || 'text-gray-600'}`}
                                            >
                                                {CLUSTER_CONFIG[selectedProfile.cluster as AgentCluster]?.labelCn || selectedProfile.cluster}
                                            </span>
                                            {selectedProfile.is_custom && (
                                                <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-600">
                                                    自定义
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isEditing ? (
                                        <>
                                            <button
                                                onClick={handleStartEdit}
                                                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                                            >
                                                <Edit3 className="h-4 w-4" />
                                                编辑
                                            </button>
                                            <button
                                                onClick={() => handleCloneProfile(selectedProfile)}
                                                disabled={isSubmitting}
                                                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                <Copy className="h-4 w-4" />
                                                克隆
                                            </button>
                                            {!selectedProfile.is_custom && (
                                                <button
                                                    onClick={handleResetToDefault}
                                                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                    重置
                                                </button>
                                            )}
                                            {selectedProfile.is_custom && (
                                                <button
                                                    onClick={() => handleDeleteProfile(selectedProfile)}
                                                    className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    删除
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                                            >
                                                取消
                                            </button>
                                            <button
                                                onClick={handleSaveEdit}
                                                disabled={isSubmitting}
                                                className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:bg-gray-300"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="h-4 w-4" />
                                                )}
                                                保存
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Configuration Sections */}
                            <div className="space-y-6">
                                {/* Model Configuration */}
                                <ConfigSection title="模型配置" icon={Bot}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                主模型
                                            </label>
                                            {isEditing ? (
                                                <select
                                                    value={editForm.role_model || selectedProfile.role_model}
                                                    onChange={(e) =>
                                                        setEditForm({ ...editForm, role_model: e.target.value })
                                                    }
                                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                                >
                                                    {MODEL_OPTIONS.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label} ({opt.provider})
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                                    {selectedProfile.role_model}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                备选模型
                                            </label>
                                            {isEditing ? (
                                                <select
                                                    value={editForm.fallback_model || selectedProfile.fallback_model || ''}
                                                    onChange={(e) =>
                                                        setEditForm({ ...editForm, fallback_model: e.target.value || undefined })
                                                    }
                                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                                >
                                                    <option value="">无</option>
                                                    {MODEL_OPTIONS.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label} ({opt.provider})
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                                    {selectedProfile.fallback_model || '无'}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                Temperature
                                            </label>
                                            {isEditing ? (
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="1"
                                                        step="0.1"
                                                        value={editForm.temperature ?? selectedProfile.temperature}
                                                        onChange={(e) =>
                                                            setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })
                                                        }
                                                        className="flex-1"
                                                    />
                                                    <span className="w-10 text-sm font-medium text-gray-700">
                                                        {editForm.temperature ?? selectedProfile.temperature}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                                    {selectedProfile.temperature}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                Max Tokens
                                            </label>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editForm.max_tokens ?? selectedProfile.max_tokens}
                                                    onChange={(e) =>
                                                        setEditForm({ ...editForm, max_tokens: parseInt(e.target.value) })
                                                    }
                                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                                />
                                            ) : (
                                                <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                                    {selectedProfile.max_tokens}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </ConfigSection>

                                {/* Persona */}
                                <ConfigSection title="人设描述" icon={Sparkles}>
                                    {isEditing ? (
                                        <textarea
                                            value={editForm.persona ?? selectedProfile.persona}
                                            onChange={(e) => setEditForm({ ...editForm, persona: e.target.value })}
                                            rows={4}
                                            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                            placeholder="描述 Agent 的角色、专长和行为方式..."
                                        />
                                    ) : (
                                        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                                            {selectedProfile.persona || '暂无描述'}
                                        </div>
                                    )}
                                </ConfigSection>

                                {/* Responsibilities */}
                                <ConfigSection title="职责" icon={Zap}>
                                    <div className="flex flex-wrap gap-2">
                                        {(isEditing ? editForm.responsibilities || selectedProfile.responsibilities : selectedProfile.responsibilities).map(
                                            (resp, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                                                >
                                                    {resp}
                                                    {isEditing && (
                                                        <button
                                                            onClick={() => {
                                                                const newResp = [...(editForm.responsibilities || selectedProfile.responsibilities)];
                                                                newResp.splice(index, 1);
                                                                setEditForm({ ...editForm, responsibilities: newResp });
                                                            }}
                                                            className="ml-1 text-blue-400 hover:text-blue-600"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </span>
                                            )
                                        )}
                                        {isEditing && (
                                            <button
                                                onClick={() => {
                                                    const newResp = prompt('输入新职责:');
                                                    if (newResp) {
                                                        setEditForm({
                                                            ...editForm,
                                                            responsibilities: [
                                                                ...(editForm.responsibilities || selectedProfile.responsibilities),
                                                                newResp,
                                                            ],
                                                        });
                                                    }
                                                }}
                                                className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500"
                                            >
                                                <Plus className="h-3 w-3" />
                                                添加
                                            </button>
                                        )}
                                    </div>
                                </ConfigSection>

                                {/* Traits */}
                                <ConfigSection title="性格特征" icon={Sliders}>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries(selectedProfile.traits).map(([key, value]) => (
                                            <div key={key}>
                                                <label className="mb-1 block text-sm font-medium text-gray-700 capitalize">
                                                    {key.replace(/_/g, ' ')}
                                                </label>
                                                {isEditing ? (
                                                    <select
                                                        value={(editForm.traits?.[key] || value) as string}
                                                        onChange={(e) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                traits: {
                                                                    ...(editForm.traits || selectedProfile.traits),
                                                                    [key]: e.target.value,
                                                                },
                                                            })
                                                        }
                                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
                                                    >
                                                        {TRAIT_OPTIONS.map((opt) => (
                                                            <option key={opt} value={opt}>
                                                                {opt.replace(/_/g, ' ')}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 capitalize">
                                                        {(value as string).replace(/_/g, ' ')}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </ConfigSection>

                                {/* Data Sources */}
                                <ConfigSection title="数据源" icon={Database}>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProfile.data_sources.length > 0 ? (
                                            selectedProfile.data_sources.map((source, index) => (
                                                <span
                                                    key={index}
                                                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                                                >
                                                    {source}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-sm text-gray-500">暂无配置</span>
                                        )}
                                    </div>
                                </ConfigSection>

                                {/* Test Agent */}
                                <ConfigSection title="测试 Agent" icon={Play}>
                                    <div className="space-y-3">
                                        <textarea
                                            value={testTask}
                                            onChange={(e) => setTestTask(e.target.value)}
                                            rows={2}
                                            placeholder="输入测试任务..."
                                            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                        />
                                        <button
                                            onClick={handleTestAgent}
                                            disabled={isTesting || !testTask.trim()}
                                            className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:bg-gray-300"
                                        >
                                            {isTesting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Play className="h-4 w-4" />
                                            )}
                                            {isTesting ? '运行中...' : '运行测试'}
                                        </button>
                                        {testResult && (
                                            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                                                <h4 className="mb-2 text-sm font-medium text-green-800">测试结果</h4>
                                                <div className="text-sm text-green-700 whitespace-pre-wrap">
                                                    {testResult}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ConfigSection>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                            <Bot className="mb-4 h-16 w-16 text-gray-300" />
                            <h3 className="text-lg font-medium text-gray-900">选择一个 Agent</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                从左侧列表选择一个 Agent 查看和编辑配置
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Custom Agent Modal */}
            {showCreateModal && (
                <CreateAgentModal
                    defaultAgents={defaultAgents}
                    onClose={() => setShowCreateModal(false)}
                    onCreate={async (data) => {
                        try {
                            const created = await agentApi.createProfile(data);
                            setProfiles([created, ...profiles]);
                            setSelectedProfile(created);
                            setShowCreateModal(false);
                        } catch (err) {
                            throw err;
                        }
                    }}
                />
            )}

            {/* Agent Config Modal */}
            {configModalProfile && (
                <AgentConfigModal
                    profile={configModalProfile}
                    defaultAgent={defaultAgents.find(a => a.agent_type === configModalProfile.agent_type)}
                    onClose={() => setConfigModalAgentId(null)}
                    onSave={async (updates) => {
                        const updated = await agentApi.updateProfile(configModalProfile.id, updates);
                        setProfiles(profiles.map((p) => (p.id === updated.id ? updated : p)));
                        if (selectedProfile?.id === updated.id) {
                            setSelectedProfile(updated);
                        }
                    }}
                    onTest={async (task) => {
                        const result = await agentApi.testAgent(configModalProfile.id, task);
                        return result.result;
                    }}
                    onClone={async () => {
                        const cloned = await agentApi.cloneProfile(configModalProfile.id);
                        setProfiles([cloned, ...profiles]);
                        setConfigModalAgentId(cloned.agent_type);
                    }}
                    onDelete={async () => {
                        if (!configModalProfile.is_custom) {
                            throw new Error('Cannot delete default agents');
                        }
                        await agentApi.deleteProfile(configModalProfile.id);
                        setProfiles(profiles.filter((p) => p.id !== configModalProfile.id));
                        setConfigModalAgentId(null);
                    }}
                    onReset={async () => {
                        const defaultAgent = defaultAgents.find((a) => a.agent_type === configModalProfile.agent_type);
                        if (!defaultAgent) throw new Error('No default configuration found');
                        const updated = await agentApi.updateProfile(configModalProfile.id, {
                            role_model: defaultAgent.role_model,
                            fallback_model: defaultAgent.fallback_model,
                            temperature: defaultAgent.temperature,
                            max_tokens: defaultAgent.max_tokens,
                            persona: defaultAgent.persona,
                            traits: defaultAgent.traits,
                            responsibilities: defaultAgent.responsibilities,
                        });
                        setProfiles(profiles.map((p) => (p.id === updated.id ? updated : p)));
                    }}
                    onToggleEnabled={async () => {
                        const updated = await agentApi.updateProfile(configModalProfile.id, {
                            is_enabled: !configModalProfile.is_enabled,
                        });
                        setProfiles(profiles.map((p) => (p.id === updated.id ? updated : p)));
                    }}
                />
            )}
        </div>
    );
}

// =============================================================================
// Sub Components
// =============================================================================

interface AgentCardProps {
    profile: AgentProfile;
    isSelected: boolean;
    onSelect: () => void;
    onToggle: () => void;
}

function AgentCard({ profile, isSelected, onSelect, onToggle }: AgentCardProps) {
    return (
        <div
            onClick={onSelect}
            className={`cursor-pointer rounded-lg border p-3 transition-all ${
                isSelected
                    ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50'
            }`}
        >
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-lg">
                    {AGENT_ICONS[profile.agent_type] || '🤖'}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{profile.display_name}</h4>
                    <p className="text-xs text-gray-500 truncate">{profile.display_name_cn}</p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle();
                    }}
                    className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
                        profile.is_enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                >
                    <div
                        className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            profile.is_enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                    />
                </button>
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

interface CreateAgentModalProps {
    defaultAgents: DefaultAgentTemplate[];
    onClose: () => void;
    onCreate: (data: {
        agent_type: string;
        display_name: string;
        display_name_cn: string;
        cluster?: AgentCluster;
        role_model: string;
        persona?: string;
    }) => Promise<void>;
}

function CreateAgentModal({ defaultAgents, onClose, onCreate }: CreateAgentModalProps) {
    const [step, setStep] = useState<'select' | 'customize'>('select');
    const [selectedBase, setSelectedBase] = useState<DefaultAgentTemplate | null>(null);
    const [formData, setFormData] = useState({
        agent_type: '',
        display_name: '',
        display_name_cn: '',
        cluster: 'reasoning' as AgentCluster,
        role_model: 'openai/gpt-4o',
        persona: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSelectBase = (agent: DefaultAgentTemplate | null) => {
        if (agent) {
            setSelectedBase(agent);
            setFormData({
                agent_type: `custom_${agent.agent_type}`,
                display_name: `${agent.display_name} (Custom)`,
                display_name_cn: `${agent.display_name_cn} (自定义)`,
                cluster: agent.cluster as AgentCluster,
                role_model: agent.role_model,
                persona: agent.persona,
            });
        } else {
            setSelectedBase(null);
            setFormData({
                agent_type: 'custom_agent',
                display_name: '',
                display_name_cn: '',
                cluster: 'reasoning',
                role_model: 'openai/gpt-4o',
                persona: '',
            });
        }
        setStep('customize');
    };

    const handleCreate = async () => {
        if (!formData.display_name.trim() || isSubmitting) return;
        setIsSubmitting(true);
        setError(null);

        try {
            await onCreate({
                ...formData,
                agent_type: formData.agent_type || `custom_${Date.now()}`,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create agent');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white">
                <div className="sticky top-0 border-b border-gray-200 bg-white px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {step === 'select' ? '选择基础模板' : '配置自定义 Agent'}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="p-6">
                    {step === 'select' ? (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">
                                选择一个默认 Agent 作为基础，或从头开始创建
                            </p>

                            {/* Start from scratch */}
                            <button
                                onClick={() => handleSelectBase(null)}
                                className="flex w-full items-center gap-4 rounded-lg border-2 border-dashed border-gray-300 p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xl">
                                    ✨
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">从头开始</h4>
                                    <p className="text-sm text-gray-500">创建一个全新的自定义 Agent</p>
                                </div>
                                <ChevronRight className="ml-auto h-5 w-5 text-gray-400" />
                            </button>

                            {/* Default agents as templates */}
                            <div className="grid grid-cols-2 gap-3">
                                {defaultAgents.map((agent) => (
                                    <button
                                        key={agent.agent_type}
                                        onClick={() => handleSelectBase(agent)}
                                        className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-lg">
                                            {AGENT_ICONS[agent.agent_type] || '🤖'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-gray-900 truncate">
                                                {agent.display_name}
                                            </h4>
                                            <p className="text-xs text-gray-500 truncate">
                                                {agent.display_name_cn}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <button
                                onClick={() => setStep('select')}
                                className="text-sm text-blue-500 hover:text-blue-600"
                            >
                                ← 返回选择模板
                            </button>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        名称 (EN)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.display_name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, display_name: e.target.value })
                                        }
                                        placeholder="My Custom Agent"
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        名称 (CN)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.display_name_cn}
                                        onChange={(e) =>
                                            setFormData({ ...formData, display_name_cn: e.target.value })
                                        }
                                        placeholder="我的自定义 Agent"
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        集群
                                    </label>
                                    <select
                                        value={formData.cluster}
                                        onChange={(e) =>
                                            setFormData({ ...formData, cluster: e.target.value as AgentCluster })
                                        }
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
                                    >
                                        {(Object.keys(CLUSTER_CONFIG) as AgentCluster[]).map((cluster) => (
                                            <option key={cluster} value={cluster}>
                                                {CLUSTER_CONFIG[cluster].labelCn}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        模型
                                    </label>
                                    <select
                                        value={formData.role_model}
                                        onChange={(e) =>
                                            setFormData({ ...formData, role_model: e.target.value })
                                        }
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
                                    >
                                        {MODEL_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    人设描述
                                </label>
                                <textarea
                                    value={formData.persona}
                                    onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                                    rows={4}
                                    placeholder="描述 Agent 的角色、专长和行为方式..."
                                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {step === 'customize' && (
                    <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4">
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!formData.display_name.trim() || isSubmitting}
                                className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:bg-gray-300"
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                创建 Agent
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
