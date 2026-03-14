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

export interface JoinCondition {
  sourceNodeId: string;
  targetNodeId: string;
  sourceColumn: string;
  targetColumn: string;
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
}

export interface ExecutionStep {
  stepId: string;
  tableName: string;
  selectedColumns: string[];
  joins: JoinCondition[];
  dbtype?: string;
}

export interface QueryExecutionPlan {
  steps: ExecutionStep[][];
}

const QueryCanvas: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [graph, setGraph] = useState<Graph>();

  const onColumnsChange = useCallback((nodeId: string, selectedCols: string[]) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, selectedColumns: selectedCols },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleExecute = async () => {
    console.log("Executing Workflow...");
    console.log("Nodes:", nodes);
    console.log("Edges:", edges);

    const dag: Graph = {};

    nodes.forEach((node) => {
      dag[node.id] = []
      console.log("Selected columns : " + node.data.selectedColumns)

    })

    edges.forEach((edge) => {
      if (dag[edge.source]) {
        dag[edge.target].push(edge.source);
      }
    })
    setGraph(dag)
    console.log("Generated DAG", dag);
    let order = validateDAG(dag)
    const edgeIdsInOrder: string[][] = [];

    if (order) {
      order.forEach((sequence) => {
        const seq: string[] = [];
        for (let i = 0; i < sequence.length - 1; i++) {
          const sourceId = sequence[i];
          const targetId = sequence[i + 1];

          const edge = edges.find(
            (e) => (e.source === sourceId && e.target === targetId) ||
              (e.target === sourceId && e.source === targetId)
          );
          if (edge) {
            seq.push(edge.id);
          }
        }
        edgeIdsInOrder.push(seq);

      });

      console.log("Ordered Edge IDs:", edgeIdsInOrder);
      const steps: ExecutionStep[][] = [];
      const stepsMap = new Map<string, ExecutionStep>();

      const getOrCreateStep = (nodeId: string, currentStepList: ExecutionStep[]): ExecutionStep | undefined => {
        if (stepsMap.has(nodeId)) {

          return stepsMap.get(nodeId);
        }

        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return undefined;

        const newStep: ExecutionStep = {
          stepId: node.id,
          tableName: node.data.label as string,
          selectedColumns: (node.data.selectedColumns as string[]) || [],
          joins: [],
          dbtype: node.data.dbType as string
        };

        stepsMap.set(nodeId, newStep);
        currentStepList.push(newStep);
        return newStep;
      };


      if (order) {
        order.forEach((nodeSequence) => {
          const currentSequenceSteps: ExecutionStep[] = [];

          nodeSequence.forEach((nodeId) => {
            getOrCreateStep(nodeId, currentSequenceSteps);
          });

          if (currentSequenceSteps.length > 0) {
            steps.push(currentSequenceSteps);
          }
        });
      }

      // Now populate Joins using edges
      edges.forEach((edge) => {
        const sourceStep = stepsMap.get(edge.source);
        const targetStep = stepsMap.get(edge.target);

        if (sourceStep && targetStep) {
          const edgeData = edge.data || {};

          // Construct the join condition
          const joinCondition: JoinCondition = {
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourceColumn: (edgeData.sourceColumn as string) || '',
            targetColumn: (edgeData.targetColumn as string) || '',
            joinType: (edgeData.joinType as 'INNER' | 'LEFT' | 'RIGHT' | 'FULL') || 'INNER',
          };

          // Add join condition to target step
          // Note: This logic assumes edges flow FROM source TO target in the join
          targetStep.joins.push(joinCondition);
        }
      });

      console.log("Execution Steps:", steps);



      const executionPlan: QueryExecutionPlan = {
        steps: steps
      }

      console.log("Final Plan:", executionPlan);

      try {
        const response = await fetch('/api/execution/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(executionPlan),
        });
        const result = await response.json();
        console.log("Query Results", result);
      }
      catch (error) {
        console.error("Failed in execution", error);
      }
    }



  };
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);

  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      const newEdge = { ...params, type: 'join' };
      setEdges((eds) => addEdge(newEdge, eds));
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

      const parsed = JSON.parse(dataString);
      const { tableName, columns, dbType } = parsed;

      console.log("tablename", tableName, "columns", columns, "dbType", dbType);

      // 2. Calculate the position on the generic canvas based on mouse drop
      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const newNode: Node = {
        id: `table-${tableName}-${Date.now()}`,
        type: 'table',
        position,
        data: {
          label: tableName,
          column: columns,
          selectedColumns: [],
          onColumnsChange,
          dbType,   // now correctly set
        },
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