'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentWorkflow, WorkflowNode, WorkflowEdge } from './api';

interface Position {
    x: number;
    y: number;
}

interface WorkflowState {
    // Current workflow
    currentWorkflow: AgentWorkflow | null;
    isDirty: boolean;

    // Editing state
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    isConnecting: boolean;
    connectionSource: string | null;

    // Canvas state
    zoom: number;
    panOffset: Position;
    isLocked: boolean;

    // Actions
    loadWorkflow: (workflow: AgentWorkflow) => void;
    setWorkflow: (workflow: AgentWorkflow) => void;
    clearWorkflow: () => void;

    // Node operations
    addNode: (node: WorkflowNode) => void;
    updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
    updateNodePosition: (nodeId: string, position: Position) => void;
    removeNode: (nodeId: string) => void;
    selectNode: (nodeId: string | null) => void;

    // Edge operations
    startConnection: (sourceNodeId: string) => void;
    cancelConnection: () => void;
    completeConnection: (targetNodeId: string, config?: WorkflowEdge['config']) => void;
    updateEdge: (edgeId: string, config: WorkflowEdge['config']) => void;
    removeEdge: (edgeId: string) => void;
    selectEdge: (edgeId: string | null) => void;

    // Canvas operations
    setZoom: (zoom: number) => void;
    setPanOffset: (offset: Position) => void;
    setLocked: (locked: boolean) => void;

    // Dirty state
    setDirty: (dirty: boolean) => void;
}

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useWorkflowStore = create<WorkflowState>()(
    persist(
        (set, get) => ({
            // Initial state
            currentWorkflow: null,
            isDirty: false,
            selectedNodeId: null,
            selectedEdgeId: null,
            isConnecting: false,
            connectionSource: null,
            zoom: 1,
            panOffset: { x: 0, y: 0 },
            isLocked: false,

            // Load workflow
            loadWorkflow: (workflow) => {
                set({
                    currentWorkflow: workflow,
                    isDirty: false,
                    selectedNodeId: null,
                    selectedEdgeId: null,
                    isConnecting: false,
                    connectionSource: null,
                });
            },

            setWorkflow: (workflow) => {
                set({ currentWorkflow: workflow, isDirty: true });
            },

            clearWorkflow: () => {
                set({
                    currentWorkflow: null,
                    isDirty: false,
                    selectedNodeId: null,
                    selectedEdgeId: null,
                    isConnecting: false,
                    connectionSource: null,
                });
            },

            // Node operations
            addNode: (node) => {
                const { currentWorkflow } = get();
                if (!currentWorkflow) return;

                const newNode: WorkflowNode = {
                    ...node,
                    id: node.id || generateId(),
                };

                set({
                    currentWorkflow: {
                        ...currentWorkflow,
                        nodes: [...currentWorkflow.nodes, newNode],
                    },
                    isDirty: true,
                });
            },

            updateNode: (nodeId, updates) => {
                const { currentWorkflow } = get();
                if (!currentWorkflow) return;

                set({
                    currentWorkflow: {
                        ...currentWorkflow,
                        nodes: currentWorkflow.nodes.map((n) =>
                            n.id === nodeId ? { ...n, ...updates } : n
                        ),
                    },
                    isDirty: true,
                });
            },

            updateNodePosition: (nodeId, position) => {
                const { currentWorkflow } = get();
                if (!currentWorkflow) return;

                set({
                    currentWorkflow: {
                        ...currentWorkflow,
                        nodes: currentWorkflow.nodes.map((n) =>
                            n.id === nodeId ? { ...n, position } : n
                        ),
                    },
                    isDirty: true,
                });
            },

            removeNode: (nodeId) => {
                const { currentWorkflow } = get();
                if (!currentWorkflow) return;

                set({
                    currentWorkflow: {
                        ...currentWorkflow,
                        nodes: currentWorkflow.nodes.filter((n) => n.id !== nodeId),
                        edges: currentWorkflow.edges.filter(
                            (e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
                        ),
                    },
                    isDirty: true,
                    selectedNodeId: null,
                });
            },

            selectNode: (nodeId) => {
                set({ selectedNodeId: nodeId, selectedEdgeId: null });
            },

            // Edge operations
            startConnection: (sourceNodeId) => {
                set({ isConnecting: true, connectionSource: sourceNodeId });
            },

            cancelConnection: () => {
                set({ isConnecting: false, connectionSource: null });
            },

            completeConnection: (targetNodeId, config) => {
                const { currentWorkflow, connectionSource } = get();
                if (!currentWorkflow || !connectionSource) return;

                // Prevent self-connection
                if (connectionSource === targetNodeId) {
                    set({ isConnecting: false, connectionSource: null });
                    return;
                }

                // Check if edge already exists
                const existingEdge = currentWorkflow.edges.find(
                    (e) => e.sourceNodeId === connectionSource && e.targetNodeId === targetNodeId
                );

                if (existingEdge) {
                    set({ isConnecting: false, connectionSource: null });
                    return;
                }

                const newEdge: WorkflowEdge = {
                    id: generateId(),
                    sourceNodeId: connectionSource,
                    targetNodeId,
                    edgeType: 'data_flow',
                    config: config || {
                        dataFormat: 'auto',
                        transform: { mode: 'pass' },
                        priority: 5,
                        blocking: true,
                        timeout: 300,
                    },
                };

                set({
                    currentWorkflow: {
                        ...currentWorkflow,
                        edges: [...currentWorkflow.edges, newEdge],
                    },
                    isDirty: true,
                    isConnecting: false,
                    connectionSource: null,
                });
            },

            updateEdge: (edgeId, config) => {
                const { currentWorkflow } = get();
                if (!currentWorkflow) return;

                set({
                    currentWorkflow: {
                        ...currentWorkflow,
                        edges: currentWorkflow.edges.map((e) =>
                            e.id === edgeId ? { ...e, config } : e
                        ),
                    },
                    isDirty: true,
                });
            },

            removeEdge: (edgeId) => {
                const { currentWorkflow } = get();
                if (!currentWorkflow) return;

                set({
                    currentWorkflow: {
                        ...currentWorkflow,
                        edges: currentWorkflow.edges.filter((e) => e.id !== edgeId),
                    },
                    isDirty: true,
                    selectedEdgeId: null,
                });
            },

            selectEdge: (edgeId) => {
                set({ selectedEdgeId: edgeId, selectedNodeId: null });
            },

            // Canvas operations
            setZoom: (zoom) => {
                set({ zoom: Math.max(0.25, Math.min(2, zoom)) });
            },

            setPanOffset: (offset) => {
                set({ panOffset: offset });
            },

            setLocked: (locked) => {
                set({ isLocked: locked });
            },

            // Dirty state
            setDirty: (dirty) => {
                set({ isDirty: dirty });
            },
        }),
        {
            name: 'nexen-workflow-store',
            partialize: (state) => ({
                zoom: state.zoom,
                panOffset: state.panOffset,
            }),
        }
    )
);

// Helper function to validate DAG (detect cycles)
export function validateDAG(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
    const graph: Map<string, string[]> = new Map();
    const inDegree: Map<string, number> = new Map();

    // Initialize
    nodes.forEach((n) => {
        graph.set(n.id, []);
        inDegree.set(n.id, 0);
    });

    // Build graph
    edges.forEach((e) => {
        const sourceEdges = graph.get(e.sourceNodeId);
        if (sourceEdges) {
            sourceEdges.push(e.targetNodeId);
        }
        inDegree.set(e.targetNodeId, (inDegree.get(e.targetNodeId) || 0) + 1);
    });

    // Kahn's algorithm
    const queue: string[] = [];
    inDegree.forEach((deg, nodeId) => {
        if (deg === 0) queue.push(nodeId);
    });

    let visited = 0;
    while (queue.length > 0) {
        const node = queue.shift()!;
        visited++;
        const neighbors = graph.get(node) || [];
        for (const neighbor of neighbors) {
            const newDegree = (inDegree.get(neighbor) || 0) - 1;
            inDegree.set(neighbor, newDegree);
            if (newDegree === 0) {
                queue.push(neighbor);
            }
        }
    }

    return visited === nodes.length;
}
