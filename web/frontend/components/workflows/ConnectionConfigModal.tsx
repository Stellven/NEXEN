'use client';

import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import type { WorkflowEdge, WorkflowEdgeConfig } from '@/lib/api';

interface ConnectionConfigModalProps {
    edge?: WorkflowEdge;
    onSave: (config: WorkflowEdgeConfig) => void;
    onClose: () => void;
}

type DataFormat = 'markdown' | 'json' | 'text' | 'auto';
type TransformMode = 'pass' | 'summarize' | 'extract' | 'filter';
type ConditionOperator = 'gt' | 'lt' | 'eq' | 'contains';

const DEFAULT_CONFIG: WorkflowEdgeConfig = {
    dataFormat: 'auto',
    transform: { mode: 'pass' },
    priority: 5,
    blocking: true,
    timeout: 300,
};

export default function ConnectionConfigModal({
    edge,
    onSave,
    onClose,
}: ConnectionConfigModalProps) {
    const [dataFormat, setDataFormat] = useState<DataFormat>('auto');
    const [transformMode, setTransformMode] = useState<TransformMode>('pass');
    const [maxTokens, setMaxTokens] = useState(500);
    const [extractFields, setExtractFields] = useState('');
    const [filterCondition, setFilterCondition] = useState('');
    const [conditionEnabled, setConditionEnabled] = useState(false);
    const [conditionField, setConditionField] = useState('');
    const [conditionOperator, setConditionOperator] = useState<ConditionOperator>('gt');
    const [conditionValue, setConditionValue] = useState('');
    const [priority, setPriority] = useState(5);
    const [blocking, setBlocking] = useState(true);
    const [timeout, setTimeout] = useState(300);

    useEffect(() => {
        if (edge?.config) {
            const c = edge.config;
            setDataFormat(c.dataFormat || 'auto');
            setTransformMode(c.transform?.mode || 'pass');
            setMaxTokens(c.transform?.maxTokens || 500);
            setExtractFields(c.transform?.extractFields?.join(', ') || '');
            setFilterCondition(c.transform?.filterCondition || '');
            setConditionEnabled(c.condition?.enabled || false);
            setConditionField(c.condition?.field || '');
            setConditionOperator((c.condition?.operator as ConditionOperator) || 'gt');
            setConditionValue(c.condition?.value?.toString() || '');
            setPriority(c.priority || 5);
            setBlocking(c.blocking ?? true);
            setTimeout(c.timeout || 300);
        }
    }, [edge]);

    const handleSave = () => {
        const config: WorkflowEdgeConfig = {
            dataFormat,
            transform: {
                mode: transformMode,
                ...(transformMode === 'summarize' && { maxTokens }),
                ...(transformMode === 'extract' && {
                    extractFields: extractFields.split(',').map((s) => s.trim()).filter(Boolean),
                }),
                ...(transformMode === 'filter' && { filterCondition }),
            },
            ...(conditionEnabled && {
                condition: {
                    enabled: true,
                    field: conditionField,
                    operator: conditionOperator,
                    value: conditionValue,
                },
            }),
            priority,
            blocking,
            timeout,
        };
        onSave(config);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Connection Configuration
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
                    {/* Data Format */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Data Format
                        </label>
                        <select
                            value={dataFormat}
                            onChange={(e) => setDataFormat(e.target.value as DataFormat)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="auto">Auto Detect</option>
                            <option value="markdown">Markdown</option>
                            <option value="json">JSON</option>
                            <option value="text">Plain Text</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                            Format of data passed between agents
                        </p>
                    </div>

                    {/* Transform Mode */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Transform Mode
                        </label>
                        <select
                            value={transformMode}
                            onChange={(e) => setTransformMode(e.target.value as TransformMode)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="pass">Pass Through</option>
                            <option value="summarize">Summarize</option>
                            <option value="extract">Extract Fields</option>
                            <option value="filter">Filter</option>
                        </select>

                        {/* Transform-specific options */}
                        {transformMode === 'summarize' && (
                            <div className="mt-3">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Max Tokens
                                </label>
                                <input
                                    type="number"
                                    value={maxTokens}
                                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    min="100"
                                    max="4000"
                                />
                            </div>
                        )}

                        {transformMode === 'extract' && (
                            <div className="mt-3">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Fields to Extract (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={extractFields}
                                    onChange={(e) => setExtractFields(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="title, summary, findings"
                                />
                            </div>
                        )}

                        {transformMode === 'filter' && (
                            <div className="mt-3">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Filter Condition
                                </label>
                                <input
                                    type="text"
                                    value={filterCondition}
                                    onChange={(e) => setFilterCondition(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="confidence > 0.8"
                                />
                            </div>
                        )}
                    </div>

                    {/* Conditional Routing */}
                    <div className="border-t border-gray-200 pt-6">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-gray-700">
                                Conditional Routing
                            </label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={conditionEnabled}
                                    onChange={(e) => setConditionEnabled(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {conditionEnabled && (
                            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Field
                                        </label>
                                        <input
                                            type="text"
                                            value={conditionField}
                                            onChange={(e) => setConditionField(e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                            placeholder="confidence"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Operator
                                        </label>
                                        <select
                                            value={conditionOperator}
                                            onChange={(e) =>
                                                setConditionOperator(e.target.value as ConditionOperator)
                                            }
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                        >
                                            <option value="gt">&gt; Greater than</option>
                                            <option value="lt">&lt; Less than</option>
                                            <option value="eq">= Equal to</option>
                                            <option value="contains">Contains</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Value
                                        </label>
                                        <input
                                            type="text"
                                            value={conditionValue}
                                            onChange={(e) => setConditionValue(e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                            placeholder="0.8"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Execution Control */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">
                            Execution Control
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Priority (1-10)
                                </label>
                                <input
                                    type="number"
                                    value={priority}
                                    onChange={(e) =>
                                        setPriority(Math.max(1, Math.min(10, parseInt(e.target.value))))
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    min="1"
                                    max="10"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Timeout (sec)
                                </label>
                                <input
                                    type="number"
                                    value={timeout}
                                    onChange={(e) => setTimeout(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    min="30"
                                    max="3600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Blocking
                                </label>
                                <select
                                    value={blocking ? 'yes' : 'no'}
                                    onChange={(e) => setBlocking(e.target.value === 'yes')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-2 flex items-start gap-2 text-xs text-gray-500">
                            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>
                                Blocking connections wait for completion before proceeding.
                                Non-blocking allows parallel execution.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
