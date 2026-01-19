'use client';

import { useState } from 'react';
import { Brain, Search, Wrench, Users } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface AgentNode {
    id: string;
    name: string;
    nameCn: string;
    icon: string;
    cluster: 'reasoning' | 'information' | 'production' | 'coordination';
    x: number;
    y: number;
}

interface Connection {
    from: string;
    to: string;
    type: 'coordination' | 'collaboration' | 'memory';
}

// =============================================================================
// Data
// =============================================================================

const AGENTS: AgentNode[] = [
    // Center - Coordination
    { id: 'meta_coordinator', name: 'Meta-Coordinator', nameCn: '元协调者', icon: '🎯', cluster: 'coordination', x: 50, y: 50 },

    // Top - Reasoning Cluster
    { id: 'logician', name: 'Logician', nameCn: '逻辑推理者', icon: '🧮', cluster: 'reasoning', x: 25, y: 15 },
    { id: 'critic', name: 'Critic', nameCn: '批判者', icon: '🔬', cluster: 'reasoning', x: 50, y: 10 },
    { id: 'connector', name: 'Connector', nameCn: '连接者', icon: '🔗', cluster: 'reasoning', x: 75, y: 15 },
    { id: 'genealogist', name: 'Genealogist', nameCn: '谱系学家', icon: '📜', cluster: 'reasoning', x: 35, y: 25 },
    { id: 'historian', name: 'Historian', nameCn: '历史学家', icon: '🏛️', cluster: 'reasoning', x: 65, y: 25 },

    // Left - Information Cluster
    { id: 'explorer', name: 'Explorer', nameCn: '探索者', icon: '🔍', cluster: 'information', x: 10, y: 40 },
    { id: 'social_scout', name: 'Social Scout', nameCn: '社交侦察', icon: '📡', cluster: 'information', x: 5, y: 55 },
    { id: 'cn_specialist', name: 'CN Specialist', nameCn: '中文专家', icon: '🇨🇳', cluster: 'information', x: 10, y: 70 },
    { id: 'vision_analyst', name: 'Vision Analyst', nameCn: '视觉分析师', icon: '👁️', cluster: 'information', x: 20, y: 60 },

    // Right - Production Cluster
    { id: 'builder', name: 'Builder', nameCn: '构建者', icon: '🛠️', cluster: 'production', x: 90, y: 40 },
    { id: 'scribe', name: 'Scribe', nameCn: '记录者', icon: '✍️', cluster: 'production', x: 95, y: 55 },
    { id: 'archivist', name: 'Archivist', nameCn: '档案管理员', icon: '📚', cluster: 'production', x: 90, y: 70 },
    { id: 'prompt_engineer', name: 'Prompt Engineer', nameCn: '提示词工程师', icon: '💡', cluster: 'production', x: 80, y: 60 },
];

const CONNECTIONS: Connection[] = [
    // Meta-Coordinator to all clusters (coordination)
    { from: 'meta_coordinator', to: 'logician', type: 'coordination' },
    { from: 'meta_coordinator', to: 'critic', type: 'coordination' },
    { from: 'meta_coordinator', to: 'connector', type: 'coordination' },
    { from: 'meta_coordinator', to: 'explorer', type: 'coordination' },
    { from: 'meta_coordinator', to: 'builder', type: 'coordination' },
    { from: 'meta_coordinator', to: 'scribe', type: 'coordination' },

    // Reasoning cluster internal
    { from: 'logician', to: 'critic', type: 'collaboration' },
    { from: 'critic', to: 'connector', type: 'collaboration' },
    { from: 'genealogist', to: 'historian', type: 'collaboration' },

    // Information cluster internal
    { from: 'explorer', to: 'social_scout', type: 'collaboration' },
    { from: 'explorer', to: 'cn_specialist', type: 'collaboration' },
    { from: 'vision_analyst', to: 'explorer', type: 'collaboration' },

    // Production cluster internal
    { from: 'builder', to: 'scribe', type: 'collaboration' },
    { from: 'scribe', to: 'archivist', type: 'collaboration' },
    { from: 'prompt_engineer', to: 'builder', type: 'collaboration' },

    // Cross-cluster collaboration
    { from: 'explorer', to: 'logician', type: 'collaboration' },
    { from: 'critic', to: 'scribe', type: 'collaboration' },
    { from: 'vision_analyst', to: 'builder', type: 'collaboration' },

    // Archivist memory connections
    { from: 'archivist', to: 'meta_coordinator', type: 'memory' },
];

const CLUSTER_COLORS = {
    reasoning: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', stroke: '#9333ea' },
    information: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700', stroke: '#2563eb' },
    production: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', stroke: '#16a34a' },
    coordination: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700', stroke: '#ea580c' },
};

const CLUSTER_ICONS = {
    reasoning: Brain,
    information: Search,
    production: Wrench,
    coordination: Users,
};

// =============================================================================
// Component
// =============================================================================

interface AgentNetworkGraphProps {
    onAgentClick?: (agentId: string) => void;
    selectedAgentId?: string | null;
    enabledAgents?: Set<string>;
}

export default function AgentNetworkGraph({
    onAgentClick,
    selectedAgentId,
    enabledAgents = new Set(AGENTS.map(a => a.id))
}: AgentNetworkGraphProps) {
    const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

    const getAgentPosition = (agent: AgentNode) => ({
        left: `${agent.x}%`,
        top: `${agent.y}%`,
    });

    const getConnectionPath = (conn: Connection) => {
        const from = AGENTS.find(a => a.id === conn.from);
        const to = AGENTS.find(a => a.id === conn.to);
        if (!from || !to) return '';

        return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    };

    const getConnectionColor = (conn: Connection) => {
        switch (conn.type) {
            case 'coordination': return '#ea580c';
            case 'memory': return '#9333ea';
            default: return '#94a3b8';
        }
    };

    const isConnectionHighlighted = (conn: Connection) => {
        if (!hoveredAgent && !selectedAgentId) return false;
        const activeId = hoveredAgent || selectedAgentId;
        return conn.from === activeId || conn.to === activeId;
    };

    return (
        <div className="relative w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {/* Legend */}
            <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-3 text-xs">
                {Object.entries(CLUSTER_COLORS).map(([cluster, colors]) => {
                    const Icon = CLUSTER_ICONS[cluster as keyof typeof CLUSTER_ICONS];
                    return (
                        <div key={cluster} className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                            <Icon className="h-3 w-3" />
                            <span className="capitalize">{cluster === 'coordination' ? '协调' : cluster === 'reasoning' ? '推理' : cluster === 'information' ? '信息' : '生产'}</span>
                        </div>
                    );
                })}
            </div>

            {/* SVG Connections */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
            >
                <defs>
                    <marker
                        id="arrowhead"
                        markerWidth="6"
                        markerHeight="4"
                        refX="5"
                        refY="2"
                        orient="auto"
                    >
                        <polygon points="0 0, 6 2, 0 4" fill="#94a3b8" />
                    </marker>
                </defs>
                {CONNECTIONS.map((conn, i) => (
                    <path
                        key={i}
                        d={getConnectionPath(conn)}
                        fill="none"
                        stroke={isConnectionHighlighted(conn) ? getConnectionColor(conn) : '#e2e8f0'}
                        strokeWidth={isConnectionHighlighted(conn) ? 0.4 : 0.2}
                        strokeDasharray={conn.type === 'memory' ? '1,1' : undefined}
                        className="transition-all duration-200"
                        style={{ opacity: isConnectionHighlighted(conn) ? 1 : 0.5 }}
                    />
                ))}
            </svg>

            {/* Agent Nodes */}
            <div className="relative w-full" style={{ paddingBottom: '50%' }}>
                {AGENTS.map((agent) => {
                    const colors = CLUSTER_COLORS[agent.cluster];
                    const isSelected = selectedAgentId === agent.id;
                    const isHovered = hoveredAgent === agent.id;
                    const isEnabled = enabledAgents.has(agent.id);
                    const isHighlighted = isSelected || isHovered;

                    return (
                        <button
                            key={agent.id}
                            onClick={() => onAgentClick?.(agent.id)}
                            onMouseEnter={() => setHoveredAgent(agent.id)}
                            onMouseLeave={() => setHoveredAgent(null)}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 group
                                ${isHighlighted ? 'z-20 scale-110' : 'z-10'}
                                ${!isEnabled ? 'opacity-40' : ''}
                            `}
                            style={getAgentPosition(agent)}
                        >
                            <div className={`
                                flex flex-col items-center gap-0.5
                                ${isHighlighted ? 'drop-shadow-lg' : ''}
                            `}>
                                <div className={`
                                    w-10 h-10 rounded-xl flex items-center justify-center text-lg
                                    border-2 transition-all duration-200
                                    ${isSelected ? `${colors.bg} ${colors.border} ring-2 ring-offset-1 ring-${agent.cluster === 'reasoning' ? 'purple' : agent.cluster === 'information' ? 'blue' : agent.cluster === 'production' ? 'green' : 'orange'}-400` :
                                      isHovered ? `${colors.bg} ${colors.border}` :
                                      'bg-white border-gray-200 hover:border-gray-300'}
                                `}>
                                    {agent.icon}
                                </div>
                                <span className={`
                                    text-[10px] font-medium whitespace-nowrap px-1 py-0.5 rounded
                                    ${isHighlighted ? `${colors.bg} ${colors.text}` : 'text-gray-600'}
                                `}>
                                    {agent.nameCn}
                                </span>
                            </div>

                            {/* Tooltip */}
                            {isHovered && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-30">
                                    {agent.name}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Info */}
            <div className="absolute bottom-3 right-3 text-[10px] text-gray-400">
                点击 Agent 查看详情 | 14 Agents · 4 Clusters
            </div>
        </div>
    );
}
