import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps,Node } from '@xyflow/react';

interface Column {
name: string;
type: string;
nullable: boolean;
isPrimaryKey: boolean;
}

type TableNodeData = {
  label: string;
  column:Column[];
};

const TableNode = ({ data, isConnectable }: NodeProps<Node<TableNodeData>>) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleColumnToggle = (colName: string) => {
    setSelectedColumns((prev) => 
      prev.includes(colName) 
        ? prev.filter((c) => c !== colName) 
        : [...prev, colName]
    );
  };

  return (
    <div className="table-node shadow-md rounded-lg bg-white border border-gray-300 w-64 overflow-hidden">
      {/* Header Section */}
      <div className={`flex items-center justify-between px-3 py-2 bg-gray-50 ${isExpanded ? 'border-b border-gray-200' : ''}`}>
        <div className="flex items-center overflow-hidden">
          <div className="rounded-full w-7 h-7 flex justify-center items-center bg-white border border-gray-200 mr-2 text-sm shadow-sm shrink-0">
            📝
          </div>
          <div className="font-bold text-gray-700 text-sm truncate" title={data.label}>
            {data.label}
          </div>
        </div>
        
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-md hover:bg-gray-100 transition-colors"
        >
           <svg 
             xmlns="http://www.w3.org/2000/svg" 
             className={`h-4 w-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
             fill="none" 
             viewBox="0 0 24 24" 
             stroke="currentColor"
           >
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
           </svg>
        </button>
      </div>
      
      {/* Content Section */}
      {isExpanded && (
        <div className="nodrag p-2">
          <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Columns</span>
              <span className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full font-medium">
                  {selectedColumns.length} selected
              </span>
          </div>
          
          <div className="flex flex-col max-h-48 overflow-y-auto px-1 space-y-0.5 custom-scrollbar">
            {Array.isArray(data.column) && data.column.map((col: Column, index: number) => (
               <label 
                  key={index} 
                  className={`flex items-center p-1.5 rounded cursor-pointer transition-colors text-xs ${
                      selectedColumns.includes(col.name) ? "bg-teal-50" : "hover:bg-gray-50"
                  }`}
               >
                  <input 
                      type="checkbox" 
                      className="mr-2 h-3.5 w-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      checked={selectedColumns.includes(col.name)}
                      onChange={() => handleColumnToggle(col.name)}
                  />
                  <div className="flex-1 flex items-center justify-between">
                      <span className={selectedColumns.includes(col.name) ? "font-medium text-gray-900" : "text-gray-600"}>
                          {col.name}
                      </span>
                      {col.isPrimaryKey && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded ml-1 border border-amber-100">PK</span>
                      )}
                  </div>
               </label>
            ))}
            {(!data.column || data.column.length === 0) && (
               <div className="text-xs text-gray-400 italic text-center py-2">No columns available</div>
            )}
          </div>
        </div>
      )}

      <Handle
        type="target"
        position={Position.Right}
        className="w-3 h-3 !bg-teal-500 border-2 border-white shadow-sm"
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Left}
        className="w-3 h-3 !bg-teal-500 border-2 border-white shadow-sm"
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default memo(TableNode);