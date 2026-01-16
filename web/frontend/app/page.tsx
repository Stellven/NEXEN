'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkbenchLayout, AgentSidebar, LiveOutput, ResultPanel, ResearchInput } from '@/components/workbench';

interface Agent {
    id: string;
    name: string;
    nameCn: string;
    status: 'idle' | 'running' | 'completed' | 'error';
    task?: string;
}

interface LogEntry {
    id: string;
    timestamp: string;
    agent: string;
    level: 'info' | 'debug' | 'error' | 'success';
    message: string;
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

export default function HomePage() {
    const router = useRouter();
    const [agents, setAgents] = useState<Agent[]>(defaultAgents);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
        }
    }, [router]);

    // Poll for task status
    useEffect(() => {
        if (!taskId || !isLoading) return;

        const pollInterval = setInterval(async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/research/${taskId}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                if (!response.ok) return;

                const data = await response.json();

                // Update logs based on subtasks
                if (data.subtasks && data.subtasks.length > 0) {
                    const newLogs: LogEntry[] = data.subtasks.map((st: any, i: number) => ({
                        id: `subtask-${i}`,
                        timestamp: new Date().toISOString(),
                        agent: st.assigned_agent || 'Agent',
                        level: st.status === 'completed' ? 'success' : 'info',
                        message: st.description || st.status,
                    }));
                    setLogs((prev) => {
                        const existing = prev.filter((l) => !l.id.startsWith('subtask-'));
                        return [...existing, ...newLogs];
                    });
                }

                // Check if completed
                if (data.status === 'completed') {
                    setIsLoading(false);
                    setTaskId(null);
                    setResult(data.synthesis || '研究完成，但未生成合成结果。');

                    addLog('Meta-Coordinator', 'success', '研究任务完成！');

                    // Reset agents
                    setAgents(defaultAgents.map((a) => ({ ...a, status: 'completed' as const })));
                    setTimeout(() => setAgents(defaultAgents), 3000);
                } else if (data.status === 'failed') {
                    setIsLoading(false);
                    setTaskId(null);
                    addLog('System', 'error', data.message || '研究失败');
                    setAgents(defaultAgents);
                }
            } catch (error) {
                console.error('Poll error:', error);
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [taskId, isLoading]);

    const addLog = (agent: string, level: LogEntry['level'], message: string) => {
        setLogs((prev) => [
            ...prev,
            {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                agent,
                level,
                message,
            },
        ]);
    };

    const handleResearch = async (query: string) => {
        setIsLoading(true);
        setResult('');
        setLogs([]);

        addLog('Meta-Coordinator', 'info', `开始研究: "${query}"`);

        // Update agent status
        setAgents((prev) =>
            prev.map((a) =>
                a.id === 'meta_coordinator'
                    ? { ...a, status: 'running' as const, task: '分析研究问题...' }
                    : a
            )
        );

        try {
            const token = localStorage.getItem('token');

            // Create research task
            const response = await fetch('/api/research', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify({ task: query }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `API 错误: ${response.status}`);
            }

            const data = await response.json();
            setTaskId(data.task_id);

            addLog('System', 'info', `任务已创建: ${data.task_id}`);

            // Update more agents as running
            setAgents((prev) =>
                prev.map((a, i) =>
                    i < 5 ? { ...a, status: 'running' as const, task: '处理中...' } : a
                )
            );
        } catch (error: any) {
            setIsLoading(false);
            addLog('System', 'error', `失败: ${error.message}`);
            setAgents(defaultAgents);
        }
    };

    return (
        <WorkbenchLayout>
            <AgentSidebar agents={agents} />

            <main className="flex-1 flex flex-col overflow-hidden">
                <ResearchInput onSubmit={handleResearch} isLoading={isLoading} />

                <div className="flex-1 flex overflow-hidden">
                    <div className="w-1/2">
                        <LiveOutput logs={logs} />
                    </div>
                    <div className="w-1/2">
                        <ResultPanel content={result} />
                    </div>
                </div>
            </main>
        </WorkbenchLayout>
    );
}
