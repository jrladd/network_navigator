// Network metrics, computed with graphology-library (graphology-metrics, -communities-louvain,
// -components, -shortest-path) wherever it provides them. graphology has no clustering coefficient,
// transitivity or reciprocity function, so those are computed here from graphology's neighbor lookups.
//
// METRICS and GLOBAL_METRICS are registries: the table columns, histogram chips, size/color/order
// selects, glossary and readouts are all generated from them, so adding a metric means adding one
// entry here plus computing it in computeMetrics().

// All-pairs path metrics (diameter, average path length) cost about nodes x (nodes + edges) steps.
// Above this much work (a couple of seconds in the browser) they are skipped.
const PATH_METRICS_MAX_WORK = 15e6;

const fmt4 = (v) => v.toFixed(4);
const fmtInt = (v) => String(v);

// ------------------------------------------------------------------ registry

// Node-level metrics. `kind` is 'numeric' (can size, scale color, order, histogram) or 'categorical'.
// A metric is available for a network when result.node[key] is non-null.
export const METRICS = [
  {
    key: 'degree', label: 'Degree', kind: 'numeric', decimals: 0,
    description: 'The number of connections (edges) a particular node possesses. In a directed network, this is in-degree plus out-degree. Degree is the most basic measure of centrality.'
  },
  {
    key: 'inDegree', label: 'In-degree', kind: 'numeric', decimals: 0,
    description: 'The number of edges pointing toward a node. Directed networks only.'
  },
  {
    key: 'outDegree', label: 'Out-degree', kind: 'numeric', decimals: 0,
    description: 'The number of edges pointing away from a node. Directed networks only.'
  },
  {
    key: 'betweenness', label: 'Betweenness Centrality', kind: 'numeric', decimals: 4,
    description: 'In its simplest form, the share of shortest paths in the network that must pass through a particular node (scaled from 0 to 1). Betweenness centrality helps to measure how often any path in the network must go through a node, and therefore can show if a node is connected to many disparate groups in the network.'
  },
  {
    key: 'eigenvector', label: 'Eigenvector Centrality', kind: 'numeric', decimals: 4,
    description: 'A measure of a node’s centrality based on its degree and the degree of its immediate neighbors. Like asking, “Does this person have famous friends?” It can’t be calculated for every network (for example, one with no closed loops); PageRank works as a substitute.'
  },
  {
    key: 'pagerank', label: 'PageRank', kind: 'numeric', decimals: 4,
    description: 'Like eigenvector centrality, a node is important if important nodes connect to it, but PageRank can be calculated for any network, including directed networks with no closed loops. It is the idea behind Google’s original search ranking.'
  },
  {
    key: 'clustering', label: 'Clustering Coefficient', kind: 'numeric', decimals: 4,
    description: 'How close a node’s neighbors are to forming a tight clique: the share of possible connections between its neighbors that actually exist. Undirected networks only.'
  },
  {
    key: 'community', label: 'Community', kind: 'categorical', decimals: 0,
    description: 'The group a node belongs to, found with the Louvain algorithm, which looks for groups of nodes that are more densely connected to each other than to the rest of the network. Communities are numbered from largest (1) to smallest.'
  }
];

export const METRIC_BY_KEY = Object.fromEntries(METRICS.map((m) => [m.key, m]));

// Metrics that exist for this result, optionally only one kind ('numeric' | 'categorical')
export function availableMetrics(result, kind) {
  return METRICS.filter((m) => result.node[m.key] && (!kind || m.kind === kind));
}

// Graph-level readouts. `value(result.global)` may be null, shown as "N/A".
export const GLOBAL_METRICS = [
  { key: 'nodes', label: 'Total Nodes', format: fmtInt },
  { key: 'edges', label: 'Total Edges', format: fmtInt },
  { key: 'averageDegree', label: 'Average Degree', format: fmt4 },
  {
    key: 'density', label: 'Density', format: fmt4,
    description: 'The share of all possible connections between nodes that actually exist (0 to 1).'
  },
  {
    key: 'averageClustering', label: 'Avg. Clustering Coefficient', format: fmt4,
    description: 'The average of every node’s clustering coefficient. Undirected networks only.'
  },
  {
    key: 'transitivity', label: 'Transitivity', format: fmt4,
    description: 'The share of connected triples (a friend of a friend) that close into triangles. For directed networks, edge direction is ignored.'
  },
  {
    key: 'components', label: 'Components', format: fmtInt,
    description: 'The number of separate, unconnected pieces the network is made of. For directed networks, edge direction is ignored.'
  },
  {
    key: 'largestComponent', label: 'Largest Component', format: (v) => `${Math.round(v * 100)}%`,
    description: 'The share of nodes that belong to the biggest connected piece.'
  },
  {
    key: 'diameter', label: 'Diameter', format: fmtInt,
    description: 'The longest shortest path between any two nodes in the largest component (edge direction is ignored). Skipped for very large networks.'
  },
  {
    key: 'averagePathLength', label: 'Avg. Path Length', format: (v) => v.toFixed(2),
    description: 'The average number of steps along the shortest path between two nodes in the largest component (edge direction is ignored). Skipped for very large networks.'
  },
  {
    key: 'reciprocity', label: 'Reciprocity', format: fmt4,
    description: 'The share of directed edges that are returned (if A points to B, B also points to A). Directed networks only.'
  },
  { key: 'communities', label: 'Communities', format: fmtInt },
  {
    key: 'modularity', label: 'Modularity', format: fmt4,
    description: 'How strongly the network divides into the communities that were found. Values above about 0.3 usually indicate clear community structure.'
  }
];

export function formatNodeValue(key, value) {
  const metric = METRIC_BY_KEY[key];
  if (value === null || value === undefined) return 'N/A';
  if (metric.kind === 'categorical') return String(value);
  return metric.decimals === 0 ? String(value) : value.toFixed(metric.decimals);
}

// ------------------------------------------------------------------ helpers

// Small seeded PRNG (mulberry32) so Louvain gives the same communities every time
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

// Share of (non-loop) directed edges whose reverse edge also exists
function reciprocity(G) {
  let edges = 0;
  let mutual = 0;
  G.forEachEdge((edge, attrs, source, target) => {
    if (source === target) return;
    edges++;
    if (G.hasDirectedEdge(target, source)) mutual++;
  });
  return edges === 0 ? 0 : mutual / edges;
}

// Diameter and average path length within the largest (weakly) connected component
function pathMetrics(G, largest, lib) {
  if (largest.length < 2 || largest.length * (largest.length + G.size) > PATH_METRICS_MAX_WORK) {
    return { diameter: null, averagePathLength: null };
  }
  let diameter = 0;
  let total = 0;
  let pairs = 0;
  largest.forEach((source) => {
    const lengths = lib.shortestPath.undirectedSingleSourceLength(G, source);
    Object.keys(lengths).forEach((target) => {
      if (target === source) return;
      const length = lengths[target];
      if (length > diameter) diameter = length;
      total += length;
      pairs++;
    });
  });
  return { diameter, averagePathLength: pairs === 0 ? null : total / pairs };
}

// ------------------------------------------------------------------- public

/**
 * Detect communities with the Louvain algorithm (graphology-communities-louvain).
 * Communities are renumbered from 1 (largest) upward so colors are stable.
 *
 * @returns {{assignment: Object, count: number, modularity: number|null, sizes: number[]}|null}
 *   sizes[i] is the number of nodes in community i + 1. null if detection fails.
 */
export function detectCommunities(G, { weighted = false, resolution = 1, lib = globalThis.graphologyLibrary } = {}) {
  let detailed;
  try {
    detailed = lib.communitiesLouvain.detailed(G, {
      getEdgeWeight: weighted ? 'weight' : null,
      resolution,
      rng: seededRandom(42)
    });
  } catch (err) {
    console.warn('Community detection unavailable:', err.message);
    return null;
  }

  const counts = new Map();
  Object.values(detailed.communities).forEach((c) => counts.set(c, (counts.get(c) || 0) + 1));
  const order = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a - b);
  const newId = new Map(order.map((c, i) => [c, i + 1]));

  const assignment = {};
  Object.entries(detailed.communities).forEach(([node, c]) => { assignment[node] = newId.get(c); });

  return {
    assignment,
    count: order.length,
    modularity: Number.isFinite(detailed.modularity) ? detailed.modularity : null,
    sizes: order.map((c) => counts.get(c))
  };
}

/**
 * Compute all node-level and graph-level metrics for a graphology graph.
 *
 * @param {Graph} G graphology graph (directed or undirected)
 * @param {Object} options
 * @param {boolean} options.weighted use edge `weight` attributes for eigenvector centrality,
 *   PageRank and community detection (betweenness stays unweighted: weights are not distances)
 * @param {number} options.resolution Louvain resolution (higher finds more, smaller communities)
 * @param {Object} options.lib graphology-library namespace (defaults to the global)
 * @returns {{directed: boolean, node: Object, global: Object, communitySizes: number[]}}
 *   node[key] is a {nodeId: value} object, or null when the metric is unavailable.
 */
export function computeMetrics(G, { weighted = false, resolution = 1, lib = globalThis.graphologyLibrary } = {}) {
  const { centrality, graph } = lib.metrics;
  const directed = G.type === 'directed';
  const getEdgeWeight = weighted ? 'weight' : null;

  const degree = {};
  const inDegree = directed ? {} : null;
  const outDegree = directed ? {} : null;
  G.forEachNode((node) => {
    degree[node] = G.degree(node);
    if (directed) {
      inDegree[node] = G.inDegree(node);
      outDegree[node] = G.outDegree(node);
    }
  });

  // Normalized betweenness; weights are not distances, so ignore them
  const betweenness = centrality.betweenness(G, { getEdgeWeight: null });

  // Eigenvector centrality and PageRank may fail to converge for some graphs
  const tryMetric = (name, fn) => {
    try {
      return fn();
    } catch (err) {
      console.warn(`${name} unavailable:`, err.message);
      return null;
    }
  };
  const eigenvector = tryMetric('Eigenvector centrality', () => centrality.eigenvector(G, { getEdgeWeight }));
  const pagerank = tryMetric('PageRank', () => centrality.pagerank(G, { getEdgeWeight }));

  const { clustering, transitivity } = triangleMetrics(G);
  const clusteringValues = Object.values(clustering);
  const averageClustering = directed || clusteringValues.length === 0
    ? null
    : clusteringValues.reduce((a, b) => a + b, 0) / clusteringValues.length;

  const components = lib.components.connectedComponents(G);
  const largest = components.reduce((best, c) => (c.length > best.length ? c : best), []);
  const { diameter, averagePathLength } = pathMetrics(G, largest, lib);

  const communities = detectCommunities(G, { weighted, resolution, lib });

  return {
    directed,
    node: {
      degree,
      inDegree,
      outDegree,
      betweenness,
      eigenvector,
      pagerank,
      clustering: directed ? null : clustering,
      community: communities ? communities.assignment : null
    },
    global: {
      nodes: G.order,
      edges: G.size,
      averageDegree: G.order === 0 ? 0 : Object.values(degree).reduce((a, b) => a + b, 0) / G.order,
      density: graph.density(G),
      averageClustering,
      transitivity,
      components: components.length,
      largestComponent: G.order === 0 ? 0 : largest.length / G.order,
      diameter,
      averagePathLength,
      reciprocity: directed ? reciprocity(G) : null,
      communities: communities ? communities.count : null,
      modularity: communities ? communities.modularity : null
    },
    communitySizes: communities ? communities.sizes : []
  };
}
