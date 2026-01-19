'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Grid3X3,
    Plus,
    Sparkles,
    Scale,
    BarChart3,
    Trash2,
    X,
    Calculator,
    Loader2,
} from 'lucide-react';
import {
    decisionApi,
    DecisionAnalysis,
    DecisionListItem,
    DecisionOption,
    DecisionCriterion,
} from '@/lib/api';

// =============================================================================
// Create Modal
// =============================================================================

interface CreateModalProps {
    onClose: () => void;
    onCreate: (title: string, description?: string) => void;
}

function CreateModal({ onClose, onCreate }: CreateModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            onCreate(title.trim(), description.trim() || undefined);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">New Decision Analysis</h3>
                    <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Technology Selection"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Description (optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your decision..."
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            rows={3}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
                            Cancel
                        </button>
                        <button type="submit" className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600">
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =============================================================================
// Add Item Modal
// =============================================================================

interface AddItemModalProps {
    type: 'option' | 'criterion';
    onClose: () => void;
    onAdd: (name: string, description?: string, criterionType?: 'benefit' | 'cost') => void;
}

function AddItemModal({ type, onClose, onAdd }: AddItemModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [criterionType, setCriterionType] = useState<'benefit' | 'cost'>('benefit');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onAdd(name.trim(), description.trim() || undefined, type === 'criterion' ? criterionType : undefined);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Add {type === 'option' ? 'Option' : 'Criterion'}
                    </h3>
                    <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={type === 'option' ? 'e.g., Option A' : 'e.g., Cost'}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description..."
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                    {type === 'criterion' && (
                        <div className="mb-6">
                            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        checked={criterionType === 'benefit'}
                                        onChange={() => setCriterionType('benefit')}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm text-gray-600">Benefit (higher is better)</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        checked={criterionType === 'cost'}
                                        onChange={() => setCriterionType('cost')}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm text-gray-600">Cost (lower is better)</span>
                                </label>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
                            Cancel
                        </button>
                        <button type="submit" className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600">
                            Add
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =============================================================================
// Main Page
// =============================================================================

export default function AIDecisionPage() {
    const [analyses, setAnalyses] = useState<DecisionListItem[]>([]);
    const [currentAnalysis, setCurrentAnalysis] = useState<DecisionAnalysis | null>(null);
    const [activeTab, setActiveTab] = useState<'matrix' | 'weights' | 'results' | 'ai'>('matrix');
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [aiRecommendation, setAiRecommendation] = useState('');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddOptionModal, setShowAddOptionModal] = useState(false);
    const [showAddCriterionModal, setShowAddCriterionModal] = useState(false);

    // Load analyses list
    const loadAnalyses = useCallback(async () => {
        try {
            const res = await decisionApi.getAnalyses();
            setAnalyses(res.analyses);
        } catch (error) {
            console.error('Failed to load analyses:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAnalyses();
    }, [loadAnalyses]);

    // Load specific analysis
    const loadAnalysis = async (id: string) => {
        try {
            const analysis = await decisionApi.getAnalysis(id);
            setCurrentAnalysis(analysis);
            setAiRecommendation(analysis.ai_recommendation || '');
        } catch (error) {
            console.error('Failed to load analysis:', error);
        }
    };

    // Create new analysis
    const handleCreate = async (title: string, description?: string) => {
        try {
            const analysis = await decisionApi.createAnalysis({ title, description });
            setShowCreateModal(false);
            await loadAnalyses();
            setCurrentAnalysis(analysis);
        } catch (error) {
            console.error('Failed to create analysis:', error);
        }
    };

    // Delete analysis
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this analysis?')) return;
        try {
            await decisionApi.deleteAnalysis(id);
            if (currentAnalysis?.id === id) {
                setCurrentAnalysis(null);
            }
            await loadAnalyses();
        } catch (error) {
            console.error('Failed to delete analysis:', error);
        }
    };

    // Add option
    const handleAddOption = async (name: string, description?: string) => {
        if (!currentAnalysis) return;
        try {
            const newOption: DecisionOption = {
                id: crypto.randomUUID(),
                name,
                description,
            };
            const updated = await decisionApi.updateOptions(currentAnalysis.id, [...currentAnalysis.options, newOption]);
            setCurrentAnalysis(updated);
            setShowAddOptionModal(false);
        } catch (error) {
            console.error('Failed to add option:', error);
        }
    };

    // Add criterion
    const handleAddCriterion = async (name: string, description?: string, type?: 'benefit' | 'cost') => {
        if (!currentAnalysis) return;
        try {
            const newCriterion: DecisionCriterion = {
                id: crypto.randomUUID(),
                name,
                description,
                type: type || 'benefit',
            };
            const updated = await decisionApi.updateCriteria(currentAnalysis.id, [...currentAnalysis.criteria, newCriterion]);
            setCurrentAnalysis(updated);
            setShowAddCriterionModal(false);
        } catch (error) {
            console.error('Failed to add criterion:', error);
        }
    };

    // Remove option
    const handleRemoveOption = async (optionId: string) => {
        if (!currentAnalysis) return;
        try {
            const updated = await decisionApi.updateOptions(
                currentAnalysis.id,
                currentAnalysis.options.filter(o => o.id !== optionId)
            );
            setCurrentAnalysis(updated);
        } catch (error) {
            console.error('Failed to remove option:', error);
        }
    };

    // Remove criterion
    const handleRemoveCriterion = async (criterionId: string) => {
        if (!currentAnalysis) return;
        try {
            const updated = await decisionApi.updateCriteria(
                currentAnalysis.id,
                currentAnalysis.criteria.filter(c => c.id !== criterionId)
            );
            setCurrentAnalysis(updated);
        } catch (error) {
            console.error('Failed to remove criterion:', error);
        }
    };

    // Update score
    const handleScoreChange = async (optionId: string, criterionId: string, value: number) => {
        if (!currentAnalysis) return;
        const newScores = { ...currentAnalysis.scores };
        if (!newScores[optionId]) newScores[optionId] = {};
        newScores[optionId][criterionId] = value;

        try {
            const updated = await decisionApi.updateScores(currentAnalysis.id, newScores);
            setCurrentAnalysis(updated);
        } catch (error) {
            console.error('Failed to update score:', error);
        }
    };

    // Update weight
    const handleWeightChange = async (criterionId: string, value: number) => {
        if (!currentAnalysis) return;
        const newWeights = { ...currentAnalysis.weights, [criterionId]: value };

        try {
            const updated = await decisionApi.updateWeights(currentAnalysis.id, newWeights);
            setCurrentAnalysis(updated);
        } catch (error) {
            console.error('Failed to update weight:', error);
        }
    };

    // Calculate
    const handleCalculate = async () => {
        if (!currentAnalysis) return;
        setCalculating(true);
        try {
            const result = await decisionApi.calculate(currentAnalysis.id);
            setCurrentAnalysis({
                ...currentAnalysis,
                results: result.results,
                ranking: result.ranking,
            });
            setActiveTab('results');
        } catch (error) {
            console.error('Failed to calculate:', error);
        } finally {
            setCalculating(false);
        }
    };

    // Generate AI recommendation
    const handleGenerateAI = async () => {
        if (!currentAnalysis) return;
        setGeneratingAI(true);
        setAiRecommendation('');
        setActiveTab('ai');

        try {
            await decisionApi.generateRecommendation(
                currentAnalysis.id,
                { model: 'openai/gpt-4o' },
                (content) => setAiRecommendation(prev => prev + content),
                () => setGeneratingAI(false),
                (error) => {
                    console.error('AI error:', error);
                    setGeneratingAI(false);
                }
            );
        } catch (error) {
            console.error('Failed to generate AI recommendation:', error);
            setGeneratingAI(false);
        }
    };

    // Get option name by ID
    const getOptionName = (id: string) => currentAnalysis?.options.find(o => o.id === id)?.name || id;

    return (
        <div className="flex h-full">
            {/* Sidebar - Analysis List */}
            <div className="w-64 border-r border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 p-4">
                    <h2 className="font-semibold text-gray-900">Analyses</h2>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="rounded p-1 hover:bg-gray-100"
                        title="New Analysis"
                    >
                        <Plus className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <div className="overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : analyses.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-500">No analyses yet</p>
                    ) : (
                        <div className="space-y-1">
                            {analyses.map(a => (
                                <div
                                    key={a.id}
                                    className={`group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 ${
                                        currentAnalysis?.id === a.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                                    }`}
                                    onClick={() => loadAnalysis(a.id)}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{a.title}</p>
                                        <p className="text-xs text-gray-400">{a.option_count} options</p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
                                        className="ml-2 hidden rounded p-1 hover:bg-gray-200 group-hover:block"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {!currentAnalysis ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <Grid3X3 className="mb-4 h-12 w-12 text-gray-300" />
                        <p className="text-gray-500">Select an analysis or create a new one</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
                        >
                            <Plus className="h-4 w-4" />
                            New Analysis
                        </button>
                    </div>
                ) : (
                    <div className="flex h-full flex-col">
                        {/* Header */}
                        <div className="border-b border-gray-200 bg-white px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">{currentAnalysis.title}</h1>
                                    <p className="text-sm text-gray-500">
                                        {currentAnalysis.options.length} options, {currentAnalysis.criteria.length} criteria
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCalculate}
                                        disabled={calculating || currentAnalysis.options.length === 0 || currentAnalysis.criteria.length === 0}
                                        className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-50"
                                    >
                                        {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                                        Calculate
                                    </button>
                                    <button
                                        onClick={handleGenerateAI}
                                        disabled={generatingAI || Object.keys(currentAnalysis.results).length === 0}
                                        className="flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600 disabled:opacity-50"
                                    >
                                        {generatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                        AI Recommend
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-gray-200 bg-gray-50 px-6">
                            <div className="flex gap-4">
                                {[
                                    { id: 'matrix', label: 'Matrix', icon: Grid3X3 },
                                    { id: 'weights', label: 'Weights', icon: Scale },
                                    { id: 'results', label: 'Results', icon: BarChart3 },
                                    { id: 'ai', label: 'AI', icon: Sparkles },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                                            activeTab === tab.id
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <tab.icon className="h-4 w-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Matrix Tab */}
                            {activeTab === 'matrix' && (
                                <div>
                                    <div className="mb-4 flex items-center gap-2">
                                        <button
                                            onClick={() => setShowAddOptionModal(true)}
                                            className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Option
                                        </button>
                                        <button
                                            onClick={() => setShowAddCriterionModal(true)}
                                            className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-sm text-green-600 hover:bg-green-100"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Criterion
                                        </button>
                                    </div>

                                    {currentAnalysis.options.length === 0 || currentAnalysis.criteria.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
                                            <p className="text-gray-500">Add options and criteria to build your decision matrix</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left font-medium text-gray-700">Option</th>
                                                        {currentAnalysis.criteria.map(c => (
                                                            <th key={c.id} className="px-4 py-3 text-center font-medium text-gray-700">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    {c.name}
                                                                    <span className="text-xs text-gray-400">
                                                                        ({c.type === 'benefit' ? '+' : '-'})
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleRemoveCriterion(c.id)}
                                                                        className="ml-1 rounded p-0.5 hover:bg-gray-200"
                                                                    >
                                                                        <X className="h-3 w-3 text-gray-400" />
                                                                    </button>
                                                                </div>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentAnalysis.options.map(option => (
                                                        <tr key={option.id} className="border-t border-gray-100">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-gray-900">{option.name}</span>
                                                                    <button
                                                                        onClick={() => handleRemoveOption(option.id)}
                                                                        className="rounded p-0.5 hover:bg-gray-200"
                                                                    >
                                                                        <X className="h-3 w-3 text-gray-400" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                            {currentAnalysis.criteria.map(c => (
                                                                <td key={c.id} className="px-4 py-3 text-center">
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max="10"
                                                                        value={currentAnalysis.scores[option.id]?.[c.id] || ''}
                                                                        onChange={(e) => handleScoreChange(option.id, c.id, parseInt(e.target.value) || 0)}
                                                                        className="w-16 rounded border border-gray-200 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none"
                                                                        placeholder="1-10"
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Weights Tab */}
                            {activeTab === 'weights' && (
                                <div className="space-y-4">
                                    {currentAnalysis.criteria.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
                                            <p className="text-gray-500">Add criteria first</p>
                                        </div>
                                    ) : (
                                        currentAnalysis.criteria.map(c => (
                                            <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span className="font-medium text-gray-900">{c.name}</span>
                                                    <span className="text-sm text-gray-500">
                                                        {((currentAnalysis.weights[c.id] || 0) * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={(currentAnalysis.weights[c.id] || 0) * 100}
                                                    onChange={(e) => handleWeightChange(c.id, parseInt(e.target.value) / 100)}
                                                    className="w-full"
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Results Tab */}
                            {activeTab === 'results' && (
                                <div>
                                    {Object.keys(currentAnalysis.results).length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
                                            <p className="text-gray-500">Click Calculate to see results</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-gray-700">Ranking</h3>
                                            {currentAnalysis.ranking.map((optionId, index) => {
                                                const score = currentAnalysis.results[optionId] || 0;
                                                const maxScore = Math.max(...Object.values(currentAnalysis.results));
                                                const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

                                                return (
                                                    <div key={optionId} className="rounded-lg border border-gray-200 bg-white p-4">
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                                                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                                    index === 1 ? 'bg-gray-100 text-gray-600' :
                                                                    index === 2 ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-gray-50 text-gray-500'
                                                                }`}>
                                                                    {index + 1}
                                                                </span>
                                                                <span className="font-medium text-gray-900">{getOptionName(optionId)}</span>
                                                            </div>
                                                            <span className="text-sm font-semibold text-blue-600">{score.toFixed(2)}</span>
                                                        </div>
                                                        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                                                            <div
                                                                className={`h-full rounded-full ${
                                                                    index === 0 ? 'bg-blue-500' : 'bg-blue-300'
                                                                }`}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AI Tab */}
                            {activeTab === 'ai' && (
                                <div>
                                    {!aiRecommendation && !generatingAI ? (
                                        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
                                            <Sparkles className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                                            <p className="text-gray-500">Click AI Recommend to get analysis</p>
                                            <p className="text-sm text-gray-400">Make sure to calculate results first</p>
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm max-w-none rounded-lg border border-gray-200 bg-white p-6">
                                            <div className="whitespace-pre-wrap">{aiRecommendation}</div>
                                            {generatingAI && (
                                                <span className="inline-block h-4 w-2 animate-pulse bg-blue-500" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreateModal && (
                <CreateModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} />
            )}
            {showAddOptionModal && (
                <AddItemModal type="option" onClose={() => setShowAddOptionModal(false)} onAdd={handleAddOption} />
            )}
            {showAddCriterionModal && (
                <AddItemModal type="criterion" onClose={() => setShowAddCriterionModal(false)} onAdd={handleAddCriterion} />
            )}
        </div>
    );
}
