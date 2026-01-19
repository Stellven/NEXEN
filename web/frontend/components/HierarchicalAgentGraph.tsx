'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    FolderOpen,
    Database,
    Server,
    Lock,
    Unlock,
    RotateCcw,
    ArrowRight,
    FileText,
    Download,
    Upload,
} from 'lucide-react';
import {
    useAgentGraphStore,
    getDefaultHierarchyEdges,
    ExecutionEdge,
    FileOperation,
} from '@/lib/agentGraphStore';

// =============================================================================
// Types
// =============================================================================

type AgentTier = 'coordinator' | 'strategic' | 'executor';
type AgentStatus = 'idle' | 'initializing' | 'running' | 'waiting' | 'completed' | 'failed';

interface HierarchicalAgent {
    id: string;
    name: string;
    nameCn: string;
    icon: string;
    tier: AgentTier;
    description: string;
}

interface AgentRuntimeState {
    agentId: string;
    status: AgentStatus;
    currentTask?: string;
    progress?: number;
}

// =============================================================================
// Agent Data
// =============================================================================

const AGENTS: HierarchicalAgent[] = [
    { id: 'meta_coordinator', name: 'Meta-Coordinator', nameCn: '元协调者', icon: '🎯', tier: 'coordinator', description: '任务分解、调度、综合' },
    { id: 'logician', name: 'Logician', nameCn: '逻辑推理者', icon: '🧮', tier: 'strategic', description: '逻辑推理和形式化验证' },
    { id: 'critic', name: 'Critic', nameCn: '批判者', icon: '🔬', tier: 'strategic', description: '方法审查和假设质疑' },
    { id: 'connector', name: 'Connector', nameCn: '连接者', icon: '🔗', tier: 'strategic', description: '跨领域关联和类比推理' },
    { id: 'explorer', name: 'Explorer', nameCn: '探索者', icon: '🔍', tier: 'strategic', description: '文献检索和趋势发现' },
    { id: 'builder', name: 'Builder', nameCn: '构建者', icon: '🛠️', tier: 'strategic', description: '代码实现和原型构建' },
    { id: 'genealogist', name: 'Genealogist', nameCn: '谱系学家', icon: '📜', tier: 'executor', description: '人物档案和学术师承' },
    { id: 'historian', name: 'Historian', nameCn: '历史学家', icon: '🏛️', tier: 'executor', description: '技术起源和演进追溯' },
    { id: 'scribe', name: 'Scribe', nameCn: '记录者', icon: '✍️', tier: 'executor', description: '论文撰写和文档整理' },
    { id: 'social_scout', name: 'Social Scout', nameCn: '社交侦察', icon: '📡', tier: 'executor', description: '社交媒体和热点追踪' },
    { id: 'cn_specialist', name: 'CN Specialist', nameCn: '中文专家', icon: '🇨🇳', tier: 'executor', description: '中文文献和术语翻译' },
    { id: 'vision_analyst', name: 'Vision Analyst', nameCn: '视觉分析师', icon: '👁️', tier: 'executor', description: '图表分析和架构图解读' },
    { id: 'archivist', name: 'Archivist', nameCn: '档案管理员', icon: '📚', tier: 'executor', description: '记忆管理和知识索引' },
    { id: 'prompt_engineer', name: 'Prompt Engineer', nameCn: '提示词工程师', icon: '💡', tier: 'executor', description: '系统提示词设计和优化' },
];

const TIER_CONFIG = {
    coordinator: { label: '协调层', color: '#ea580c', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', textColor: 'text-orange-700' },
    strategic: { label: '战略层', color: '#9333ea', bgColor: 'bg-purple-50', borderColor: 'border-purple-300', textColor: 'text-purple-700' },
    executor: { label: '执行层', color: '#2563eb', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', textColor: 'text-blue-700' },
};

// =============================================================================
// Component Props
// =============================================================================

interface HierarchicalAgentGraphProps {
    onAgentClick?: (agentId: string) => void;
    selectedAgentId?: string | null;
    enabledAgents?: Set<string>;
    agentStates?: Map<string, AgentRuntimeState>;
    customEdges?: ExecutionEdge[];  // DAG edges from execution plan
    workspaceDir?: string;
    onOpenWorkspace?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export default function HierarchicalAgentGraph({
    onAgentClick,
    selectedAgentId,
    enabledAgents = new Set(AGENTS.map(a => a.id)),
    agentStates = new Map(),
    customEdges,
    workspaceDir = '/research_workspace',
    onOpenWorkspace,
}: HierarchicalAgentGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
    const [draggingAgent, setDraggingAgent] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Store
    const {
        nodePositions,
        isLayoutLocked,
        fileOperations,
        setNodePosition,
        resetLayout,
        toggleLayoutLock,
    } = useAgentGraphStore();

    // Use custom edges if provided, otherwise default hierarchy
    const edges = customEdges || getDefaultHierarchyEdges();

    // ==========================================================================
    // Drag Handling
    // ==========================================================================

    const handleMouseDown = useCallback((e: React.MouseEvent, agentId: string) => {
        if (isLayoutLocked) return;
        e.preventDefault();
        e.stopPropagation();

        const pos = nodePositions[agentId];
        if (!pos) return;

        setDraggingAgent(agentId);
        setDragOffset({
            x: e.clientX - pos.x,
            y: e.clientY - pos.y,
        });
    }, [isLayoutLocked, nodePositions]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!draggingAgent || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        // Constrain to container bounds
        const constrainedX = Math.max(30, Math.min(containerRect.width - 30, newX));
        const constrainedY = Math.max(30, Math.min(containerRect.height - 30, newY));

        setNodePosition(draggingAgent, { x: constrainedX, y: constrainedY });
    }, [draggingAgent, dragOffset, setNodePosition]);

    const handleMouseUp = useCallback(() => {
        setDraggingAgent(null);
    }, []);

    // Global mouse up handler
    useEffect(() => {
        const handleGlobalMouseUp = () => setDraggingAgent(null);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    // ==========================================================================
    // Render Functions
    // ==========================================================================

    const getStatusStyle = (agentId: string) => {
        const state = agentStates.get(agentId);
        if (!state) return '';
        switch (state.status) {
            case 'running': return 'animate-pulse ring-2 ring-green-400 ring-offset-1';
            case 'completed': return 'ring-2 ring-green-500';
            case 'failed': return 'ring-2 ring-red-500';
            case 'waiting': return 'animate-pulse ring-2 ring-yellow-400';
            default: return '';
        }
    };

    const renderAgentNode = (agent: HierarchicalAgent) => {
        const tierConfig = TIER_CONFIG[agent.tier];
        const isSelected = selectedAgentId === agent.id;
        const isHovered = hoveredAgent === agent.id;
        const isDragging = draggingAgent === agent.id;
        const isEnabled = enabledAgents.has(agent.id);
        const state = agentStates.get(agent.id);
        const pos = nodePositions[agent.id];

        if (!pos) return null;

        // Check if this agent has file operations
        const agentFileOps = fileOperations.filter(op => op.agentId === agent.id && op.status === 'active');
        const hasReadOp = agentFileOps.some(op => op.type === 'read');
        const hasWriteOp = agentFileOps.some(op => op.type === 'write');

        return (
            <div
                key={agent.id}
                className={`
                    absolute transform -translate-x-1/2 -translate-y-1/2
                    ${isDragging ? 'z-50 cursor-grabbing' : isLayoutLocked ? 'cursor-pointer' : 'cursor-grab'}
                    ${!isEnabled ? 'opacity-40' : ''}
                `}
                style={{ left: pos.x, top: pos.y }}
                onMouseDown={(e) => handleMouseDown(e, agent.id)}
            >
                <button
                    onClick={() => !draggingAgent && onAgentClick?.(agent.id)}
                    onMouseEnter={() => setHoveredAgent(agent.id)}
                    onMouseLeave={() => setHoveredAgent(null)}
                    className={`
                        relative flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all duration-150
                        ${isSelected ? `${tierConfig.bgColor} ${tierConfig.borderColor} border-2 shadow-lg` : 'border-2 border-transparent hover:border-gray-200 hover:bg-white/80'}
                        ${isHovered && !isSelected ? 'scale-105 shadow-md' : ''}
                        ${isDragging ? 'scale-110 shadow-xl' : ''}
                        ${getStatusStyle(agent.id)}
                        bg-white/60 backdrop-blur-sm
                    `}
                >
                    {/* Status indicator */}
                    {state && state.status !== 'idle' && (
                        <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white ${
                            state.status === 'running' ? 'bg-green-500 animate-pulse' :
                            state.status === 'completed' ? 'bg-green-600' :
                            state.status === 'failed' ? 'bg-red-500' :
                            state.status === 'waiting' ? 'bg-yellow-500 animate-pulse' :
                            'bg-gray-400'
                        }`} />
                    )}

                    {/* File operation indicators */}
                    {hasWriteOp && (
                        <div className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                            <Upload className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}
                    {hasReadOp && (
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                            <Download className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}

                    {/* Icon */}
                    <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center text-xl
                        ${isSelected ? tierConfig.bgColor : 'bg-white'}
                        border ${isSelected ? tierConfig.borderColor : 'border-gray-200'}
                        shadow-sm
                    `}>
                        {agent.icon}
                    </div>

                    {/* Name */}
                    <span className={`text-[10px] font-medium ${isSelected ? tierConfig.textColor : 'text-gray-600'} max-w-[56px] truncate leading-tight`}>
                        {agent.nameCn}
                    </span>

                    {/* Tooltip */}
                    {isHovered && !isDragging && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
                            <div className="font-medium">{agent.name}</div>
                            <div className="text-gray-300">{agent.description}</div>
                            {!isLayoutLocked && <div className="text-gray-400 mt-1">拖拽可移动位置</div>}
                        </div>
                    )}
                </button>
            </div>
        );
    };

    const renderStorageNode = () => {
        const pos = nodePositions['__storage__'];
        if (!pos) return null;

        const isDragging = draggingAgent === '__storage__';
        const activeOps = fileOperations.filter(op => op.status === 'active');

        return (
            <div
                className={`
                    absolute transform -translate-x-1/2 -translate-y-1/2
                    ${isDragging ? 'z-50 cursor-grabbing' : isLayoutLocked ? 'cursor-default' : 'cursor-grab'}
                `}
                style={{ left: pos.x, top: pos.y }}
                onMouseDown={(e) => handleMouseDown(e, '__storage__')}
            >
                <div className={`
                    flex flex-col items-center gap-1 p-2
                    bg-gradient-to-br from-amber-50 to-orange-50
                    border-2 ${activeOps.length > 0 ? 'border-amber-400 animate-pulse' : 'border-amber-300'}
                    rounded-xl shadow-sm transition-all
                    ${isDragging ? 'scale-110 shadow-xl' : ''}
                `}>
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center border border-amber-300">
                        <Server className="w-5 h-5 text-amber-600" />
                    </div>
                    <span className="text-[9px] font-medium text-amber-700">数据存储</span>
                    {activeOps.length > 0 && (
                        <span className="text-[8px] text-amber-500">{activeOps.length} 个操作中</span>
                    )}
                </div>
            </div>
        );
    };

    const renderEdges = () => {
        return edges.map(edge => {
            const fromPos = nodePositions[edge.from];
            const toPos = nodePositions[edge.to];
            if (!fromPos || !toPos) return null;

            const isHighlighted = hoveredAgent === edge.from || hoveredAgent === edge.to;
            const fromState = agentStates.get(edge.from);
            const toState = agentStates.get(edge.to);
            const isActive = fromState?.status === 'completed' && toState?.status === 'running';

            // Calculate arrow path
            const dx = toPos.x - fromPos.x;
            const dy = toPos.y - fromPos.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            // Shorten the line to not overlap with nodes
            const startOffset = 25;
            const endOffset = 25;
            const startX = fromPos.x + (dx / len) * startOffset;
            const startY = fromPos.y + (dy / len) * startOffset;
            const endX = toPos.x - (dx / len) * endOffset;
            const endY = toPos.y - (dy / len) * endOffset;

            // Control point for curve
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            const perpX = -(endY - startY) / len * 20;
            const perpY = (endX - startX) / len * 20;

            return (
                <g key={edge.id}>
                    <path
                        d={`M ${startX} ${startY} Q ${midX + perpX} ${midY + perpY} ${endX} ${endY}`}
                        fill="none"
                        stroke={isActive ? '#22c55e' : isHighlighted ? '#9333ea' : '#d1d5db'}
                        strokeWidth={isActive ? 2.5 : isHighlighted ? 2 : 1.5}
                        strokeDasharray={isActive ? '5,5' : 'none'}
                        markerEnd={`url(#arrow-${isActive ? 'active' : isHighlighted ? 'highlighted' : 'default'})`}
                        className="transition-all duration-200"
                    />
                    {isActive && (
                        <circle r="3" fill="#22c55e">
                            <animateMotion
                                dur="1s"
                                repeatCount="indefinite"
                                path={`M ${startX} ${startY} Q ${midX + perpX} ${midY + perpY} ${endX} ${endY}`}
                            />
                        </circle>
                    )}
                </g>
            );
        });
    };

    // File operations panel
    const renderFileOperationsPanel = () => {
        const recentOps = fileOperations.slice(-5).reverse();
        if (recentOps.length === 0) return null;

        return (
            <div className="absolute bottom-12 right-2 w-48 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-2 z-20">
                <div className="flex items-center gap-1.5 mb-2 text-[10px] font-medium text-gray-600">
                    <FileText className="w-3 h-3" />
                    文件操作
                </div>
                <div className="space-y-1">
                    {recentOps.map(op => {
                        const agent = AGENTS.find(a => a.id === op.agentId);
                        return (
                            <div
                                key={op.id}
                                className={`flex items-center gap-1.5 text-[9px] px-1.5 py-1 rounded ${
                                    op.status === 'active'
                                        ? op.type === 'write' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                                        : 'bg-gray-50 text-gray-500'
                                }`}
                            >
                                {op.type === 'write' ? <Upload className="w-2.5 h-2.5" /> : <Download className="w-2.5 h-2.5" />}
                                <span className="font-medium">{agent?.nameCn || op.agentId}</span>
                                <ArrowRight className="w-2 h-2" />
                                <span className="truncate flex-1 font-mono">{op.path.split('/').pop()}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-[480px] bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50 rounded-xl border border-gray-200 overflow-hidden select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* SVG Layer for edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                <defs>
                    <marker id="arrow-default" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                        <path d="M 0 0 L 8 4 L 0 8 z" fill="#d1d5db" />
                    </marker>
                    <marker id="arrow-highlighted" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                        <path d="M 0 0 L 8 4 L 0 8 z" fill="#9333ea" />
                    </marker>
                    <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                        <path d="M 0 0 L 8 4 L 0 8 z" fill="#22c55e" />
                    </marker>
                </defs>
                {renderEdges()}
            </svg>

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-white/80 backdrop-blur-sm border-b border-gray-100">
                {/* Legend */}
                <div className="flex gap-2 text-[9px]">
                    {Object.entries(TIER_CONFIG).map(([tier, config]) => (
                        <div key={tier} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${config.bgColor} ${config.textColor}`}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
                            <span>{config.label}</span>
                        </div>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-[9px] text-gray-600">
                        <Database className="w-3 h-3" />
                        <span className="font-mono">{workspaceDir}</span>
                    </div>
                    {onOpenWorkspace && (
                        <button
                            onClick={onOpenWorkspace}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-[9px] hover:bg-blue-100"
                        >
                            <FolderOpen className="w-3 h-3" />
                        </button>
                    )}
                    <button
                        onClick={toggleLayoutLock}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] ${
                            isLayoutLocked ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={isLayoutLocked ? '解锁布局' : '锁定布局'}
                    >
                        {isLayoutLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>
                    <button
                        onClick={resetLayout}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-[9px] hover:bg-gray-200"
                        title="重置布局"
                    >
                        <RotateCcw className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Agent Nodes */}
            <div className="absolute inset-0" style={{ zIndex: 10 }}>
                {AGENTS.map(renderAgentNode)}
                {renderStorageNode()}
            </div>

            {/* File Operations Panel */}
            {renderFileOperationsPanel()}

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-1.5 bg-white/80 backdrop-blur-sm border-t border-gray-100 text-[8px] text-gray-400">
                <span>
                    {isLayoutLocked ? '布局已锁定' : '拖拽节点调整布局'} · 箭头表示数据流向
                </span>
                <span>14 Agents · DAG 执行流</span>
            </div>
        </div>
    );
}
