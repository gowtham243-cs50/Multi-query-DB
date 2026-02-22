'use client';

import { validateDAG } from './utils/graphutils';
import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  useReactFlow,
  Panel
} from '@xyflow/react';
import TableNode from './tableNode';
import CustomJoinEdge from './edgeJoins';
import '@xyflow/react/dist/style.css';
const nodeTypes = {
  table: TableNode
};
const edgeTypes = {
  join: CustomJoinEdge
}

type Graph = {
  [key: string]: string[];
};

const QueryCanvas: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [graph, setGraph] = useState<Graph>();

  const handleExecute = () => {
    console.log("Executing Workflow...");
    console.log("Nodes:", nodes);
    console.log("Edges:", edges);

    const dag: Graph = {};

    nodes.forEach((node) => {
      dag[node.id] = []
    })

    edges.forEach((edge) => {
      if (dag[edge.source]) {
        dag[edge.target].push(edge.source);
      }
    })
     setGraph(dag)
     console.log("Generated DAG", dag);
     let order = validateDAG(dag)
  };
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);

  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      console.log('Edge connected:', params);
      setEdges((eds) => addEdge({ ...params, type: 'join' }, eds));
    },
    [setEdges]
  );

  const handleOnDragOver = useCallback((e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, []);

  const handleOnDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      // 1. Retrieve the data stored in SchemaExplorer
      const type = e.dataTransfer.getData('application/reactflow');
      const dataString = e.dataTransfer.getData('application/json');

      if (!dataString) {
        return;
      }
      const { tableName } = JSON.parse(dataString);
      const { columns } = JSON.parse(dataString);

      console.log("tablename" + tableName, "columns" + columns);

      // 2. Calculate the position on the generic canvas based on mouse drop
      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const newNode: Node = {
        id: `table-${tableName}-${Date.now()}`,
        type: 'table',
        position,
        data: { label: tableName, column: columns }, 
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );


  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100vh' }} onDrop={handleOnDrop} onDragOver={handleOnDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
        <Panel position='top-right'>
          <button onClick={handleExecute} className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 font-medium transition-colors">
            Execute
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default QueryCanvas;