// Network metrics, computed with graphology-library (graphology-metrics) wherever it
// provides them. graphology has no clustering coefficient or transitivity function, so
// those two are computed here from graphology's neighbor lookups.

// Per-node clustering coefficient and global transitivity.
// Directed graphs are treated as their undirected projection (G.neighbors() returns
// in- and out-neighbors), and self-loops are ignored.
function triangleMetrics(G) {
  const neighbors = new Map();
  G.forEachNode((node) => {
    const set = new Set(G.neighbors(node));
    set.delete(node);
    neighbors.set(node, set);
  });

  const clustering = {};
  let closedTriplets = 0; // 3 * number of triangles
  let triplets = 0;

  neighbors.forEach((nodeNeighbors, node) => {
    const k = nodeNeighbors.size;
    if (k < 2) {
      clustering[node] = 0;
      return;
    }

    // Count links among this node's neighbors (each link is seen from both ends)
    let links = 0;
    nodeNeighbors.forEach((u) => {
      neighbors.get(u).forEach((v) => {
        if (nodeNeighbors.has(v)) links++;
      });
    });
    links /= 2;

    const pairs = (k * (k - 1)) / 2;
    clustering[node] = links / pairs;
    closedTriplets += links;
    triplets += pairs;
  });

  return {
    clustering,
    transitivity: triplets === 0 ? 0 : closedTriplets / triplets
  };
}

/**
 * Compute all node-level and graph-level metrics for a graphology graph.
 *
 * @param {Graph} G graphology graph (directed or undirected)
 * @param {Object} options
 * @param {boolean} options.weighted use edge `weight` attributes for eigenvector centrality
 * @param {Object} options.lib graphology-library namespace (defaults to the global)
 * @returns {Object} degree, betweenness, eigenvector (null if it failed to converge),
 *   clustering (null for directed graphs), density, averageDegree,
 *   averageClustering (null for directed graphs), transitivity
 */
export function computeMetrics(G, { weighted = false, lib = globalThis.graphologyLibrary } = {}) {
  const { centrality, graph } = lib.metrics;
  const directed = G.type === 'directed';

  const degree = {};
  G.forEachNode((node) => {
    degree[node] = G.degree(node);
  });

  // Normalized betweenness; weights are not distances, so ignore them
  const betweenness = centrality.betweenness(G, { getEdgeWeight: null });

  // Eigenvector centrality does not converge for some graphs (e.g. no closed loops)
  let eigenvector = null;
  try {
    eigenvector = centrality.eigenvector(G, { getEdgeWeight: weighted ? 'weight' : null });
  } catch (err) {
    console.warn('Eigenvector centrality unavailable:', err.message);
  }

  const { clustering, transitivity } = triangleMetrics(G);

  const values = Object.values(clustering);
  const averageClustering = directed || values.length === 0
    ? null
    : values.reduce((a, b) => a + b, 0) / values.length;

  return {
    degree,
    betweenness,
    eigenvector,
    clustering: directed ? null : clustering,
    density: graph.density(G),
    averageDegree: G.order === 0 ? 0 : Object.values(degree).reduce((a, b) => a + b, 0) / G.order,
    averageClustering,
    transitivity
  };
}
