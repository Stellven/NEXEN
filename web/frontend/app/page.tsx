'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ResearchPanel } from '@/components/research/ResearchPanel';
import { AgentPanel } from '@/components/agents/AgentPanel';
import { OutputPanel } from '@/components/research/OutputPanel';

export default function Home() {
    const [activeTab, setActiveTab] = useState<'research' | 'agents' | 'knowledge'>('research');

    return (
        <div className="flex h-screen flex-col">
            <Header />

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

                {/* Main Content */}
                <main className="flex flex-1 overflow-hidden">
                    {activeTab === 'research' && (
                        <>
                            {/* Left: Agent Execution Flow */}
                            <div className="w-80 border-r border-dark-border overflow-y-auto">
                                <AgentPanel />
                            </div>

                            {/* Center: Research Output */}
                            <div className="flex-1 overflow-hidden">
                                <ResearchPanel />
                            </div>

                            {/* Right: Output Details */}
                            <div className="w-96 border-l border-dark-border overflow-y-auto">
                                <OutputPanel />
                            </div>
                        </>
                    )}

                    {activeTab === 'agents' && (
                        <div className="flex-1 p-6 overflow-y-auto">
                            <AgentGridView />
                        </div>
                    )}

                    {activeTab === 'knowledge' && (
                        <div className="flex-1 p-6 overflow-y-auto">
                            <KnowledgeBrowser />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

// Placeholder components
function AgentGridView() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="glass p-4 rounded-lg">
                <h3 className="text-lg font-semibold">Agent Grid View</h3>
                <p className="text-dark-muted">Coming soon...</p>
            </div>
        </div>
    );
}

function KnowledgeBrowser() {
    return (
        <div className="glass p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Knowledge Browser</h3>
            <p className="text-dark-muted">Coming soon...</p>
        </div>
    );
}
