/**
 * Store for Agent Graph layout persistence and execution state.
 *
 * Handles:
 * - Node positions (draggable layout)
 * - Execution DAG (task dependencies)
 * - File operations (read/write status)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// =============================================================================
// Types
// =============================================================================

export interface NodePosition {
    x: number;
    y: number;
}

export interface ExecutionEdge {
    id: string;
    from: string;      // source agent id
    to: string;        // target agent id
    label?: string;    // e.g., "findings", "raw_data"
    type: 'task_dep' | 'data_flow';  // task dependency or data flow
}

export interface FileOperation {
    id: string;
    agentId: string;
    type: 'read' | 'write';
    path: string;
    timestamp: number;
    status: 'pending' | 'active' | 'completed';
}

export interface TaskNode {
    id: string;
    agentId: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    dependencies: string[];  // task ids this depends on
    outputFiles: string[];
}

export interface ExecutionPlan {
    id: string;
    sessionId: string;
    tasks: TaskNode[];
    createdAt: number;
}

interface AgentGraphState {
    // Layout
    nodePositions: Record<string, NodePosition>;
    isLayoutLocked: boolean;

    // Execution
    currentPlan: ExecutionPlan | null;
    executionEdges: ExecutionEdge[];

    // File operations
    fileOperations: FileOperation[];

    // Actions - Layout
    setNodePosition: (agentId: string, position: NodePosition) => void;
    setMultiplePositions: (positions: Record<string, NodePosition>) => void;
    resetLayout: () => void;
    toggleLayoutLock: () => void;

    // Actions - Execution
    setExecutionPlan: (plan: ExecutionPlan | null) => void;
    updateTaskStatus: (taskId: string, status: TaskNode['status']) => void;
    clearExecution: () => void;

    // Actions - File Operations
    addFileOperation: (op: Omit<FileOperation, 'id' | 'timestamp'>) => void;
    updateFileOperation: (id: string, status: FileOperation['status']) => void;
    clearFileOperations: () => void;
}

// =============================================================================
// Default Layout
// =============================================================================

// Default positions for agents in a reasonable layout
const DEFAULT_POSITIONS: Record<string, NodePosition> = {
    // Coordinator (top center)
    meta_coordinator: { x: 400, y: 40 },

    // Strategic layer (spread across middle)
    logician: { x: 120, y: 180 },
    critic: { x: 240, y: 180 },
    connector: { x: 360, y: 180 },
    explorer: { x: 480, y: 180 },
    builder: { x: 600, y: 180 },

    // Executor layer (grouped under parents)
    genealogist: { x: 80, y: 320 },
    historian: { x: 160, y: 320 },
    scribe: { x: 240, y: 320 },
    social_scout: { x: 400, y: 320 },
    cn_specialist: { x: 480, y: 320 },
    vision_analyst: { x: 560, y: 320 },
    archivist: { x: 640, y: 320 },
    prompt_engineer: { x: 720, y: 320 },

    // Storage node (center)
    __storage__: { x: 400, y: 420 },
};

// =============================================================================
// Store
// =============================================================================

export const useAgentGraphStore = create<AgentGraphState>()(
    persist(
        (set, get) => ({
            // Initial state
            nodePositions: { ...DEFAULT_POSITIONS },
            isLayoutLocked: false,
            currentPlan: null,
            executionEdges: [],
            fileOperations: [],

            // Layout actions
            setNodePosition: (agentId, position) => {
                set((state) => ({
                    nodePositions: {
                        ...state.nodePositions,
                        [agentId]: position,
                    },
                }));
            },

            setMultiplePositions: (positions) => {
                set((state) => ({
                    nodePositions: {
                        ...state.nodePositions,
                        ...positions,
                    },
                }));
            },

            resetLayout: () => {
                set({ nodePositions: { ...DEFAULT_POSITIONS } });
            },

            toggleLayoutLock: () => {
                set((state) => ({ isLayoutLocked: !state.isLayoutLocked }));
            },

            // Execution actions
            setExecutionPlan: (plan) => {
                if (!plan) {
                    set({ currentPlan: null, executionEdges: [] });
                    return;
                }

                // Generate edges from task dependencies
                const edges: ExecutionEdge[] = [];
                const taskMap = new Map(plan.tasks.map(t => [t.id, t]));

                plan.tasks.forEach(task => {
                    task.dependencies.forEach(depId => {
                        const depTask = taskMap.get(depId);
                        if (depTask) {
                            edges.push({
                                id: `${depTask.agentId}-${task.agentId}`,
                                from: depTask.agentId,
                                to: task.agentId,
                                type: 'task_dep',
                            });
                        }
                    });
                });

                set({ currentPlan: plan, executionEdges: edges });
            },

            updateTaskStatus: (taskId, status) => {
                const plan = get().currentPlan;
                if (!plan) return;

                const updatedTasks = plan.tasks.map(t =>
                    t.id === taskId ? { ...t, status } : t
                );

                set({
                    currentPlan: { ...plan, tasks: updatedTasks },
                });
            },

            clearExecution: () => {
                set({ currentPlan: null, executionEdges: [] });
            },

            // File operation actions
            addFileOperation: (op) => {
                const newOp: FileOperation = {
                    ...op,
                    id: `${op.agentId}-${op.type}-${Date.now()}`,
                    timestamp: Date.now(),
                    status: op.status || 'active',
                };

                set((state) => ({
                    fileOperations: [...state.fileOperations, newOp].slice(-20), // Keep last 20
                }));
            },

            updateFileOperation: (id, status) => {
                set((state) => ({
                    fileOperations: state.fileOperations.map(op =>
                        op.id === id ? { ...op, status } : op
                    ),
                }));
            },

            clearFileOperations: () => {
                set({ fileOperations: [] });
            },
        }),
        {
            name: 'nexen-agent-graph',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // Only persist layout, not execution state
                nodePositions: state.nodePositions,
                isLayoutLocked: state.isLayoutLocked,
            }),
        }
    )
);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate execution edges from a task plan.
 * This creates a DAG visualization based on task dependencies.
 */
export function generateExecutionEdges(plan: ExecutionPlan): ExecutionEdge[] {
    const edges: ExecutionEdge[] = [];
    const taskMap = new Map(plan.tasks.map(t => [t.id, t]));

    plan.tasks.forEach(task => {
        task.dependencies.forEach(depId => {
            const depTask = taskMap.get(depId);
            if (depTask) {
                edges.push({
                    id: `${depTask.agentId}-${task.agentId}-${task.id}`,
                    from: depTask.agentId,
                    to: task.agentId,
                    type: 'task_dep',
                    label: task.description.slice(0, 20),
                });
            }
        });
    });

    return edges;
}

/**
 * Get default edges for hierarchical view (when no execution plan is active).
 */
export function getDefaultHierarchyEdges(): ExecutionEdge[] {
    return [
        // Coordinator to all strategic agents
        { id: 'mc-logician', from: 'meta_coordinator', to: 'logician', type: 'task_dep' },
        { id: 'mc-critic', from: 'meta_coordinator', to: 'critic', type: 'task_dep' },
        { id: 'mc-connector', from: 'meta_coordinator', to: 'connector', type: 'task_dep' },
        { id: 'mc-explorer', from: 'meta_coordinator', to: 'explorer', type: 'task_dep' },
        { id: 'mc-builder', from: 'meta_coordinator', to: 'builder', type: 'task_dep' },

        // Strategic to executor
        { id: 'log-gen', from: 'logician', to: 'genealogist', type: 'task_dep' },
        { id: 'log-his', from: 'logician', to: 'historian', type: 'task_dep' },
        { id: 'cri-scr', from: 'critic', to: 'scribe', type: 'task_dep' },
        { id: 'exp-soc', from: 'explorer', to: 'social_scout', type: 'task_dep' },
        { id: 'exp-cn', from: 'explorer', to: 'cn_specialist', type: 'task_dep' },
        { id: 'exp-vis', from: 'explorer', to: 'vision_analyst', type: 'task_dep' },
        { id: 'bui-arc', from: 'builder', to: 'archivist', type: 'task_dep' },
        { id: 'bui-pro', from: 'builder', to: 'prompt_engineer', type: 'task_dep' },
    ];
}
