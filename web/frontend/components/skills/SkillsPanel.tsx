'use client';

import { useState, useEffect } from 'react';

interface Skill {
    name: string;
    display_name: string;
    description: string;
    category: string;
    parameters: Array<{
        name: string;
        description: string;
        type: string;
        required: boolean;
        default?: unknown;
        enum?: string[];
    }>;
}

interface SkillsData {
    total: number;
    categories: string[];
    skills: Skill[];
}

const categoryIcons: Record<string, string> = {
    literature: '📚',
    databases: '🗄️',
    data_analysis: '📊',
    visualization: '📈',
    methodology: '🔬',
    communication: '✍️',
    bioinformatics: '🧬',
    cheminformatics: '⚗️',
    clinical: '🏥',
    machine_learning: '🤖',
};

const categoryLabels: Record<string, string> = {
    literature: '文献检索',
    databases: '科学数据库',
    data_analysis: '数据分析',
    visualization: '可视化',
    methodology: '研究方法',
    communication: '科学写作',
};

export function SkillsPanel() {
    const [skills, setSkills] = useState<SkillsData | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [params, setParams] = useState<Record<string, unknown>>({});
    const [result, setResult] = useState<string | null>(null);

    useEffect(() => {
        fetchSkills();
    }, []);

    const fetchSkills = async () => {
        try {
            const response = await fetch('/api/skills');
            if (response.ok) {
                const data = await response.json();
                setSkills(data);
            }
        } catch (error) {
            console.error('Failed to fetch skills:', error);
        } finally {
            setLoading(false);
        }
    };

    const executeSkill = async () => {
        if (!selectedSkill) return;
        setExecuting(true);
        setResult(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/skills/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify({
                    skill_name: selectedSkill.name,
                    params,
                }),
            });

            const data = await response.json();
            setResult(data.success ? data.result : `Error: ${data.error}`);
        } catch (error) {
            setResult(`Execution failed: ${error}`);
        } finally {
            setExecuting(false);
        }
    };

    const filteredSkills = skills?.skills.filter(
        (s: Skill) => selectedCategory === 'all' || s.category === selectedCategory
    ) || [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold">🔬 科学技能</h2>
                <p className="text-sm text-gray-400 mt-1">{skills?.total || 0} 个技能可用</p>
            </div>

            <div className="p-3 border-b border-gray-700 overflow-x-auto">
                <div className="flex gap-2">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${selectedCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                    >
                        全部
                    </button>
                    {skills?.categories.map((cat: string) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                        >
                            {categoryIcons[cat] || '📦'} {categoryLabels[cat] || cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {selectedSkill ? (
                    <div className="p-4 space-y-4">
                        <button
                            onClick={() => {
                                setSelectedSkill(null);
                                setParams({});
                                setResult(null);
                            }}
                            className="text-sm text-gray-400 hover:text-white"
                        >
                            ← 返回列表
                        </button>

                        <div>
                            <h3 className="text-lg font-medium">{selectedSkill.display_name}</h3>
                            <p className="text-sm text-gray-400 mt-1">{selectedSkill.description}</p>
                        </div>

                        <div className="space-y-3">
                            {selectedSkill.parameters.map((param) => (
                                <div key={param.name}>
                                    <label className="block text-sm font-medium mb-1">
                                        {param.name}
                                        {param.required && <span className="text-red-400 ml-1">*</span>}
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">{param.description}</p>
                                    <textarea
                                        value={String(params[param.name] || '')}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                            setParams({ ...params, [param.name]: e.target.value })
                                        }
                                        rows={2}
                                        className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-600 text-sm resize-none"
                                        placeholder={`输入 ${param.name}...`}
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={executeSkill}
                            disabled={executing}
                            className="w-full py-2 px-4 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                            {executing ? '执行中...' : '执行技能'}
                        </button>

                        {result && (
                            <div className="mt-4 p-4 rounded-lg bg-gray-800 border border-gray-600">
                                <h4 className="text-sm font-medium mb-2">执行结果</h4>
                                <pre className="whitespace-pre-wrap text-xs">{result}</pre>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-3 space-y-2">
                        {filteredSkills.map((skill: Skill) => (
                            <button
                                key={skill.name}
                                onClick={() => setSelectedSkill(skill)}
                                className="w-full p-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-left transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">{categoryIcons[skill.category] || '📦'}</span>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm">{skill.display_name}</h4>
                                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{skill.description}</p>
                                    </div>
                                </div>
                            </button>
                        ))}

                        {filteredSkills.length === 0 && (
                            <p className="text-center text-gray-500 py-8">该类别暂无技能</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
