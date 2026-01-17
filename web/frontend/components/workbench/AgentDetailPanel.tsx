'use client';

import { useEffect, useState } from 'react';

interface AgentActivity {
    timestamp: string;
    type: 'skill' | 'api' | 'data' | 'web' | 'thinking';
    description: string;
    details?: string;
}

interface AgentModule {
    name: string;
    description: string;
    status: 'active' | 'idle' | 'processing';
    skills?: string[];
    apis?: string[];
    data?: string[];
}

interface AgentConfig {
    id: string;
    name: string;
    nameCn: string;
    role: string;
    modules: AgentModule[];
    connections: string[];
}

// Agent 架构配置
const agentConfigs: Record<string, AgentConfig> = {
    meta_coordinator: {
        id: 'meta_coordinator',
        name: 'Meta-Coordinator',
        nameCn: '元协调者',
        role: '任务分解与调度',
        modules: [
            { name: '任务分解器', description: '将复杂任务分解为子任务', status: 'idle', skills: ['task_decomposition'] },
            { name: '优先级调度', description: '决定任务执行顺序', status: 'idle' },
            { name: 'Agent 分配', description: '将子任务分配给合适的 Agent', status: 'idle' },
        ],
        connections: ['explorer', 'logician', 'critic', 'builder', 'scribe'],
    },
    explorer: {
        id: 'explorer',
        name: 'Explorer',
        nameCn: '探索者',
        role: '信息收集与检索',
        modules: [
            { name: '文献检索', description: 'PubMed, arXiv, Google Scholar', status: 'idle', skills: ['pubmed_search', 'arxiv_search'], apis: ['PubMed API', 'Semantic Scholar'] },
            { name: '网页爬取', description: '提取网页内容', status: 'idle', skills: ['web_scraping'] },
            { name: '数据库查询', description: 'UniProt, PDB 等科学数据库', status: 'idle', skills: ['uniprot_search', 'pdb_search'] },
        ],
        connections: ['meta_coordinator', 'logician'],
    },
    logician: {
        id: 'logician',
        name: 'Logician',
        nameCn: '逻辑推理者',
        role: '逻辑验证与推理',
        modules: [
            { name: '逻辑验证', description: '检查推理链的有效性', status: 'idle', skills: ['logic_validation'] },
            { name: '假设生成', description: '基于证据提出假设', status: 'idle', skills: ['hypothesis_generation'] },
            { name: '矛盾检测', description: '发现不一致的论点', status: 'idle' },
        ],
        connections: ['explorer', 'critic'],
    },
    critic: {
        id: 'critic',
        name: 'Critic',
        nameCn: '批判者',
        role: '质量控制与评估',
        modules: [
            { name: '质量评估', description: '评估内容质量', status: 'idle', skills: ['quality_assessment'] },
            { name: '偏见检测', description: '识别潜在偏见', status: 'idle' },
            { name: '建设性反馈', description: '提供改进建议', status: 'idle' },
        ],
        connections: ['logician', 'builder'],
    },
    connector: {
        id: 'connector',
        name: 'Connector',
        nameCn: '连接者',
        role: '跨领域关联',
        modules: [
            { name: '概念映射', description: '建立领域间概念关联', status: 'idle' },
            { name: '创意激发', description: '发现意外联系', status: 'idle', skills: ['creative_association'] },
        ],
        connections: ['explorer', 'genealogist'],
    },
    genealogist: {
        id: 'genealogist',
        name: 'Genealogist',
        nameCn: '谱系学家',
        role: '知识溯源',
        modules: [
            { name: '引用追踪', description: '追溯引用网络', status: 'idle', skills: ['citation_tracking'] },
            { name: '演化分析', description: '分析概念演变', status: 'idle' },
        ],
        connections: ['explorer', 'historian'],
    },
    historian: {
        id: 'historian',
        name: 'Historian',
        nameCn: '历史学家',
        role: '历史背景研究',
        modules: [
            { name: '时间线构建', description: '建立发展时间线', status: 'idle', skills: ['timeline_construction'] },
            { name: '里程碑识别', description: '识别关键事件', status: 'idle' },
        ],
        connections: ['genealogist'],
    },
    social_scout: {
        id: 'social_scout',
        name: 'Social Scout',
        nameCn: '社交侦察',
        role: '学术社区洞察',
        modules: [
            { name: '作者分析', description: '研究关键作者', status: 'idle', skills: ['author_analysis'] },
            { name: '趋势监测', description: '追踪研究热点', status: 'idle' },
        ],
        connections: ['explorer'],
    },
    cn_specialist: {
        id: 'cn_specialist',
        name: 'CN Specialist',
        nameCn: '中文专家',
        role: '中文资源处理',
        modules: [
            { name: '中文检索', description: 'CNKI, 万方等', status: 'idle', skills: ['cnki_search'], apis: ['CNKI API'] },
            { name: '翻译桥接', description: '中英对照', status: 'idle' },
        ],
        connections: ['explorer'],
    },
    vision_analyst: {
        id: 'vision_analyst',
        name: 'Vision Analyst',
        nameCn: '视觉分析师',
        role: '图像与可视化',
        modules: [
            { name: '图像分析', description: '解析科学图像', status: 'idle', skills: ['image_analysis'] },
            { name: '可视化生成', description: '创建图表', status: 'idle', skills: ['visualization'] },
        ],
        connections: ['builder'],
    },
    builder: {
        id: 'builder',
        name: 'Builder',
        nameCn: '构建者',
        role: '知识整合',
        modules: [
            { name: '知识图谱', description: '构建知识网络', status: 'idle', skills: ['knowledge_graph'] },
            { name: '框架设计', description: '设计概念框架', status: 'idle' },
        ],
        connections: ['critic', 'scribe'],
    },
    scribe: {
        id: 'scribe',
        name: 'Scribe',
        nameCn: '记录者',
        role: '内容生成',
        modules: [
            { name: '报告撰写', description: '生成研究报告', status: 'idle', skills: ['report_generation'] },
            { name: '格式化', description: 'Markdown/PDF 输出', status: 'idle' },
        ],
        connections: ['builder', 'archivist'],
    },
    archivist: {
        id: 'archivist',
        name: 'Archivist',
        nameCn: '档案管理员',
        role: '记忆管理',
        modules: [
            { name: '存储管理', description: '管理研究数据', status: 'idle', data: ['research_sessions', 'knowledge_base'] },
            { name: '检索优化', description: '高效内容检索', status: 'idle' },
        ],
        connections: ['scribe'],
    },
    prompt_engineer: {
        id: 'prompt_engineer',
        name: 'Prompt Engineer',
        nameCn: '提示词工程师',
        role: '提示词优化',
        modules: [
            { name: '提示词设计', description: '优化 LLM 交互', status: 'idle', skills: ['prompt_optimization'] },
            { name: '模板管理', description: '管理提示词模板', status: 'idle' },
        ],
        connections: ['meta_coordinator'],
    },
};

interface AgentDetailSidebarProps {
    agentId: string | null;
    activities: AgentActivity[];
    onClose: () => void;
}

export function AgentDetailSidebar({ agentId, activities, onClose }: AgentDetailSidebarProps) {
    const [isVisible, setIsVisible] = useState(false);

    const config = agentId ? agentConfigs[agentId] : null;

    useEffect(() => {
        if (agentId) {
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
        }
    }, [agentId]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    if (!agentId || !config) return null;

    return (
        <div
            className={`fixed left-56 top-14 bottom-10 w-80 bg-[var(--bg-primary)] border-r border-[var(--border)] shadow-xl z-40 overflow-hidden transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                <div>
                    <h2 className="font-semibold">{config.nameCn}</h2>
                    <p className="text-xs text-[var(--text-muted)]">{config.role}</p>
                </div>
                <button
                    onClick={handleClose}
                    className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-lg"
                >
                    ✕
                </button>
            </div>

            <div className="overflow-auto h-[calc(100%-60px)] p-4">
                {/* Architecture Diagram */}
                <div className="mb-6">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                        🏗️ 模块架构
                    </h3>
                    <div className="space-y-2">
                        {config.modules.map((mod, idx) => (
                            <div
                                key={idx}
                                className="border border-[var(--border)] rounded-lg p-3 bg-[var(--bg-secondary)]"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-sm">{mod.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${mod.status === 'active' ? 'bg-green-100 text-green-700' :
                                            mod.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>
                                        {mod.status === 'active' ? '运行中' : mod.status === 'processing' ? '处理中' : '就绪'}
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mb-2">{mod.description}</p>

                                {mod.skills && mod.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {mod.skills.map((skill, i) => (
                                            <span key={i} className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                                                ⚡ {skill}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {mod.apis && mod.apis.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {mod.apis.map((api, i) => (
                                            <span key={i} className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                🔌 {api}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {mod.data && mod.data.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {mod.data.map((d, i) => (
                                            <span key={i} className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                                                📊 {d}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Connections */}
                <div className="mb-6">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                        🔗 连接的 Agents
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {config.connections.map((conn, idx) => (
                            <span
                                key={idx}
                                className="text-xs px-2 py-1 bg-[var(--bg-tertiary)] rounded-full border border-[var(--border)]"
                            >
                                → {agentConfigs[conn]?.nameCn || conn}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div>
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                        📋 最近活动
                    </h3>
                    {activities.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)] text-center py-4">暂无活动</p>
                    ) : (
                        <div className="space-y-2">
                            {activities.slice(-5).map((act, idx) => (
                                <div key={idx} className="text-xs border-l-2 border-[var(--accent)] pl-2 py-1">
                                    <span className="text-[var(--text-muted)]">
                                        {new Date(act.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
                                    </span>
                                    <span className="ml-2">{act.description}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
