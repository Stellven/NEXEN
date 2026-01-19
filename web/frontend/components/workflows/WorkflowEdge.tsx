'use client';

import type { WorkflowEdge } from '@/lib/api';

interface WorkflowEdgeProps {
    edge: WorkflowEdge;
    sourcePos: { x: number; y: number };
    targetPos: { x: number; y: number };
    isSelected: boolean;
    onClick: () => void;
}

export default function WorkflowEdgeComponent({
    edge,
    sourcePos,
    targetPos,
    isSelected,
    onClick,
}: WorkflowEdgeProps) {
    // Calculate control points for a smooth bezier curve
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const controlOffset = Math.min(Math.abs(dy) * 0.5, 100);

    const path = `
        M ${sourcePos.x} ${sourcePos.y}
        C ${sourcePos.x} ${sourcePos.y + controlOffset},
          ${targetPos.x} ${targetPos.y - controlOffset},
          ${targetPos.x} ${targetPos.y}
    `;

    // Edge type colors
    const getEdgeColor = () => {
        switch (edge.edgeType) {
            case 'conditional':
                return isSelected ? '#f59e0b' : '#fbbf24';
            case 'storage_read':
                return isSelected ? '#10b981' : '#34d399';
            case 'storage_write':
                return isSelected ? '#8b5cf6' : '#a78bfa';
            default:
                return isSelected ? '#3b82f6' : '#6366f1';
        }
    };

    const color = getEdgeColor();

    return (
        <g className="cursor-pointer" onClick={onClick}>
            {/* Invisible wider path for easier clicking */}
            <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
            />

            {/* Actual visible path */}
            <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? 3 : 2}
                markerEnd={isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
                style={{
                    transition: 'stroke-width 0.2s',
                }}
            />

            {/* Edge type indicator */}
            {edge.edgeType !== 'data_flow' && (
                <text
                    x={(sourcePos.x + targetPos.x) / 2}
                    y={(sourcePos.y + targetPos.y) / 2 - 8}
                    textAnchor="middle"
                    className="text-xs fill-gray-500 pointer-events-none"
                    style={{ fontSize: '10px' }}
                >
                    {edge.edgeType.replace('_', ' ')}
                </text>
            )}

            {/* Condition indicator */}
            {edge.config?.condition?.enabled && (
                <circle
                    cx={(sourcePos.x + targetPos.x) / 2}
                    cy={(sourcePos.y + targetPos.y) / 2}
                    r="6"
                    fill="#fbbf24"
                    stroke="white"
                    strokeWidth="2"
                />
            )}
        </g>
    );
}
