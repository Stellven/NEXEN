'use client';

import { useEffect, useState } from 'react';
import {
    Brain,
    Search,
    MessageSquare,
    Code2,
    FileText,
    Users,
    History,
    Globe,
    Eye,
    Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { api, Agent } from '@/lib/api';

const agentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    meta_coordinator: Brain,
    explorer: Search,
    critic: MessageSquare,
    logician: Code2,
    scribe: FileText,
    genealogist: Users,
    historian: History,
    social_scout: Globe,
    vision_analyst: Eye,
    default: Brain,
};

const clusterColors: Record<string, string> = {
    coordination: 'bg-yellow-500',
    reasoning: 'bg-blue-500',
    information: 'bg-green-500',
    production: 'bg-purple-500',
};

export function AgentPanel() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAgents();
        // Poll for status updates
        const interval = setInterval(loadAgents, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadAgents = async () => {
        try {
            const data = await api.getAgents();
            setAgents(data.agents);
        } catch (error) {
            console.error('Failed to load agents:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-dark-muted" />
            </div>
        );
    }

    // Group by cluster
    const grouped: Record<string, Agent[]> = {};
    agents.forEach(agent => {
        if (!grouped[agent.cluster]) {
            grouped[agent.cluster] = [];
        }
        grouped[agent.cluster].push(agent);
    });

    const clusterLabels: Record<string, string> = {
        coordination: '协调',
        reasoning: '推理',
        information: '信息',
        production: '生产',
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-dark-border">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-nexen-400" />
                    Agent 状态
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-4">
                {Object.entries(grouped).map(([cluster, clusterAgents]) => (
                    <div key={cluster}>
                        <div className="flex items-center gap-2 px-2 py-1">
                            <div className={clsx('w-2 h-2 rounded-full', clusterColors[cluster])} />
                            <span className="text-xs text-dark-muted uppercase tracking-wider">
                                {clusterLabels[cluster] || cluster}
                            </span>
                        </div>

                        <div className="space-y-1">
                            {clusterAgents.map(agent => (
                                <AgentCard key={agent.id} agent={agent} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AgentCard({ agent }: { agent: Agent }) {
    const Icon = agentIcons[agent.id] || agentIcons.default;

    const statusColors: Record<string, string> = {
        idle: 'bg-gray-500',
        running: 'bg-green-500 animate-pulse',
        completed: 'bg-blue-500',
        failed: 'bg-red-500',
    };

    return (
        <div className={clsx(
            'p-3 rounded-lg transition-all cursor-pointer',
            agent.status === 'running'
                ? 'bg-nexen-500/20 border border-nexen-500/50'
                : 'bg-dark-card hover:bg-dark-border'
        )}>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-dark-bg rounded-lg">
                    <Icon className="w-4 h-4 text-dark-muted" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                            {agent.display_name_cn}
                        </span>
                        <div className={clsx(
                            'w-2 h-2 rounded-full',
                            statusColors[agent.status]
                        )} />
                    </div>
                    <div className="text-xs text-dark-muted truncate">
                        {agent.status === 'running'
                            ? agent.current_task
                            : agent.role_model}
                    </div>
                </div>
            </div>
        </div>
    );
}
