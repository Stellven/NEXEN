'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Clock, Play, ChevronRight, ChevronLeft, Loader2, RotateCcw, Check, Circle } from 'lucide-react';

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

export interface SubTask {
    id: string;
    title: string;
    agent_type: string;
    agent_name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    input?: string;
    output?: string;
    started_at?: string;
    completed_at?: string;
    duration_ms?: number;
}

export interface Mission {
    id: string;
    workflow_id: string;
    leader_type: string;
    leader_name: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
    progress: {
        current: number;
        total: number;
    };
    created_at: string;
    updated_at: string;
    result?: string;
    sub_tasks?: SubTask[];
}

interface MissionPanelProps {
    missions: Mission[];
    isOpen: boolean;
    onClose: () => void;
    onContinueMission?: (missionId: string) => void;
    onCancelMission?: (missionId: string) => void;
    onRetryMission?: (missionId: string) => void;
    onReplanMission?: (missionId: string) => void;
    onSaveToLibrary?: (missionId: string) => void;
    isLoading?: boolean;
    autoSelectMissionId?: string | null;
}

const STATUS_CONFIG = {
    pending: {
        label: '待执行',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        badgeColor: 'bg-gray-500',
    },
    running: {
        label: '执行中',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        badgeColor: 'bg-blue-500',
    },
    completed: {
        label: '已完成',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        badgeColor: 'bg-green-500',
    },
    cancelled: {
        label: '已取消',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        badgeColor: 'bg-gray-400',
    },
    failed: {
        label: '失败',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        badgeColor: 'bg-red-500',
    },
};

export default function MissionPanel({
    missions,
    isOpen,
    onClose,
    onContinueMission,
    onCancelMission,
    onRetryMission,
    onReplanMission,
    onSaveToLibrary,
    isLoading = false,
    autoSelectMissionId,
}: MissionPanelProps) {
    const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

    // Auto-select mission when specified (e.g., when a mission completes)
    useEffect(() => {
        if (autoSelectMissionId && autoSelectMissionId !== selectedMissionId) {
            setSelectedMissionId(autoSelectMissionId);
        }
    }, [autoSelectMissionId]);

    if (!isOpen) return null;

    // Statistics
    const runningCount = missions.filter((m) => m.status === 'running').length;
    const completedCount = missions.filter((m) => m.status === 'completed').length;

    const selectedMission = selectedMissionId
        ? missions.find((m) => m.id === selectedMissionId)
        : null;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Show mission detail view
    if (selectedMission) {
        return (
            <MissionDetailView
                mission={selectedMission}
                onBack={() => setSelectedMissionId(null)}
                onClose={onClose}
                onContinue={onContinueMission}
                onCancel={onCancelMission}
                onRetry={onRetryMission}
                onReplan={onReplanMission}
                onSaveToLibrary={onSaveToLibrary}
                formatDate={formatDate}
            />
        );
    }

    return (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Team Missions</h3>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : missions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <Clock className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">暂无任务</p>
                        <p className="text-xs text-gray-400 mt-1">点击"创建任务"开始协作</p>
                    </div>
                ) : (
                    <div className="p-3 space-y-3">
                        {/* History Section */}
                        <div className="text-xs font-medium text-gray-500 px-1">
                            历史任务 ({missions.length})
                        </div>

                        {/* Mission Cards */}
                        {missions.map((mission) => (
                            <MissionCard
                                key={mission.id}
                                mission={mission}
                                runningCount={runningCount}
                                completedCount={completedCount}
                                onViewDetail={() => setSelectedMissionId(mission.id)}
                                formatDate={formatDate}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

interface MissionCardProps {
    mission: Mission;
    runningCount: number;
    completedCount: number;
    onViewDetail: () => void;
    formatDate: (date: string) => string;
}

function MissionCard({
    mission,
    runningCount,
    completedCount,
    onViewDetail,
    formatDate,
}: MissionCardProps) {
    const statusConfig = STATUS_CONFIG[mission.status];
    const emoji = AGENT_EMOJIS[mission.leader_type] || '🤖';
    const isCompleted = mission.status === 'completed';

    return (
        <div className="bg-gray-50 rounded-xl p-3 space-y-3">
            {/* Task Header */}
            <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                    {isCompleted ? (
                        <Check className="w-3 h-3 text-white" />
                    ) : (
                        <Circle className="w-3 h-3 text-white" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {mission.description.length > 40
                            ? mission.description.substring(0, 40) + '...'
                            : mission.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg">{emoji}</span>
                        <span className="text-xs text-gray-500">
                            {mission.leader_name}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Running Count */}
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full border-2 border-blue-200 flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-600">
                                {mission.status === 'running' ? 1 : 0}
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1">执行中</span>
                    </div>
                    {/* Completed Count */}
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full border-2 border-green-200 flex items-center justify-center">
                            <span className="text-sm font-semibold text-green-600">
                                {mission.progress.current}
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1">已完成</span>
                    </div>
                </div>

                {/* Progress */}
                <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                        {mission.progress.current}/{mission.progress.total}
                    </p>
                </div>
            </div>

            {/* View Detail Button */}
            <button
                onClick={onViewDetail}
                className="w-full py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
                查看详情
            </button>
        </div>
    );
}

interface MissionDetailViewProps {
    mission: Mission;
    onBack: () => void;
    onClose: () => void;
    onContinue?: (missionId: string) => void;
    onCancel?: (missionId: string) => void;
    onRetry?: (missionId: string) => void;
    onReplan?: (missionId: string) => void;
    onSaveToLibrary?: (missionId: string) => void;
    formatDate: (date: string) => string;
}

function MissionDetailView({
    mission,
    onBack,
    onClose,
    onContinue,
    onCancel,
    onRetry,
    onReplan,
    onSaveToLibrary,
    formatDate,
}: MissionDetailViewProps) {
    const [expandedSubTaskId, setExpandedSubTaskId] = useState<string | null>(null);
    const statusConfig = STATUS_CONFIG[mission.status];
    const emoji = AGENT_EMOJIS[mission.leader_type] || '🤖';
    const progressPercent = Math.round((mission.progress.current / mission.progress.total) * 100);

    return (
        <div className="w-[420px] bg-white border-l border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <div className="flex-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Task Title */}
                <div>
                    <h3 className="text-base font-semibold text-gray-900 leading-relaxed">
                        {mission.description}
                    </h3>
                </div>

                {/* Agent & Time Info */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <span className="text-gray-600">{mission.leader_name}</span>
                    </div>
                    <span className="text-gray-400 text-xs">
                        创建于 {formatDate(mission.created_at)}
                    </span>
                </div>

                {/* Progress Section */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">任务进度</span>
                        <span className="text-sm text-gray-500">
                            完成进度 {mission.progress.current}/{mission.progress.total} ({progressPercent}%)
                        </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${
                                mission.status === 'completed' ? 'bg-green-500' :
                                mission.status === 'running' ? 'bg-blue-500' :
                                mission.status === 'cancelled' ? 'bg-gray-400' : 'bg-gray-300'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Sub Tasks Section with Input/Output */}
                {mission.sub_tasks && mission.sub_tasks.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700 flex items-center justify-between">
                            <span>执行步骤详情</span>
                            <span className="text-xs text-gray-400 font-normal">点击展开查看输入输出</span>
                        </h4>
                        <div className="space-y-2">
                            {mission.sub_tasks.map((subTask, index) => {
                                const subTaskEmoji = AGENT_EMOJIS[subTask.agent_type] || '🤖';
                                const isExpanded = expandedSubTaskId === subTask.id;

                                return (
                                    <div
                                        key={subTask.id}
                                        className={`rounded-lg border transition-all ${
                                            subTask.status === 'completed' ? 'border-green-200 bg-green-50/50' :
                                            subTask.status === 'running' ? 'border-blue-200 bg-blue-50/50' :
                                            subTask.status === 'failed' ? 'border-red-200 bg-red-50/50' :
                                            'border-gray-200 bg-gray-50'
                                        }`}
                                    >
                                        {/* Sub Task Header */}
                                        <button
                                            onClick={() => setExpandedSubTaskId(isExpanded ? null : subTask.id)}
                                            className="w-full flex items-start gap-3 p-3 text-left"
                                        >
                                            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                                                subTask.status === 'completed' ? 'bg-green-500' :
                                                subTask.status === 'running' ? 'bg-blue-500' :
                                                subTask.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                                            }`}>
                                                {subTask.status === 'completed' ? (
                                                    <Check className="w-3.5 h-3.5 text-white" />
                                                ) : subTask.status === 'running' ? (
                                                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                                                ) : (
                                                    <span className="text-xs text-white font-medium">{index + 1}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base">{subTaskEmoji}</span>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {subTask.agent_name || subTask.agent_type}
                                                    </span>
                                                    {subTask.duration_ms && (
                                                        <span className="text-xs text-gray-400">
                                                            {(subTask.duration_ms / 1000).toFixed(1)}s
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 mt-0.5">{subTask.title}</p>
                                            </div>
                                            <ChevronRight
                                                className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${
                                                    isExpanded ? 'rotate-90' : ''
                                                }`}
                                            />
                                        </button>

                                        {/* Expanded Input/Output */}
                                        {isExpanded && (subTask.input || subTask.output) && (
                                            <div className="px-3 pb-3 space-y-3 border-t border-gray-200/50 pt-3 mx-3">
                                                {/* Input */}
                                                {subTask.input && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                            <span className="text-xs font-medium text-gray-500 uppercase">输入</span>
                                                        </div>
                                                        <div className="bg-white rounded-lg p-2.5 border border-gray-200">
                                                            <p className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
                                                                {subTask.input}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Output */}
                                                {subTask.output && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                            <span className="text-xs font-medium text-gray-500 uppercase">输出</span>
                                                        </div>
                                                        <div className="bg-white rounded-lg p-2.5 border border-gray-200 max-h-48 overflow-y-auto">
                                                            <p className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
                                                                {subTask.output}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Final Result Section */}
                {mission.result && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">最终结果</h4>
                        <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {mission.result}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 space-y-2">
                {mission.status === 'running' && onCancel && (
                    <button
                        onClick={() => onCancel(mission.id)}
                        className="w-full py-2.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        取消任务
                    </button>
                )}

                {(mission.status === 'cancelled' || mission.status === 'failed') && (
                    <>
                        {onContinue && mission.progress.current < mission.progress.total && (
                            <button
                                onClick={() => onContinue(mission.id)}
                                className="w-full py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Play className="w-4 h-4" />
                                继续执行未完成任务
                            </button>
                        )}
                        {onReplan && (
                            <button
                                onClick={() => onReplan(mission.id)}
                                className="w-full py-2.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" />
                                重新规划并执行
                            </button>
                        )}
                    </>
                )}

                {mission.status === 'completed' && (
                    <>
                        <div className="flex items-center justify-center gap-2 py-2 text-green-600">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium">任务已完成</span>
                        </div>
                        {onSaveToLibrary && (
                            <button
                                onClick={() => onSaveToLibrary(mission.id)}
                                className="w-full py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                保存到知识库
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
