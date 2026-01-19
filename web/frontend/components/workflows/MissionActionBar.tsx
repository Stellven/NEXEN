'use client';

import { Plus, Play, XCircle, ListTodo, Loader2 } from 'lucide-react';

interface MissionActionBarProps {
    hasRunningMission: boolean;
    hasPendingMission: boolean;
    missionCount: number;
    isPanelOpen: boolean;
    onCreateMission: () => void;
    onContinueMission: () => void;
    onCancelMission: () => void;
    onTogglePanel: () => void;
    isExecuting?: boolean;
}

export default function MissionActionBar({
    hasRunningMission,
    hasPendingMission,
    missionCount,
    isPanelOpen,
    onCreateMission,
    onContinueMission,
    onCancelMission,
    onTogglePanel,
    isExecuting = false,
}: MissionActionBarProps) {
    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-200 flex items-center gap-1 p-1.5">
            {/* Create Mission */}
            <button
                onClick={onCreateMission}
                disabled={isExecuting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <Plus className="w-4 h-4" />
                创建任务
            </button>

            <div className="w-px h-8 bg-gray-200 mx-1" />

            {/* Continue Mission */}
            <button
                onClick={onContinueMission}
                disabled={!hasPendingMission || isExecuting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {isExecuting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Play className="w-4 h-4" />
                )}
                继续任务
            </button>

            {/* Cancel Mission */}
            <button
                onClick={onCancelMission}
                disabled={!hasRunningMission}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <XCircle className="w-4 h-4" />
                取消任务
            </button>

            <div className="w-px h-8 bg-gray-200 mx-1" />

            {/* Task Panel Toggle */}
            <button
                onClick={onTogglePanel}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isPanelOpen
                        ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                        : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
                <ListTodo className="w-4 h-4" />
                任务面板
                {missionCount > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                        isPanelOpen ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                        {missionCount}
                    </span>
                )}
            </button>
        </div>
    );
}
