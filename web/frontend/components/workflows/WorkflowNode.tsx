'use client';

import { useState, useRef, useEffect } from 'react';
import type { WorkflowNode } from '@/lib/api';

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

// Agent Chinese names
const AGENT_NAMES_CN: Record<string, string> = {
    meta_coordinator: '元协调者',
    logician: '逻辑推理',
    critic: '批评审查',
    connector: '连接分析',
    genealogist: '谱系分析',
    historian: '历史研究',
    explorer: '信息探索',
    social_scout: '社交侦察',
    cn_specialist: '中文专家',
    vision_analyst: '视觉分析',
    builder: '构建者',
    scribe: '文书撰写',
    archivist: '档案管理',
    prompt_engineer: '提示工程',
    collaborator: '协作者',
};

// Cluster-based color scheme (same as Research Team)
const CLUSTER_COLORS: Record<string, { bg: string; border: string; gradient: string }> = {
    coordination: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        gradient: 'from-orange-500 to-amber-600',
    },
    reasoning: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        gradient: 'from-purple-500 to-indigo-600',
    },
    information: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        gradient: 'from-blue-500 to-cyan-600',
    },
    production: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        gradient: 'from-green-500 to-emerald-600',
    },
};

// Map agent type to cluster
const AGENT_CLUSTERS: Record<string, string> = {
    meta_coordinator: 'coordination',
    logician: 'reasoning',
    critic: 'reasoning',
    connector: 'reasoning',
    genealogist: 'information',
    historian: 'information',
    explorer: 'information',
    social_scout: 'information',
    cn_specialist: 'information',
    vision_analyst: 'information',
    builder: 'production',
    scribe: 'production',
    archivist: 'production',
    prompt_engineer: 'production',
    collaborator: 'production',
};

interface WorkflowNodeProps {
    node: WorkflowNode;
    isSelected: boolean;
    isLocked: boolean;
    isConnecting: boolean;
    onSelect: () => void;
    onDoubleClick: () => void;
    onConnectionStart: () => void;
    onConnectionEnd: () => void;
    onPositionChange: (position: { x: number; y: number }) => void;
}

export default function WorkflowNodeComponent({
    node,
    isSelected,
    isLocked,
    isConnecting,
    onSelect,
    onDoubleClick,
    onConnectionStart,
    onConnectionEnd,
    onPositionChange,
}: WorkflowNodeProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const nodeRef = useRef<HTMLDivElement>(null);

    const emoji = AGENT_EMOJIS[node.agentType] || '🤖';
    const nameCn = AGENT_NAMES_CN[node.agentType] || node.agentType.replace(/_/g, ' ');
    const cluster = AGENT_CLUSTERS[node.agentType] || 'reasoning';
    const colors = CLUSTER_COLORS[cluster] || CLUSTER_COLORS.reasoning;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isLocked) return;
        e.stopPropagation();
        onSelect();

        if (e.button === 0) {
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - node.position.x,
                y: e.clientY - node.position.y,
            });
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging && !isLocked) {
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            onPositionChange({ x: newX, y: newY });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Add global mouse event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    // Connection point handlers
    const handleOutputMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isLocked) {
            onConnectionStart();
        }
    };

    const handleInputMouseUp = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isConnecting) {
            onConnectionEnd();
        }
    };

    return (
        <div
            ref={nodeRef}
            className={`absolute w-44 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{
                left: node.position.x,
                top: node.position.y,
                zIndex: isSelected ? 10 : 1,
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onDoubleClick();
            }}
        >
            {/* Input connection point (top) */}
            <div
                className={`absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-white transition-all ${
                    isConnecting
                        ? 'border-blue-500 scale-125 cursor-pointer shadow-lg'
                        : 'border-gray-300 hover:border-blue-400'
                }`}
                onMouseUp={handleInputMouseUp}
            />

            {/* Node body */}
            <div
                className={`rounded-xl border-2 p-3 shadow-sm transition-all ${colors.bg} ${
                    isSelected
                        ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                        : colors.border
                } hover:shadow-md`}
            >
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${colors.gradient} text-lg shadow-sm`}>
                        {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                            {node.label || nameCn}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                            {node.agentType.replace(/_/g, ' ')}
                        </div>
                    </div>
                </div>

                {/* Show model info if configured */}
                {node.config?.maxTokens && (
                    <div className="mt-2 pt-2 border-t border-gray-200/50">
                        <div className="text-[10px] text-gray-400">
                            Max: {node.config.maxTokens} tokens
                            {node.config.temperature !== undefined && ` | T: ${node.config.temperature}`}
                        </div>
                    </div>
                )}
            </div>

            {/* Output connection point (bottom) */}
            <div
                className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-white transition-all cursor-pointer hover:scale-125 hover:shadow-lg ${
                    isSelected ? 'border-blue-500' : 'border-gray-300 hover:border-blue-400'
                }`}
                onMouseDown={handleOutputMouseDown}
            />
        </div>
    );
}
