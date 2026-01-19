'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    Play,
    Download,
    Lock,
    Unlock,
    ZoomIn,
    ZoomOut,
    Maximize,
    Loader2,
    Trash2,
    Settings,
} from 'lucide-react';
import {
    workflowApi,
    agentApi,
    type AgentWorkflow,
    type WorkflowNode,
    type WorkflowEdge,
    type AgentProfile,
    type DefaultAgentTemplate,
    type WorkflowMission,
    type WorkflowMissionSubTask,
} from '@/lib/api';
import { useWorkflowStore, validateDAG } from '@/lib/workflowStore';
import WorkflowCanvas from '@/components/workflows/WorkflowCanvas';
import AgentPalette from '@/components/workflows/AgentPalette';
import ConnectionConfigModal from '@/components/workflows/ConnectionConfigModal';
import NodeConfigModal from '@/components/workflows/NodeConfigModal';
import AgentConfigModal from '@/components/workflows/AgentConfigModal';
import CreateMissionModal from '@/components/workflows/CreateMissionModal';
import MissionPanel, { type Mission, type SubTask } from '@/components/workflows/MissionPanel';
import MissionActionBar from '@/components/workflows/MissionActionBar';

export default function WorkflowEditorPage() {
    const router = useRouter();
    const params = useParams();
    const workflowId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingName, setEditingName] = useState(false);
    const [workflowName, setWorkflowName] = useState('');
    const [showEdgeConfig, setShowEdgeConfig] = useState(false);
    const [showNodeConfig, setShowNodeConfig] = useState(false);
    const [showAgentConfig, setShowAgentConfig] = useState(false);
    const [selectedPaletteAgent, setSelectedPaletteAgent] = useState<AgentProfile | DefaultAgentTemplate | null>(null);
    const [pendingEdge, setPendingEdge] = useState<{ sourceId: string; targetId: string } | null>(null);
    const [agentProfiles, setAgentProfiles] = useState<AgentProfile[]>([]);
    const [defaultAgents, setDefaultAgents] = useState<DefaultAgentTemplate[]>([]);

    // Mission state
    const [showMissionPanel, setShowMissionPanel] = useState(false);
    const [showCreateMission, setShowCreateMission] = useState(false);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [isExecutingMission, setIsExecutingMission] = useState(false);
    const [loadingMissions, setLoadingMissions] = useState(false);
    const [autoSelectMissionId, setAutoSelectMissionId] = useState<string | null>(null);

    const {
        currentWorkflow,
        isDirty,
        selectedNodeId,
        selectedEdgeId,
        zoom,
        isLocked,
        loadWorkflow,
        setWorkflow,
        setZoom,
        setLocked,
        removeNode,
        removeEdge,
        completeConnection,
        updateEdge,
        selectNode,
        selectEdge,
    } = useWorkflowStore();

    useEffect(() => {
        loadWorkflowData();
    }, [workflowId]);

    const loadWorkflowData = async () => {
        try {
            setLoading(true);
            const [workflow, profilesRes, defaultsRes, missionsRes] = await Promise.all([
                workflowApi.get(workflowId),
                agentApi.getProfiles(),
                agentApi.getDefaults(),
                workflowApi.listMissions(workflowId).catch(() => ({ missions: [] })),
            ]);
            loadWorkflow(workflow);
            setWorkflowName(workflow.name_cn || workflow.name);
            setAgentProfiles(profilesRes.profiles || []);
            setDefaultAgents(defaultsRes.agents || []);

            // Convert API missions to local Mission type
            const loadedMissions: Mission[] = (missionsRes.missions || []).map((m: WorkflowMission) => ({
                id: m.id,
                workflow_id: m.workflow_id,
                leader_type: m.leader_type,
                leader_name: m.leader_name,
                description: m.description,
                status: m.status as Mission['status'],
                progress: m.progress,
                sub_tasks: m.sub_tasks as SubTask[],
                result: m.result,
                created_at: m.created_at,
                updated_at: m.updated_at,
            }));
            setMissions(loadedMissions);
        } catch (err) {
            setError('Failed to load workflow');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePaletteAgentClick = (agent: AgentProfile | DefaultAgentTemplate) => {
        setSelectedPaletteAgent(agent);
        setShowAgentConfig(true);
    };

    // Helper to get agent profile by type
    const getAgentProfileByType = (agentType: string): AgentProfile | DefaultAgentTemplate | null => {
        const profile = agentProfiles.find(p => p.agent_type === agentType);
        if (profile) return profile;
        return defaultAgents.find(d => d.agent_type === agentType) || null;
    };

    // Get all available agents (merge profiles with defaults)
    const allAgents = defaultAgents.map((defaultAgent) => {
        const profile = agentProfiles.find((p) => p.agent_type === defaultAgent.agent_type);
        return profile || defaultAgent;
    });

    // Mission helpers
    const hasRunningMission = missions.some((m) => m.status === 'running');
    const hasPendingMission = missions.some((m) => m.status === 'pending');

    // Generate sub-tasks from workflow nodes
    const generateSubTasks = (missionDescription: string): SubTask[] => {
        if (!currentWorkflow?.nodes || currentWorkflow.nodes.length === 0) {
            // Default sub-tasks if no nodes
            const defaultAgentTypes = ['meta_coordinator', 'explorer', 'logician', 'connector', 'scribe'];
            const defaultTitles = ['任务分析与规划', '信息收集与研究', '数据整合与分析', '结果生成与验证', '最终报告输出'];
            return defaultAgentTypes.map((agentType, index) => {
                const agent = allAgents.find(a => a.agent_type === agentType);
                return {
                    id: `st-${index + 1}`,
                    title: defaultTitles[index],
                    agent_type: agentType,
                    agent_name: agent?.display_name_cn || agent?.display_name || agentType,
                    status: 'pending' as const,
                    input: index === 0 ? missionDescription : undefined,
                };
            });
        }

        // Generate sub-tasks based on workflow nodes
        return currentWorkflow.nodes.map((node, index) => {
            const agent = allAgents.find(a => a.agent_type === node.agentType);
            return {
                id: `st-${node.id}`,
                title: node.label || node.labelCn || `步骤 ${index + 1}: ${node.agentType}`,
                agent_type: node.agentType,
                agent_name: agent?.display_name_cn || agent?.display_name || node.agentType,
                status: 'pending' as const,
                input: index === 0 ? missionDescription : undefined,
            };
        });
    };

    // Mission handlers
    const handleCreateMission = async (data: { leaderId: string; leaderType: string; description: string; email?: string }) => {
        const leaderAgent = allAgents.find((a) => a.agent_type === data.leaderId);
        const subTasks = generateSubTasks(data.description);

        try {
            // Create mission via API
            const createdMission = await workflowApi.createMission(workflowId, {
                leader_type: data.leaderType,
                leader_name: leaderAgent?.display_name_cn || leaderAgent?.display_name || data.leaderType,
                description: data.description,
                email: data.email,
                sub_tasks: subTasks.map((st) => ({
                    id: st.id,
                    title: st.title,
                    agent_type: st.agent_type,
                    agent_name: st.agent_name,
                    status: st.status,
                    input: st.input,
                })),
            });

            // Convert to local Mission type
            const newMission: Mission = {
                id: createdMission.id,
                workflow_id: workflowId,
                leader_type: createdMission.leader_type,
                leader_name: createdMission.leader_name,
                description: createdMission.description,
                status: createdMission.status as Mission['status'],
                progress: createdMission.progress,
                created_at: createdMission.created_at,
                updated_at: createdMission.updated_at,
                sub_tasks: createdMission.sub_tasks as SubTask[],
            };

            setMissions((prev) => [newMission, ...prev]);
            setShowCreateMission(false);
            setShowMissionPanel(true);
            setIsExecutingMission(true);

            // Execute mission with real AI agents (fallback to simulation if fails)
            executeMissionWithAI(newMission);
        } catch (err) {
            console.error('Failed to create mission:', err);
            setError('Failed to create mission');
        }
    };

    // Simulated outputs for different agent types
    const getSimulatedOutput = (agentType: string, stepIndex: number, description: string): string => {
        const outputs: Record<string, string[]> = {
            meta_coordinator: [
                `任务分析完成。\n\n目标：${description}\n\n已将任务分解为 ${currentWorkflow?.nodes.length || 5} 个子任务，分配给相应的专业 Agent 执行。`,
            ],
            explorer: [
                '信息收集完成。\n\n已搜索并整理了以下来源：\n- 学术论文数据库\n- 行业报告\n- 技术文档\n\n共找到 23 条相关结果。',
            ],
            logician: [
                '逻辑分析完成。\n\n关键发现：\n1. 数据一致性良好\n2. 未发现矛盾点\n3. 推理链条完整\n\n置信度：92%',
            ],
            connector: [
                '知识关联完成。\n\n已建立以下关联：\n- 主题关联：8 条\n- 时间线关联：5 条\n- 因果关联：3 条',
            ],
            scribe: [
                '报告生成完成。\n\n文档结构：\n- 执行摘要\n- 方法论\n- 主要发现\n- 结论与建议\n\n总字数：约 2,500 字',
            ],
            historian: [
                '历史研究完成。\n\n时间线分析：\n- 关键事件：12 个\n- 转折点：4 个\n- 趋势识别：3 个',
            ],
            critic: [
                '批判性审查完成。\n\n评估结果：\n- 方法论：合理\n- 数据质量：良好\n- 结论有效性：高\n\n建议：增加更多定量数据支持。',
            ],
            genealogist: [
                '谱系研究完成。\n\n发现关系网络：\n- 直接关联：15 个\n- 间接关联：28 个\n- 关键节点：6 个',
            ],
            social_scout: [
                '社交情报收集完成。\n\n来源分析：\n- 社交媒体提及：156 次\n- 情感倾向：正面 68%\n- 关键意见领袖：8 位',
            ],
            cn_specialist: [
                '中文资料分析完成。\n\n处理内容：\n- 中文文档：34 份\n- 新闻报道：12 篇\n- 政策文件：5 份',
            ],
            vision_analyst: [
                '视觉分析完成。\n\n处理结果：\n- 图像分析：18 张\n- 图表提取：7 个\n- 关键视觉要素：识别完成',
            ],
            builder: [
                '构建任务完成。\n\n生成产物：\n- 数据模型：已创建\n- 原型设计：已完成\n- 测试验证：通过',
            ],
            archivist: [
                '归档整理完成。\n\n存储信息：\n- 文档分类：已完成\n- 索引创建：已生成\n- 可检索性：已验证',
            ],
        };

        const agentOutputs = outputs[agentType] || [`步骤 ${stepIndex + 1} 执行完成。\n\n处理结果已生成并传递给下一步骤。`];
        return agentOutputs[0];
    };

    // Execute mission using real AI agents via SSE
    const executeMissionWithAI = async (mission: Mission) => {
        const missionId = mission.id;
        console.log('Starting AI mission execution:', missionId);

        // Get SSE URL
        const sseUrl = workflowApi.getExecuteMissionUrl(workflowId, missionId);

        // Get auth token from localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        try {
            // Use fetch with ReadableStream for SSE (POST request)
            const response = await fetch(sseUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'text/event-stream',
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            handleSSEEvent(missionId, data);
                        } catch (e) {
                            console.error('Failed to parse SSE data:', e);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('SSE connection failed:', err);
            // Fallback to simulated execution
            simulateMissionExecution(mission);
        }
    };

    // Handle SSE events from real AI execution
    const handleSSEEvent = (missionId: string, data: { type: string; [key: string]: unknown }) => {
        console.log('SSE Event:', data.type, data);

        setMissions((prev) => {
            const mission = prev.find((m) => m.id === missionId);
            if (!mission) return prev;

            let updatedMission = { ...mission };

            switch (data.type) {
                case 'start':
                    updatedMission.status = 'running';
                    updatedMission.progress = { current: 0, total: data.total as number };
                    break;

                case 'step_start':
                    updatedMission.sub_tasks = updatedMission.sub_tasks?.map((st, i) =>
                        i === (data.step as number)
                            ? { ...st, status: 'running' as const, started_at: new Date().toISOString() }
                            : st
                    );
                    break;

                case 'step_complete':
                    updatedMission.progress = { ...updatedMission.progress, current: (data.step as number) + 1 };
                    updatedMission.sub_tasks = updatedMission.sub_tasks?.map((st, i) =>
                        i === (data.step as number)
                            ? {
                                ...st,
                                status: 'completed' as const,
                                output: data.output as string,
                                duration_ms: data.duration_ms as number,
                                completed_at: new Date().toISOString(),
                            }
                            : st
                    );
                    break;

                case 'step_error':
                    updatedMission.sub_tasks = updatedMission.sub_tasks?.map((st, i) =>
                        i === (data.step as number)
                            ? { ...st, status: 'failed' as const, output: data.error as string }
                            : st
                    );
                    break;

                case 'complete':
                    updatedMission.status = 'completed';
                    updatedMission.result = data.result as string;
                    setIsExecutingMission(false);
                    setAutoSelectMissionId(missionId);
                    break;
            }

            updatedMission.updated_at = new Date().toISOString();
            return prev.map((m) => m.id === missionId ? updatedMission : m);
        });
    };

    // Fallback simulated execution (for when AI execution fails)
    const simulateMissionExecution = (missionOrId: Mission | string) => {
        const missionId = typeof missionOrId === 'string' ? missionOrId : missionOrId.id;
        const initialMission = typeof missionOrId === 'string'
            ? missions.find((m) => m.id === missionOrId)
            : missionOrId;

        if (!initialMission) {
            console.error('Mission not found:', missionId);
            return;
        }

        const totalSteps = initialMission.progress?.total || initialMission.sub_tasks?.length || 5;
        let currentStep = 0;

        console.log('Starting simulated mission execution:', missionId, 'totalSteps:', totalSteps);

        const interval = setInterval(() => {
            currentStep++;
            const startTime = Date.now();
            const isCompleted = currentStep >= totalSteps;

            setMissions((prev) => {
                let currentMission = prev.find((m) => m.id === missionId);
                if (!currentMission) {
                    currentMission = initialMission;
                }

                const updatedSubTasks = currentMission.sub_tasks?.map((st, index) => {
                    if (index < currentStep - 1) {
                        return st;
                    } else if (index === currentStep - 1) {
                        const prevOutput = index > 0 ? currentMission!.sub_tasks?.[index - 1]?.output : null;
                        const duration = Math.floor(Math.random() * 2000) + 1000;
                        return {
                            ...st,
                            status: 'completed' as const,
                            input: st.input || (prevOutput ? `接收上一步输出:\n${prevOutput.substring(0, 100)}...` : currentMission!.description),
                            output: getSimulatedOutput(st.agent_type, index, currentMission!.description),
                            started_at: new Date(startTime - duration).toISOString(),
                            completed_at: new Date().toISOString(),
                            duration_ms: duration,
                        };
                    } else if (index === currentStep) {
                        return {
                            ...st,
                            status: 'running' as const,
                            started_at: new Date().toISOString(),
                        };
                    }
                    return st;
                });

                const updatedMission: Mission = {
                    ...currentMission,
                    status: isCompleted ? 'completed' as const : 'running' as const,
                    progress: { current: currentStep, total: totalSteps },
                    sub_tasks: updatedSubTasks,
                    updated_at: new Date().toISOString(),
                    result: isCompleted ?
                        `任务已成功完成（模拟模式）。\n\n执行摘要：\n- 共完成 ${totalSteps} 个子任务\n\n注意：当前为模拟执行，请检查后端 AI 服务是否正常运行。` :
                        undefined,
                };

                workflowApi.updateMission(workflowId, missionId, {
                    status: updatedMission.status,
                    progress_current: updatedMission.progress.current,
                    progress_total: updatedMission.progress.total,
                    sub_tasks: updatedMission.sub_tasks as WorkflowMissionSubTask[],
                    result: updatedMission.result,
                }).catch((err) => console.error('Failed to sync mission:', err));

                const exists = prev.some((m) => m.id === missionId);
                if (exists) {
                    return prev.map((m) => m.id === missionId ? updatedMission : m);
                } else {
                    return [updatedMission, ...prev];
                }
            });

            if (isCompleted) {
                clearInterval(interval);
                setIsExecutingMission(false);
                setAutoSelectMissionId(missionId);
            }
        }, 1500);
    };

    const handleContinueMission = (missionId?: string) => {
        const mission = missionId
            ? missions.find((m) => m.id === missionId)
            : missions.find((m) => m.status === 'pending');

        if (mission) {
            setMissions((prev) =>
                prev.map((m) =>
                    m.id === mission.id ? { ...m, status: 'running' } : m
                )
            );
            setIsExecutingMission(true);
            simulateMissionExecution(mission.id);
        }
    };

    const handleCancelMission = (missionId?: string) => {
        const mission = missionId
            ? missions.find((m) => m.id === missionId)
            : missions.find((m) => m.status === 'running');

        if (mission) {
            setMissions((prev) =>
                prev.map((m) =>
                    m.id === mission.id
                        ? { ...m, status: 'cancelled', updated_at: new Date().toISOString() }
                        : m
                )
            );
            setIsExecutingMission(false);
        }
    };

    const handleRetryMission = (missionId: string) => {
        const mission = missions.find((m) => m.id === missionId);
        if (mission) {
            // Reset sub-tasks to pending
            const resetSubTasks = mission.sub_tasks?.map((st) => ({
                ...st,
                status: 'pending' as const,
            }));

            setMissions((prev) =>
                prev.map((m) =>
                    m.id === missionId
                        ? {
                            ...m,
                            status: 'running',
                            progress: { current: 0, total: m.progress.total },
                            sub_tasks: resetSubTasks,
                            result: undefined,
                        }
                        : m
                )
            );
            setIsExecutingMission(true);
            simulateMissionExecution(missionId);
        }
    };

    const handleReplanMission = (missionId: string) => {
        const mission = missions.find((m) => m.id === missionId);
        if (mission) {
            // Regenerate sub-tasks and start fresh
            const newSubTasks = generateSubTasks(mission.description);

            setMissions((prev) =>
                prev.map((m) =>
                    m.id === missionId
                        ? {
                            ...m,
                            status: 'running',
                            progress: { current: 0, total: newSubTasks.length },
                            sub_tasks: newSubTasks,
                            result: undefined,
                            updated_at: new Date().toISOString(),
                        }
                        : m
                )
            );
            setIsExecutingMission(true);
            simulateMissionExecution(missionId);
        }
    };

    const handleSaveToLibrary = async (missionId: string) => {
        const mission = missions.find((m) => m.id === missionId);
        if (!mission) return;

        try {
            // Save to library via API
            const result = await workflowApi.saveMissionToLibrary(workflowId, missionId, {
                tags: ['mission-result', 'workflow', mission.leader_type],
            });

            alert(`任务结果已保存到知识库！\n\n文档 ID：${result.document_id}\n\n您可以在 My Library 中查看完整内容。`);

            // Optionally navigate to library
            // router.push('/library');
        } catch (err) {
            console.error('Failed to save to library:', err);
            alert('保存失败，请稍后重试。');
        }
    };

    const generateMissionDocument = (mission: Mission): string => {
        let content = `# ${mission.description}\n\n`;
        content += `**执行时间**: ${new Date(mission.created_at).toLocaleString('zh-CN')}\n`;
        content += `**领导 Agent**: ${mission.leader_name}\n`;
        content += `**状态**: ${mission.status === 'completed' ? '已完成' : mission.status}\n\n`;

        content += `## 执行步骤\n\n`;

        mission.sub_tasks?.forEach((task, index) => {
            content += `### ${index + 1}. ${task.title}\n`;
            content += `**Agent**: ${task.agent_name} (${task.agent_type})\n`;
            if (task.duration_ms) {
                content += `**耗时**: ${(task.duration_ms / 1000).toFixed(1)}s\n`;
            }
            if (task.input) {
                content += `\n**输入**:\n\`\`\`\n${task.input}\n\`\`\`\n`;
            }
            if (task.output) {
                content += `\n**输出**:\n\`\`\`\n${task.output}\n\`\`\`\n`;
            }
            content += `\n`;
        });

        if (mission.result) {
            content += `## 最终结果\n\n${mission.result}\n`;
        }

        return content;
    };

    const handleSave = async () => {
        if (!currentWorkflow) return;

        // Validate DAG
        if (!validateDAG(currentWorkflow.nodes, currentWorkflow.edges)) {
            setError('Invalid workflow: Circular dependencies detected');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            const updated = await workflowApi.update(workflowId, {
                name: currentWorkflow.name,
                name_cn: workflowName || currentWorkflow.name_cn,
                description: currentWorkflow.description,
                nodes: currentWorkflow.nodes,
                edges: currentWorkflow.edges,
            });
            loadWorkflow(updated);
        } catch (err) {
            setError('Failed to save workflow');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleBack = () => {
        if (isDirty) {
            if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
                return;
            }
        }
        router.push('/library/workflows');
    };

    const handleZoomIn = () => setZoom(zoom + 0.1);
    const handleZoomOut = () => setZoom(zoom - 0.1);
    const handleFitToScreen = () => setZoom(1);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedNodeId && !isLocked) {
                removeNode(selectedNodeId);
            } else if (selectedEdgeId && !isLocked) {
                removeEdge(selectedEdgeId);
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleSave();
        }
    }, [selectedNodeId, selectedEdgeId, isLocked]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const handleConnectionComplete = (sourceId: string, targetId: string) => {
        setPendingEdge({ sourceId, targetId });
        setShowEdgeConfig(true);
    };

    const handleEdgeConfigSave = (config: WorkflowEdge['config']) => {
        if (pendingEdge) {
            // Complete new connection with config
            completeConnection(pendingEdge.targetId, config);
            setPendingEdge(null);
        } else if (selectedEdgeId) {
            // Update existing edge
            updateEdge(selectedEdgeId, config);
        }
        setShowEdgeConfig(false);
    };

    const handleEdgeClick = (edgeId: string) => {
        selectEdge(edgeId);
        setShowEdgeConfig(true);
    };

    const handleNodeDoubleClick = (nodeId: string) => {
        selectNode(nodeId);
        setShowNodeConfig(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!currentWorkflow) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Workflow not found</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-100">
            {/* Header */}
            <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>

                    {editingName ? (
                        <input
                            type="text"
                            value={workflowName}
                            onChange={(e) => setWorkflowName(e.target.value)}
                            onBlur={() => setEditingName(false)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                            className="text-lg font-semibold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent"
                            autoFocus
                        />
                    ) : (
                        <h1
                            className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                            onClick={() => setEditingName(true)}
                        >
                            {workflowName}
                        </h1>
                    )}

                    {isDirty && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            Unsaved
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save
                    </button>
                </div>
            </div>

            {error && (
                <div className="mx-4 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-2 text-red-800 hover:underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Agent Palette */}
                <AgentPalette isLocked={isLocked} onAgentClick={handlePaletteAgentClick} />

                {/* Canvas */}
                <div className="flex-1 relative">
                    <WorkflowCanvas
                        workflow={currentWorkflow}
                        onConnectionComplete={handleConnectionComplete}
                        onEdgeClick={handleEdgeClick}
                        onNodeDoubleClick={handleNodeDoubleClick}
                    />

                    {/* Canvas Controls */}
                    <div className="absolute bottom-20 left-4 bg-white rounded-lg shadow-lg border border-gray-200 flex items-center gap-1 p-1">
                        <button
                            onClick={handleZoomOut}
                            className="p-2 hover:bg-gray-100 rounded transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="px-2 text-sm text-gray-600 min-w-[50px] text-center">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={handleZoomIn}
                            className="p-2 hover:bg-gray-100 rounded transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn className="w-4 h-4 text-gray-600" />
                        </button>
                        <div className="w-px h-6 bg-gray-200 mx-1" />
                        <button
                            onClick={handleFitToScreen}
                            className="p-2 hover:bg-gray-100 rounded transition-colors"
                            title="Fit to Screen"
                        >
                            <Maximize className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                            onClick={() => setLocked(!isLocked)}
                            className={`p-2 rounded transition-colors ${
                                isLocked ? 'bg-amber-100 text-amber-600' : 'hover:bg-gray-100 text-gray-600'
                            }`}
                            title={isLocked ? 'Unlock Canvas' : 'Lock Canvas'}
                        >
                            {isLocked ? (
                                <Lock className="w-4 h-4" />
                            ) : (
                                <Unlock className="w-4 h-4" />
                            )}
                        </button>
                    </div>

                    {/* Selection Info */}
                    {(selectedNodeId || selectedEdgeId) && !showMissionPanel && (
                        <div className="absolute bottom-20 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>
                                    {selectedNodeId ? 'Node' : 'Edge'} selected
                                </span>
                                <button
                                    onClick={() => {
                                        if (selectedNodeId) removeNode(selectedNodeId);
                                        else if (selectedEdgeId) removeEdge(selectedEdgeId);
                                    }}
                                    className="p-1 hover:bg-red-50 text-red-500 rounded"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                {selectedNodeId && (
                                    <button
                                        onClick={() => setShowNodeConfig(true)}
                                        className="p-1 hover:bg-gray-100 text-gray-500 rounded"
                                        title="Configure"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Mission Action Bar */}
                    <MissionActionBar
                        hasRunningMission={hasRunningMission}
                        hasPendingMission={hasPendingMission}
                        missionCount={missions.length}
                        isPanelOpen={showMissionPanel}
                        onCreateMission={() => setShowCreateMission(true)}
                        onContinueMission={() => handleContinueMission()}
                        onCancelMission={() => handleCancelMission()}
                        onTogglePanel={() => setShowMissionPanel(!showMissionPanel)}
                        isExecuting={isExecutingMission}
                    />
                </div>

                {/* Mission Panel */}
                <MissionPanel
                    missions={missions}
                    isOpen={showMissionPanel}
                    onClose={() => setShowMissionPanel(false)}
                    onContinueMission={handleContinueMission}
                    onCancelMission={handleCancelMission}
                    onRetryMission={handleRetryMission}
                    onReplanMission={handleReplanMission}
                    onSaveToLibrary={handleSaveToLibrary}
                    isLoading={loadingMissions}
                    autoSelectMissionId={autoSelectMissionId}
                />
            </div>

            {/* Edge Configuration Modal */}
            {showEdgeConfig && (
                <ConnectionConfigModal
                    edge={selectedEdgeId
                        ? currentWorkflow.edges.find((e) => e.id === selectedEdgeId)
                        : undefined
                    }
                    onSave={handleEdgeConfigSave}
                    onClose={() => {
                        setShowEdgeConfig(false);
                        setPendingEdge(null);
                    }}
                />
            )}

            {/* Node Configuration Modal */}
            {showNodeConfig && selectedNodeId && (
                <NodeConfigModal
                    node={currentWorkflow.nodes.find((n) => n.id === selectedNodeId)}
                    agentProfile={getAgentProfileByType(
                        currentWorkflow.nodes.find((n) => n.id === selectedNodeId)?.agentType || ''
                    )}
                    onClose={() => setShowNodeConfig(false)}
                />
            )}

            {/* Agent Config Modal (for palette agents) */}
            {showAgentConfig && selectedPaletteAgent && (
                <AgentConfigModal
                    agent={selectedPaletteAgent}
                    onClose={() => {
                        setShowAgentConfig(false);
                        setSelectedPaletteAgent(null);
                    }}
                />
            )}

            {/* Create Mission Modal */}
            {showCreateMission && (
                <CreateMissionModal
                    agents={allAgents}
                    onClose={() => setShowCreateMission(false)}
                    onSubmit={handleCreateMission}
                    isSubmitting={isExecutingMission}
                />
            )}
        </div>
    );
}
