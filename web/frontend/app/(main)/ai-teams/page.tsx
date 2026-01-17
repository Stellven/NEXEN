'use client';

import { useState } from 'react';
import {
    Users,
    Plus,
    Settings,
    MessageSquare,
    CheckSquare,
    UserPlus,
    MoreVertical,
    Circle,
} from 'lucide-react';

interface Team {
    id: string;
    name: string;
    description: string;
    memberCount: number;
    taskCount: number;
    avatar: string;
}

interface Task {
    id: string;
    title: string;
    status: 'todo' | 'in_progress' | 'done';
    assignee: string;
    dueDate: string;
}

export default function MyTeamsPage() {
    const [teams] = useState<Team[]>([
        {
            id: '1',
            name: '产品研发团队',
            description: '负责核心产品开发',
            memberCount: 8,
            taskCount: 12,
            avatar: 'P',
        },
        {
            id: '2',
            name: 'AI 研究小组',
            description: '探索前沿 AI 技术',
            memberCount: 5,
            taskCount: 6,
            avatar: 'A',
        },
    ]);

    const [tasks] = useState<Task[]>([
        { id: '1', title: '完成 API 设计文档', status: 'in_progress', assignee: '张三', dueDate: '2024-01-20' },
        { id: '2', title: '优化数据库性能', status: 'todo', assignee: '李四', dueDate: '2024-01-22' },
        { id: '3', title: '编写单元测试', status: 'done', assignee: '王五', dueDate: '2024-01-18' },
    ]);

    const getStatusColor = (status: Task['status']) => {
        switch (status) {
            case 'todo':
                return 'bg-gray-100 text-gray-700';
            case 'in_progress':
                return 'bg-blue-100 text-blue-700';
            case 'done':
                return 'bg-green-100 text-green-700';
        }
    };

    const getStatusLabel = (status: Task['status']) => {
        switch (status) {
            case 'todo':
                return '待办';
            case 'in_progress':
                return '进行中';
            case 'done':
                return '已完成';
        }
    };

    return (
        <div className="flex h-full flex-col">
            {/* 头部 */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">My Teams</h1>
                        <p className="text-sm text-gray-500">团队协作与任务管理</p>
                    </div>
                    <button className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">
                        <Plus className="h-4 w-4" />
                        创建团队
                    </button>
                </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* 团队列表 */}
                <div className="mb-8">
                    <h2 className="mb-4 font-semibold text-gray-700">我的团队</h2>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {teams.map((team) => (
                            <div
                                key={team.id}
                                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-blue-200 hover:shadow-md"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-lg font-bold text-white">
                                        {team.avatar}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{team.name}</h3>
                                        <p className="text-sm text-gray-500">{team.description}</p>
                                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3.5 w-3.5" />
                                                {team.memberCount} 成员
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <CheckSquare className="h-3.5 w-3.5" />
                                                {team.taskCount} 任务
                                            </span>
                                        </div>
                                    </div>
                                    <button className="rounded p-1 hover:bg-gray-100">
                                        <MoreVertical className="h-4 w-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* 创建新团队卡片 */}
                        <div className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-8 transition-colors hover:border-blue-400 hover:bg-blue-50/50">
                            <div className="text-center">
                                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                                    <Plus className="h-5 w-5 text-gray-400" />
                                </div>
                                <p className="text-sm font-medium text-gray-600">创建新团队</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 任务看板 */}
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-700">我的任务</h2>
                        <button className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600">
                            <Plus className="h-4 w-4" />
                            添加任务
                        </button>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white">
                        {tasks.map((task, index) => (
                            <div
                                key={task.id}
                                className={`flex items-center gap-4 p-4 ${
                                    index !== tasks.length - 1 ? 'border-b border-gray-100' : ''
                                }`}
                            >
                                <Circle
                                    className={`h-5 w-5 ${
                                        task.status === 'done'
                                            ? 'fill-green-500 text-green-500'
                                            : 'text-gray-300'
                                    }`}
                                />
                                <div className="flex-1">
                                    <p
                                        className={`font-medium ${
                                            task.status === 'done'
                                                ? 'text-gray-400 line-through'
                                                : 'text-gray-900'
                                        }`}
                                    >
                                        {task.title}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        负责人: {task.assignee} · 截止: {task.dueDate}
                                    </p>
                                </div>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                                        task.status
                                    )}`}
                                >
                                    {getStatusLabel(task.status)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
