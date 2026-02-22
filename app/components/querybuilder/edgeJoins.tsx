import React, { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useReactFlow,
} from '@xyflow/react';
import { Divide } from 'lucide-react';

// import './edgeJoins.css'; // Assuming you might add styles here

const CustomJoinEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const { setEdges } = useReactFlow();
  const [showOptions,setShowOptions] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setShowOptions((prev) => !prev)
  };

  const deleteEdge = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div 
             style={{ 
               background: '#fff', 
               padding: '4px 8px', 
               border: '1px solid #777', 
               borderRadius: 4,
               display: 'flex',
               gap: 5,
               alignItems: 'center'
             }}
             onClick={onEdgeClick}
          >
            <span>{data?.joinType as string || 'JOIN'}</span>
            <button 
              onClick={deleteEdge}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'red', fontWeight: 'bold' }}
              aria-label="Delete Join"
            >
              ×
            </button>
          </div>
        </div>
        {showOptions && (
          <div
            className="nodrag nopan"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + 30}px)`,
              background: '#fff',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              pointerEvents: 'all',
              zIndex: 10,
              minWidth: 100,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label htmlFor={`join-select-${id}`} style={{ fontSize: 12 }}>Type:</label>
                <select
                  id={`join-select-${id}`}
                  value={data?.joinType as string || 'INNER'}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    e.stopPropagation();
                    const value = e.target.value;
                    setEdges((eds) =>
                      eds.map((edge) =>
                        edge.id === id ? { ...edge, data: { ...edge.data, joinType: value } } : edge
                      )
                    );
                    setShowOptions(false);

                    

                    
                  }}
                  style={{ padding: '4px 6px', borderRadius: 4, border: '1px solid #ccc', background: '#fff' }}
                >
                  <option value="INNER">INNER JOIN</option>
                  <option value="LEFT">LEFT JOIN</option>
                  <option value="RIGHT">RIGHT JOIN</option>
                  <option value="FULL">FULL JOIN</option>
                  <option value="CROSS">CROSS JOIN</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomJoinEdge;