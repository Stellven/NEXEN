'use client';

import { useState } from 'react';
import { X, Check, Mail } from 'lucide-react';
import type { AgentProfile, DefaultAgentTemplate } from '@/lib/api';

// Agent emoji mapping
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

// Cluster colors for agent cards
const CLUSTER_COLORS: Record<string, { bg: string; border: string; selectedBg: string; selectedBorder: string }> = {
    coordination: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        selectedBg: 'bg-orange-100',
        selectedBorder: 'border-orange-400',
    },
    reasoning: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        selectedBg: 'bg-purple-100',
        selectedBorder: 'border-purple-400',
    },
    information: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        selectedBg: 'bg-blue-100',
        selectedBorder: 'border-blue-400',
    },
    production: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        selectedBg: 'bg-green-100',
        selectedBorder: 'border-green-400',
    },
};

interface CreateMissionModalProps {
    agents: (AgentProfile | DefaultAgentTemplate)[];
    onClose: () => void;
    onSubmit: (data: { leaderId: string; leaderType: string; description: string; email?: string }) => void;
    isSubmitting?: boolean;
}

export default function CreateMissionModal({
    agents,
    onClose,
    onSubmit,
    isSubmitting = false,
}: CreateMissionModalProps) {
    const [selectedLeader, setSelectedLeader] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [email, setEmail] = useState('');
    const [showEmailInput, setShowEmailInput] = useState(false);

    // Filter to show only enabled agents
    const availableAgents = agents.filter((agent) => {
        if ('is_enabled' in agent) {
            return agent.is_enabled;
        }
        return true;
    });

    const handleSubmit = () => {
        if (!selectedLeader || !description.trim()) return;

        const selectedAgent = availableAgents.find(
            (a) => a.agent_type === selectedLeader
        );

        onSubmit({
            leaderId: selectedLeader,
            leaderType: selectedAgent?.agent_type || selectedLeader,
            description: description.trim(),
            email: email.trim() || undefined,
        });
    };

    const isValid = selectedLeader && description.trim().length > 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Create Team Mission
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Assign a leader and describe the task
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-5">
                    {/* Leader Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Select Team Leader
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {availableAgents.slice(0, 6).map((agent) => {
                                const emoji = AGENT_EMOJIS[agent.agent_type] || '🤖';
                                const cluster = agent.cluster || 'reasoning';
                                const colors = CLUSTER_COLORS[cluster] || CLUSTER_COLORS.reasoning;
                                const isSelected = selectedLeader === agent.agent_type;

                                return (
                                    <button
                                        key={agent.agent_type}
                                        onClick={() => setSelectedLeader(agent.agent_type)}
                                        className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                                            isSelected
                                                ? `${colors.selectedBg} ${colors.selectedBorder}`
                                                : `${colors.bg} ${colors.border} hover:shadow-md`
                                        }`}
                                    >
                                        {isSelected && (
                                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm text-xl">
                                            {emoji}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="text-sm font-medium text-gray-900 truncate">
                                                {agent.display_name_cn || agent.display_name}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">
                                                {agent.role_model.split('/').pop()}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Task Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Task Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                            placeholder="Describe what you want the team to accomplish..."
                        />
                        <p className="mt-2 text-xs text-gray-500">
                            The leader will analyze this task and coordinate the team to complete it.
                        </p>
                    </div>

                    {/* Notification Email (Optional) */}
                    <div>
                        {!showEmailInput ? (
                            <button
                                onClick={() => setShowEmailInput(true)}
                                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                                <span>Notification Email (Optional)</span>
                            </button>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notification Email <span className="text-gray-400">(Optional)</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    placeholder="your@email.com"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid || isSubmitting}
                        className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? 'Starting...' : 'Start Mission'}
                    </button>
                </div>
            </div>
        </div>
    );
}
