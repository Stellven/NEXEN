'use client';

import { Brain, Sparkles, Settings, HelpCircle } from 'lucide-react';

export function Header() {
    return (
        <header className="h-14 border-b border-dark-border bg-dark-card flex items-center justify-between px-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-nexen-500 to-purple-600 rounded-lg">
                    <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold gradient-text">NEXEN</h1>
                </div>
                <span className="text-xs text-dark-muted bg-dark-bg px-2 py-0.5 rounded-full">
                    v0.1.0
                </span>
            </div>

            {/* Center - Session Info */}
            <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-nexen-400" />
                <span className="text-dark-muted">当前会话:</span>
                <span className="text-white font-medium">Transformer 架构研究</span>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-dark-bg rounded-lg transition-colors">
                    <HelpCircle className="w-5 h-5 text-dark-muted hover:text-white" />
                </button>
                <button className="p-2 hover:bg-dark-bg rounded-lg transition-colors">
                    <Settings className="w-5 h-5 text-dark-muted hover:text-white" />
                </button>
            </div>
        </header>
    );
}
