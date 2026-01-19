'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkflowStore } from '@/lib/workflowStore';
import type { AgentWorkflow, WorkflowNode, WorkflowEdge } from '@/lib/api';
import WorkflowNodeComponent from './WorkflowNode';
import WorkflowEdgeComponent from './WorkflowEdge';

interface WorkflowCanvasProps {
    workflow: AgentWorkflow;
    onConnectionComplete: (sourceId: string, targetId: string) => void;
    onEdgeClick: (edgeId: string) => void;
    onNodeDoubleClick: (nodeId: string) => void;
}

export default function WorkflowCanvas({
    workflow,
    onConnectionComplete,
    onEdgeClick,
    onNodeDoubleClick,
}: WorkflowCanvasProps) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [connectionLine, setConnectionLine] = useState<{
        start: { x: number; y: number };
        end: { x: number; y: number };
    } | null>(null);

    const {
        zoom,
        panOffset,
        isLocked,
        selectedNodeId,
        selectedEdgeId,
        isConnecting,
        connectionSource,
        setPanOffset,
        updateNodePosition,
        selectNode,
        selectEdge,
        startConnection,
        cancelConnection,
        addNode,
    } = useWorkflowStore();

    // Handle canvas pan
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.target === canvasRef.current && !isConnecting) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
            selectNode(null);
            selectEdge(null);
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPanOffset({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        }

        if (isConnecting && connectionSource) {
            const sourceNode = workflow.nodes.find((n) => n.id === connectionSource);
            if (sourceNode && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                setConnectionLine({
                    start: {
                        x: sourceNode.position.x + 80,
                        y: sourceNode.position.y + 40,
                    },
                    end: {
                        x: (e.clientX - rect.left - panOffset.x) / zoom,
                        y: (e.clientY - rect.top - panOffset.y) / zoom,
                    },
                });
            }
        }
    };

    const handleCanvasMouseUp = () => {
        setIsDragging(false);
        if (isConnecting) {
            cancelConnection();
            setConnectionLine(null);
        }
    };

    // Handle drag and drop from palette
    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            if (isLocked) return;

            const agentType = e.dataTransfer.getData('agentType');
            const agentLabel = e.dataTransfer.getData('agentLabel');
            const agentCluster = e.dataTransfer.getData('agentCluster');
            const agentConfigStr = e.dataTransfer.getData('agentConfig');

            if (agentType && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const x = (e.clientX - rect.left - panOffset.x) / zoom - 80;
                const y = (e.clientY - rect.top - panOffset.y) / zoom - 40;

                // Parse full agent config from drag data
                let config = {};
                if (agentConfigStr) {
                    try {
                        config = JSON.parse(agentConfigStr);
                    } catch (err) {
                        console.error('Failed to parse agent config:', err);
                    }
                }

                const newNode: WorkflowNode = {
                    id: `${agentType}-${Date.now()}`,
                    agentType,
                    position: { x, y },
                    label: agentLabel,
                    cluster: agentCluster || undefined,
                    config,
                };

                addNode(newNode);
            }
        },
        [isLocked, panOffset, zoom, addNode]
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // Handle connection from node
    const handleNodeConnectionStart = (nodeId: string) => {
        if (!isLocked) {
            startConnection(nodeId);
        }
    };

    const handleNodeConnectionEnd = (nodeId: string) => {
        if (isConnecting && connectionSource && connectionSource !== nodeId) {
            onConnectionComplete(connectionSource, nodeId);
            setConnectionLine(null);
        }
    };

    // Get node position for edge rendering
    const getNodeCenter = (nodeId: string): { x: number; y: number } | null => {
        const node = workflow.nodes.find((n) => n.id === nodeId);
        if (!node) return null;
        return {
            x: node.position.x + 80,
            y: node.position.y + 40,
        };
    };

    return (
        <div
            ref={canvasRef}
            className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing bg-gray-50"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
                backgroundImage: `
                    linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                    linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                `,
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
            }}
        >
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                }}
            >
                <defs>
                    <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                    >
                        <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
                    </marker>
                    <marker
                        id="arrowhead-selected"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                    >
                        <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                    </marker>
                </defs>

                {/* Render edges */}
                {workflow.edges.map((edge) => {
                    const sourcePos = getNodeCenter(edge.sourceNodeId);
                    const targetPos = getNodeCenter(edge.targetNodeId);
                    if (!sourcePos || !targetPos) return null;

                    return (
                        <WorkflowEdgeComponent
                            key={edge.id}
                            edge={edge}
                            sourcePos={sourcePos}
                            targetPos={targetPos}
                            isSelected={selectedEdgeId === edge.id}
                            onClick={() => onEdgeClick(edge.id)}
                        />
                    );
                })}

                {/* Connection line while dragging */}
                {connectionLine && (
                    <line
                        x1={connectionLine.start.x}
                        y1={connectionLine.start.y}
                        x2={connectionLine.end.x}
                        y2={connectionLine.end.y}
                        stroke="#6366f1"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        markerEnd="url(#arrowhead)"
                    />
                )}
            </svg>

            {/* Render nodes */}
            <div
                className="absolute inset-0"
                style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                }}
            >
                {workflow.nodes.map((node) => (
                    <WorkflowNodeComponent
                        key={node.id}
                        node={node}
                        isSelected={selectedNodeId === node.id}
                        isLocked={isLocked}
                        isConnecting={isConnecting}
                        onSelect={() => selectNode(node.id)}
                        onDoubleClick={() => onNodeDoubleClick(node.id)}
                        onConnectionStart={() => handleNodeConnectionStart(node.id)}
                        onConnectionEnd={() => handleNodeConnectionEnd(node.id)}
                        onPositionChange={(pos) => updateNodePosition(node.id, pos)}
                    />
                ))}
            </div>

            {/* Empty state */}
            {workflow.nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-gray-400">
                        <p className="text-lg font-medium">Empty Canvas</p>
                        <p className="text-sm mt-1">Drag agents from the left panel to get started</p>
                    </div>
                </div>
            )}
        </div>
    );
}
