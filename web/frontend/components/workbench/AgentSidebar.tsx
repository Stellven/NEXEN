'use client';

interface Agent {
    id: string;
    name: string;
    nameCn: string;
    status: 'idle' | 'running' | 'completed' | 'error';
    task?: string;
}

interface AgentSidebarProps {
    agents: Agent[];
    onAgentClick?: (agentId: string) => void;
}

const defaultAgents: Agent[] = [
    { id: 'meta_coordinator', name: 'Meta-Coordinator', nameCn: '元协调者', status: 'idle' },
    { id: 'explorer', name: 'Explorer', nameCn: '探索者', status: 'idle' },
    { id: 'logician', name: 'Logician', nameCn: '逻辑推理者', status: 'idle' },
    { id: 'critic', name: 'Critic', nameCn: '批判者', status: 'idle' },
    { id: 'connector', name: 'Connector', nameCn: '连接者', status: 'idle' },
    { id: 'genealogist', name: 'Genealogist', nameCn: '谱系学家', status: 'idle' },
    { id: 'historian', name: 'Historian', nameCn: '历史学家', status: 'idle' },
    { id: 'social_scout', name: 'Social Scout', nameCn: '社交侦察', status: 'idle' },
    { id: 'cn_specialist', name: 'CN Specialist', nameCn: '中文专家', status: 'idle' },
    { id: 'vision_analyst', name: 'Vision Analyst', nameCn: '视觉分析师', status: 'idle' },
    { id: 'builder', name: 'Builder', nameCn: '构建者', status: 'idle' },
    { id: 'scribe', name: 'Scribe', nameCn: '记录者', status: 'idle' },
    { id: 'archivist', name: 'Archivist', nameCn: '档案管理员', status: 'idle' },
    { id: 'prompt_engineer', name: 'Prompt Engineer', nameCn: '提示词工程师', status: 'idle' },
];

export function AgentSidebar({ agents = defaultAgents, onAgentClick }: AgentSidebarProps) {
    return (
        <aside className="w-56 border-r border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col">
            <div className="p-4">
                <h2 className="panel-header flex items-center gap-2">
                    <span>🤖</span>
                    <span>Agents</span>
                </h2>
            </div>

            <div className="flex-1 overflow-auto px-2 pb-4">
                {agents.map((agent) => (
                    <button
                        key={agent.id}
                        onClick={() => onAgentClick?.(agent.id)}
                        className="w-full text-left p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors mb-1"
                    >
                        <div className="flex items-center gap-2">
                            <span className={`agent-dot agent-dot-${agent.status}`} />
                            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                                {agent.nameCn}
                            </span>
                        </div>
                        {agent.task && (
                            <p className="text-xs text-[var(--text-muted)] mt-1 pl-4 truncate">
                                {agent.task}
                            </p>
                        )}
                        {agent.status === 'idle' && (
                            <p className="text-xs text-[var(--text-muted)] mt-1 pl-4">
                                待命
                            </p>
                        )}
                    </button>
                ))}
            </div>
        </aside>
    );
}
