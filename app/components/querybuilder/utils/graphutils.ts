type Graph = {
  [key: string]: string[];
};

// Helper to find connected components (treating graph as undirected for grouping)
const getConnectedComponents = (graph: Graph, nodes: string[]): string[][] => {
  const visited = new Set<string>();
  const components: string[][] = [];
  
  // Build adjacency list for undirected graph traversal
  const undirGraph: Record<string, string[]> = {};
  nodes.forEach(n => undirGraph[n] = []);
  
  nodes.forEach((source) => {
    graph[source]?.forEach((target) => {
      undirGraph[source].push(target);
      undirGraph[target].push(source);
    });
  });

  for (const node of nodes) {
    if (!visited.has(node)) {
      const component: string[] = [];
      const queue: string[] = [node];
      visited.add(node);
      
      while (queue.length > 0) {
        const curr = queue.shift()!;
        component.push(curr);
        
        undirGraph[curr].forEach((neighbor) => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }); 
      }
      components.push(component);
    }
  }
  return components;
};

export const validateDAG = (graph: Graph): string[][] | null => {
  const inDegree: Record<string, number> = {};
  const nodes = Object.keys(graph);
  const queue: string[] = [];
  const fullResult: string[] = [];

  nodes.forEach((node) => {
    inDegree[node] = 0;
  });

  nodes.forEach((node) => {
    if (graph[node]) {
      graph[node].forEach((target) => {
        inDegree[target]++;
      });
    }
  });

  nodes.forEach((node) => {
    if (inDegree[node] == 0) {
      queue.push(node);
    }
  });

  let visitedCount = 0;
  while (queue.length > 0) {
    const u = queue.shift()!;
    fullResult.push(u);
    visitedCount++;

    graph[u].forEach((node) => {
      inDegree[node]--;
      if (inDegree[node] == 0) {
        queue.push(node);
      }
    });
  }

  if (visitedCount !== nodes.length) {
    console.error("Cycle detected in graph");
    return null; // Cycle detected
  }

  // 1. Get disconnected groups of nodes
  const components = getConnectedComponents(graph, nodes);

  // 2. Map the global topological sort order into those groups
  // We filter the fullResult for each component to preserve the valid topological order
  const separatedResults = components.map(component => {
    const componentSet = new Set(component);
    return fullResult.filter(node => componentSet.has(node));
  });

  console.log(separatedResults);
  return separatedResults; // Returns array of arrays: e.g. [[1, 2], [3, 4]]
};
