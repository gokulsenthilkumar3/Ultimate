import React from 'react';
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps, Edge } from '@xyflow/react';

export type RelationshipEdgeType = Edge<{ type: string; label?: string } & Record<string, unknown>, 'relationship'>;

export const RelationshipEdge: React.FC<EdgeProps<RelationshipEdgeType>> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 24,
  });

  // Determine edge color based on relationship type
  const type = data?.type as string;
  let edgeColor = '#9CA3AF'; // default gray
  let isDashed = false;
  
  if (type === 'spouse') {
    edgeColor = '#F87171'; // rose
  } else if (type === 'parent') {
    edgeColor = '#3B82F6'; // blue
  } else if (type === 'adopted') {
    edgeColor = '#10B981'; // emerald
    isDashed = true;
  }

  return (
    <g>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          stroke: edgeColor,
          strokeWidth: 2,
          strokeDasharray: isDashed ? '5,5' : 'none'
        }} 
      />
      
      {/* Optional: Add custom label for marriage dates, etc */}
      {data?.label && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect 
            x="-30"
            y="-10"
            width="60"
            height="20"
            fill="white"
            stroke={edgeColor}
            strokeWidth="1"
            rx="4"
            ry="4"
          />
          <text
            x="0"
            y="0"
            fill="#374151"
            fontSize="10"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {data.label}
          </text>
        </g>
      )}
    </g>
  );
};
