'use client';

import { useState, useCallback } from 'react';
import { X, Plus, Trash2, BarChart2, LineChart, PieChart, Activity } from 'lucide-react';
import { ChartRenderer } from './ChartRenderer';

interface ChartDataPoint {
    name: string;
    value: number;
    [key: string]: unknown;
}

interface ChartConfig {
    xKey: string;
    yKey: string;
    colors: string[];
}

interface ChartBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (chart: {
        type: string;
        title: string;
        data: ChartDataPoint[];
        config: ChartConfig;
    }) => void | Promise<void>;
    initialData?: {
        type: string;
        title: string;
        data: ChartDataPoint[];
        config?: ChartConfig;
    };
}

const CHART_TYPES = [
    { id: 'bar', name: '柱状图', icon: BarChart2 },
    { id: 'line', name: '折线图', icon: LineChart },
    { id: 'pie', name: '饼图', icon: PieChart },
    { id: 'area', name: '面积图', icon: Activity },
];

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function ChartBuilder({
    isOpen,
    onClose,
    onSave,
    initialData,
}: ChartBuilderProps) {
    const [type, setType] = useState<'line' | 'bar' | 'pie' | 'area'>(
        (initialData?.type as 'line' | 'bar' | 'pie' | 'area') || 'bar'
    );
    const [title, setTitle] = useState(initialData?.title || '');
    const [data, setData] = useState<ChartDataPoint[]>(
        initialData?.data || [
            { name: '类别 A', value: 100 },
            { name: '类别 B', value: 200 },
            { name: '类别 C', value: 150 },
        ]
    );
    const [colors, setColors] = useState<string[]>(
        initialData?.config?.colors || DEFAULT_COLORS
    );

    const handleAddDataPoint = useCallback(() => {
        setData([...data, { name: `类别 ${String.fromCharCode(65 + data.length)}`, value: 0 }]);
    }, [data]);

    const handleRemoveDataPoint = useCallback((index: number) => {
        setData(data.filter((_, i) => i !== index));
    }, [data]);

    const handleDataChange = useCallback(
        (index: number, field: 'name' | 'value', value: string | number) => {
            const newData = [...data];
            newData[index] = {
                ...newData[index],
                [field]: field === 'value' ? Number(value) : value,
            };
            setData(newData);
        },
        [data]
    );

    const handleSave = useCallback(() => {
        if (!title.trim()) {
            alert('请输入图表标题');
            return;
        }
        if (data.length === 0) {
            alert('请至少添加一个数据点');
            return;
        }

        onSave({
            type,
            title,
            data,
            config: {
                xKey: 'name',
                yKey: 'value',
                colors,
            },
        });
        onClose();
    }, [type, title, data, colors, onSave, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {initialData ? '编辑图表' : '添加图表'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 gap-6 overflow-hidden p-6">
                    {/* Left: Form */}
                    <div className="flex w-1/2 flex-col gap-4 overflow-y-auto">
                        {/* Title */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                图表标题
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="输入图表标题"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        {/* Chart Type */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                图表类型
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {CHART_TYPES.map((chartType) => {
                                    const Icon = chartType.icon;
                                    return (
                                        <button
                                            key={chartType.id}
                                            onClick={() => setType(chartType.id as typeof type)}
                                            className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors ${
                                                type === chartType.id
                                                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <span className="text-xs">{chartType.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Data Points */}
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700">数据</label>
                                <button
                                    onClick={handleAddDataPoint}
                                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                                >
                                    <Plus className="h-3 w-3" />
                                    添加
                                </button>
                            </div>
                            <div className="space-y-2">
                                {data.map((point, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div
                                            className="h-4 w-4 rounded-full"
                                            style={{ backgroundColor: colors[index % colors.length] }}
                                        />
                                        <input
                                            type="text"
                                            value={point.name}
                                            onChange={(e) =>
                                                handleDataChange(index, 'name', e.target.value)
                                            }
                                            placeholder="名称"
                                            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                                        />
                                        <input
                                            type="number"
                                            value={point.value}
                                            onChange={(e) =>
                                                handleDataChange(index, 'value', e.target.value)
                                            }
                                            placeholder="数值"
                                            className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                                        />
                                        <button
                                            onClick={() => handleRemoveDataPoint(index)}
                                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                            disabled={data.length <= 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Preview */}
                    <div className="flex w-1/2 flex-col">
                        <label className="mb-2 text-sm font-medium text-gray-700">预览</label>
                        <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <ChartRenderer
                                type={type}
                                title={title || '图表预览'}
                                data={data}
                                config={{
                                    xKey: 'name',
                                    yKey: 'value',
                                    colors,
                                }}
                                height={250}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                    >
                        {initialData ? '更新图表' : '添加图表'}
                    </button>
                </div>
            </div>
        </div>
    );
}
