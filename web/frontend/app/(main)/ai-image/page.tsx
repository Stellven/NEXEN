'use client';

import { useState } from 'react';
import { Image as ImageIcon, Wand2, Upload, Download, Sparkles, Eye } from 'lucide-react';

interface GeneratedImage {
    id: string;
    prompt: string;
    url: string;
    createdAt: Date;
}

export default function AIImagePage() {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [activeTab, setActiveTab] = useState<'generate' | 'analyze'>('generate');

    const handleGenerate = async () => {
        if (!prompt.trim() || isGenerating) return;
        setIsGenerating(true);

        // TODO: 实现 DALL-E API 调用
        setTimeout(() => {
            setGeneratedImages([
                {
                    id: Date.now().toString(),
                    prompt,
                    url: `https://placehold.co/512x512/6366f1/white?text=AI+Generated`,
                    createdAt: new Date(),
                },
                ...generatedImages,
            ]);
            setIsGenerating(false);
            setPrompt('');
        }, 2000);
    };

    return (
        <div className="flex h-full flex-col">
            {/* 头部 */}
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

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'generate' ? (
                    <div className="mx-auto max-w-4xl">
                        {/* 生成输入 */}
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
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span>尺寸: 1024x1024</span>
                                    <span>模型: DALL-E 3</span>
                                </div>
                                <button
                                    onClick={handleGenerate}
                                    disabled={!prompt.trim() || isGenerating}
                                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-300"
                                >
                                    {isGenerating ? (
                                        <>
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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

                        {/* 生成历史 */}
                        <div>
                            <h2 className="mb-4 font-semibold text-gray-900">生成历史</h2>
                            {generatedImages.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                                    {generatedImages.map((img) => (
                                        <div
                                            key={img.id}
                                            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white"
                                        >
                                            <img
                                                src={img.url}
                                                alt={img.prompt}
                                                className="aspect-square w-full object-cover"
                                            />
                                            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                                                <div className="w-full p-4">
                                                    <p className="mb-2 line-clamp-2 text-sm text-white">
                                                        {img.prompt}
                                                    </p>
                                                    <button className="flex items-center gap-1 text-xs text-white/80 hover:text-white">
                                                        <Download className="h-3 w-3" />
                                                        下载
                                                    </button>
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
                    <div className="mx-auto max-w-4xl">
                        {/* 图像分析 */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                                <Eye className="h-5 w-5 text-blue-500" />
                                上传图像进行分析
                            </h2>
                            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-16 transition-colors hover:border-blue-400">
                                <Upload className="mb-4 h-12 w-12 text-gray-400" />
                                <p className="mb-2 text-gray-600">拖拽图像到此处或点击上传</p>
                                <p className="text-sm text-gray-400">支持 PNG, JPG, WEBP 格式</p>
                                <button className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">
                                    选择图像
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
