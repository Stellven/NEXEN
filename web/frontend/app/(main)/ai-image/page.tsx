'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Image as ImageIcon,
    Wand2,
    Upload,
    Download,
    Sparkles,
    Eye,
    Trash2,
    Loader2,
    X,
    ChevronDown,
    AlertCircle,
} from 'lucide-react';
import { imageApi, ImageGeneration, ImageModel } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

type ActiveTab = 'generate' | 'analyze';

interface GenerationParams {
    model: string;
    size: string;
    style: string;
    quality: string;
}

// =============================================================================
// Constants
// =============================================================================

const SIZE_OPTIONS = [
    { value: '1024x1024', label: '1024 x 1024 (方形)' },
    { value: '1024x1792', label: '1024 x 1792 (竖向)' },
    { value: '1792x1024', label: '1792 x 1024 (横向)' },
];

const STYLE_OPTIONS = [
    { value: 'vivid', label: '生动' },
    { value: 'natural', label: '自然' },
];

const QUALITY_OPTIONS = [
    { value: 'standard', label: '标准' },
    { value: 'hd', label: '高清' },
];

const DEFAULT_ANALYSIS_PROMPTS = [
    '请详细描述这张图片的内容',
    '分析这张图片中的主要元素和构图',
    '识别图片中的文字内容',
    '这张图片表达了什么情感或主题？',
];

// =============================================================================
// Component
// =============================================================================

export default function AIImagePage() {
    // Tab state
    const [activeTab, setActiveTab] = useState<ActiveTab>('generate');

    // Generation state
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<ImageGeneration[]>([]);
    const [params, setParams] = useState<GenerationParams>({
        model: 'dall-e-3',
        size: '1024x1024',
        style: 'vivid',
        quality: 'standard',
    });

    // Analysis state
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [analysisPrompt, setAnalysisPrompt] = useState(DEFAULT_ANALYSIS_PROMPTS[0]);
    const [analysisModel, setAnalysisModel] = useState('gpt-4o');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');

    // Models state
    const [generationModels, setGenerationModels] = useState<ImageModel[]>([]);
    const [analysisModels, setAnalysisModels] = useState<ImageModel[]>([]);

    // UI state
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // =============================================================================
    // Data Fetching
    // =============================================================================

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [modelsRes, generationsRes] = await Promise.all([
                    imageApi.getModels(),
                    imageApi.getGenerations(0, 50),
                ]);
                setGenerationModels(modelsRes.generation_models);
                setAnalysisModels(modelsRes.analysis_models);
                setGeneratedImages(generationsRes.generations);
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // =============================================================================
    // Handlers
    // =============================================================================

    const handleGenerate = async () => {
        if (!prompt.trim() || isGenerating) return;
        setIsGenerating(true);
        setError(null);

        try {
            const result = await imageApi.generate(prompt, {
                model: params.model,
                size: params.size,
                style: params.style,
                quality: params.quality,
            });

            setGeneratedImages([result, ...generatedImages]);
            setPrompt('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await imageApi.deleteGeneration(id);
            setGeneratedImages(generatedImages.filter((img) => img.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
        }
    };

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setUploadedImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
            setAnalysisResult('');
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setUploadedFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setUploadedImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
            setAnalysisResult('');
        }
    }, []);

    const handleAnalyze = async () => {
        if (!uploadedFile || isAnalyzing) return;
        setIsAnalyzing(true);
        setAnalysisResult('');
        setError(null);

        try {
            await imageApi.analyzeUploadedImage(
                uploadedFile,
                analysisPrompt,
                analysisModel,
                (content) => setAnalysisResult((prev) => prev + content),
                () => setIsAnalyzing(false),
                (error) => {
                    setError(error);
                    setIsAnalyzing(false);
                }
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Analysis failed');
            setIsAnalyzing(false);
        }
    };

    const handleDownload = (imageUrl: string, prompt: string) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `${prompt.slice(0, 30)}.png`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // =============================================================================
    // Render
    // =============================================================================

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">AI Image</h1>
                        <p className="text-sm text-gray-500">生成和分析图像</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('generate')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'generate'
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Wand2 className="h-4 w-4" />
                            生成图像
                        </button>
                        <button
                            onClick={() => setActiveTab('analyze')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'analyze'
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Eye className="h-4 w-4" />
                            图像分析
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'generate' ? (
                    <div className="mx-auto max-w-4xl">
                        {/* Generation Input */}
                        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
                            <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                                <Sparkles className="h-5 w-5 text-purple-500" />
                                描述您想要生成的图像
                            </h2>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="例如：一只可爱的机器猫在樱花树下看书，日系插画风格，柔和的粉色和蓝色色调..."
                                className="mb-4 h-32 w-full resize-none rounded-lg border border-gray-200 p-4 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                            />

                            {/* Parameters */}
                            <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                                {/* Size */}
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-500">
                                        尺寸
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={params.size}
                                            onChange={(e) =>
                                                setParams({ ...params, size: e.target.value })
                                            }
                                            className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm outline-none focus:border-blue-300"
                                        >
                                            {SIZE_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    </div>
                                </div>

                                {/* Style */}
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-500">
                                        风格
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={params.style}
                                            onChange={(e) =>
                                                setParams({ ...params, style: e.target.value })
                                            }
                                            className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm outline-none focus:border-blue-300"
                                        >
                                            {STYLE_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    </div>
                                </div>

                                {/* Quality */}
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-500">
                                        质量
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={params.quality}
                                            onChange={(e) =>
                                                setParams({ ...params, quality: e.target.value })
                                            }
                                            className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm outline-none focus:border-blue-300"
                                        >
                                            {QUALITY_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    </div>
                                </div>

                                {/* Model */}
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-500">
                                        模型
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={params.model}
                                            onChange={(e) =>
                                                setParams({ ...params, model: e.target.value })
                                            }
                                            className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm outline-none focus:border-blue-300"
                                        >
                                            {generationModels.map((model) => (
                                                <option key={model.id} value={model.id}>
                                                    {model.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleGenerate}
                                    disabled={!prompt.trim() || isGenerating}
                                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-300"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            生成中...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="h-4 w-4" />
                                            生成图像
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Generation History */}
                        <div>
                            <h2 className="mb-4 font-semibold text-gray-900">生成历史</h2>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            ) : generatedImages.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                                    {generatedImages.map((img) => (
                                        <div
                                            key={img.id}
                                            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white"
                                        >
                                            {img.status === 'completed' && img.image_url ? (
                                                <img
                                                    src={img.image_url}
                                                    alt={img.prompt}
                                                    className="aspect-square w-full object-cover"
                                                />
                                            ) : img.status === 'generating' ? (
                                                <div className="flex aspect-square w-full items-center justify-center bg-gray-100">
                                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                                </div>
                                            ) : (
                                                <div className="flex aspect-square w-full flex-col items-center justify-center bg-red-50 p-4">
                                                    <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
                                                    <p className="text-center text-xs text-red-600">
                                                        {img.error_message || 'Generation failed'}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                                                <div className="w-full p-4">
                                                    <p className="mb-2 line-clamp-2 text-sm text-white">
                                                        {img.prompt}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        {img.image_url && (
                                                            <button
                                                                onClick={() =>
                                                                    handleDownload(
                                                                        img.image_url!,
                                                                        img.prompt
                                                                    )
                                                                }
                                                                className="flex items-center gap-1 rounded bg-white/20 px-2 py-1 text-xs text-white hover:bg-white/30"
                                                            >
                                                                <Download className="h-3 w-3" />
                                                                下载
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(img.id)}
                                                            className="flex items-center gap-1 rounded bg-red-500/50 px-2 py-1 text-xs text-white hover:bg-red-500/70"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                            删除
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
                                    <ImageIcon className="mb-4 h-12 w-12 text-gray-300" />
                                    <p className="text-gray-500">还没有生成的图像</p>
                                    <p className="text-sm text-gray-400">输入描述开始创作</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Analysis Tab */
                    <div className="mx-auto max-w-5xl">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Upload Area */}
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                                    <Eye className="h-5 w-5 text-blue-500" />
                                    上传图像进行分析
                                </h2>

                                {uploadedImage ? (
                                    <div className="relative mb-4">
                                        <img
                                            src={uploadedImage}
                                            alt="Uploaded"
                                            className="w-full rounded-lg"
                                        />
                                        <button
                                            onClick={() => {
                                                setUploadedImage(null);
                                                setUploadedFile(null);
                                                setAnalysisResult('');
                                            }}
                                            className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={(e) => e.preventDefault()}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-16 transition-colors hover:border-blue-400 hover:bg-blue-50/50"
                                    >
                                        <Upload className="mb-4 h-12 w-12 text-gray-400" />
                                        <p className="mb-2 text-gray-600">拖拽图像到此处或点击上传</p>
                                        <p className="text-sm text-gray-400">
                                            支持 PNG, JPG, WEBP 格式
                                        </p>
                                    </div>
                                )}

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {/* Analysis Prompt */}
                                <div className="mb-4">
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        分析提示
                                    </label>
                                    <textarea
                                        value={analysisPrompt}
                                        onChange={(e) => setAnalysisPrompt(e.target.value)}
                                        placeholder="描述您想要分析的内容..."
                                        className="h-20 w-full resize-none rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    />
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {DEFAULT_ANALYSIS_PROMPTS.map((p, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setAnalysisPrompt(p)}
                                                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                                                    analysisPrompt === p
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {p.length > 15 ? p.slice(0, 15) + '...' : p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Model Selection */}
                                <div className="mb-4">
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        分析模型
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={analysisModel}
                                            onChange={(e) => setAnalysisModel(e.target.value)}
                                            className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm outline-none focus:border-blue-300"
                                        >
                                            {analysisModels.map((model) => (
                                                <option key={model.id} value={model.id}>
                                                    {model.name} ({model.provider})
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    </div>
                                </div>

                                <button
                                    onClick={handleAnalyze}
                                    disabled={!uploadedFile || isAnalyzing}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:bg-gray-300"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            分析中...
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="h-4 w-4" />
                                            开始分析
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Analysis Result */}
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                                    <Sparkles className="h-5 w-5 text-purple-500" />
                                    分析结果
                                </h2>
                                <div className="h-[400px] overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-4">
                                    {analysisResult ? (
                                        <div className="whitespace-pre-wrap text-sm text-gray-700">
                                            {analysisResult}
                                            {isAnalyzing && (
                                                <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-blue-500" />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex h-full flex-col items-center justify-center text-center">
                                            <Eye className="mb-4 h-12 w-12 text-gray-300" />
                                            <p className="text-gray-500">上传图片后开始分析</p>
                                            <p className="text-sm text-gray-400">
                                                支持 GPT-4 Vision 和 Claude Vision
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
