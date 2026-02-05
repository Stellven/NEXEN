/**
 * Shared model configuration for all NEXEN modules.
 *
 * This file provides a unified model list that can be used across all AI modules
 * (AI Ask, AI Teams, AI Research, etc.) to ensure consistency.
 */

// =============================================================================
// Types
// =============================================================================

export interface ModelOption {
    id: string;
    name: string;
    isNew?: boolean;
    isPro?: boolean;
}

export interface ProviderGroup {
    id: string;
    name: string;
    icon: string;
    models: ModelOption[];
}

// =============================================================================
// Provider Groups (for dropdown with provider icons)
// =============================================================================

export const MODEL_PROVIDERS: ProviderGroup[] = [
    {
        id: "openai",
        name: "OpenAI",
        icon: "🟢",
        models: [
            { id: "openai/gpt-5", name: "GPT-5", isNew: true },
            { id: "openai/gpt-4.1", name: "GPT-4.1" },
            { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini" },
            { id: "openai/o3", name: "o3", isPro: true },
            { id: "openai/o4-mini", name: "o4 Mini" },
            { id: "openai/gpt-4o", name: "GPT-4o" },
            { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
        ],
    },
    {
        id: "anthropic",
        name: "Anthropic",
        icon: "🟠",
        models: [
            {
                id: "anthropic/claude-opus-4-5-20251124",
                name: "Claude Opus 4.5",
                isNew: true,
                isPro: true,
            },
            {
                id: "anthropic/claude-sonnet-4-5-20250929",
                name: "Claude Sonnet 4.5",
            },
            {
                id: "anthropic/claude-haiku-4-5-20251001",
                name: "Claude Haiku 4.5",
            },
            {
                id: "anthropic/claude-opus-4-20250514",
                name: "Claude Opus 4",
                isPro: true,
            },
            {
                id: "anthropic/claude-sonnet-4-20250514",
                name: "Claude Sonnet 4",
            },
        ],
    },
    {
        id: "google",
        name: "Google",
        icon: "🔵",
        models: [
            {
                id: "google/gemini-1.5-flash",
                name: "Gemini 1.5 Flash",
                isNew: false,
            },
            {
                id: "google/gemini-3-pro-preview",
                name: "Gemini 3 Pro",
                isPro: true,
            },
            { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash" },
            { id: "google/gemini-2.0-pro", name: "Gemini 2.0 Pro" },
        ],
    },
    {
        id: "deepseek",
        name: "DeepSeek",
        icon: "🟣",
        models: [
            { id: "deepseek/deepseek-chat", name: "DeepSeek Chat" },
            {
                id: "deepseek/deepseek-reasoner",
                name: "DeepSeek Reasoner",
                isNew: true,
            },
            { id: "deepseek/deepseek-coder", name: "DeepSeek Coder" },
        ],
    },
    {
        id: "qwen",
        name: "通义千问",
        icon: "🔴",
        models: [
            { id: "qwen/qwen-max", name: "Qwen Max", isPro: true },
            { id: "qwen/qwen-plus", name: "Qwen Plus" },
            { id: "qwen/qwen-turbo", name: "Qwen Turbo" },
            { id: "qwen/qwen-long", name: "Qwen Long" },
        ],
    },
    {
        id: "local",
        name: "Local",
        icon: "🏠",
        models: [{ id: "local/openai/v1", name: "Local (LM Studio/Ollama)" }],
    },
];

// =============================================================================
// Flat Model Options (for simple dropdowns)
// =============================================================================

export interface FlatModelOption {
    value: string;
    label: string;
    provider: string;
    isNew?: boolean;
    isPro?: boolean;
}

export const MODEL_OPTIONS: FlatModelOption[] = MODEL_PROVIDERS.flatMap(
    (provider) =>
        provider.models.map((model) => ({
            value: model.id,
            label: model.name,
            provider: provider.name,
            isNew: model.isNew,
            isPro: model.isPro,
        })),
);

// =============================================================================
// Default Model
// =============================================================================

export const DEFAULT_MODEL = "google/gemini-2.0-flash";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get provider icon by model ID
 */
export function getProviderIcon(modelId: string): string {
    const providerId = modelId.split("/")[0];
    const provider = MODEL_PROVIDERS.find((p) => p.id === providerId);
    return provider?.icon || "🤖";
}

/**
 * Get provider name by model ID
 */
export function getProviderName(modelId: string): string {
    const providerId = modelId.split("/")[0];
    const provider = MODEL_PROVIDERS.find((p) => p.id === providerId);
    return provider?.name || "Unknown";
}

/**
 * Get model name by model ID
 */
export function getModelName(modelId: string): string {
    for (const provider of MODEL_PROVIDERS) {
        const model = provider.models.find((m) => m.id === modelId);
        if (model) return model.name;
    }
    return modelId;
}

/**
 * Get all models for a specific provider
 */
export function getProviderModels(providerId: string): ModelOption[] {
    const provider = MODEL_PROVIDERS.find((p) => p.id === providerId);
    return provider?.models || [];
}

/**
 * Check if a model requires a specific API key
 */
export function getRequiredApiKey(modelId: string): string {
    const providerId = modelId.split("/")[0];
    switch (providerId) {
        case "openai":
            return "openai";
        case "anthropic":
            return "anthropic";
        case "google":
            return "google";
        case "deepseek":
            return "deepseek";
        case "qwen":
            return "dashscope";
        case "local":
            return "local";
        default:
            return "openai";
    }
}
