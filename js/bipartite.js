// Bipartite (two-mode) networks: metrics that make sense for two node sets, and projections.
//
// graphology has no bipartite support, so the bipartite-specific parts are computed here, on top of
// graphology's own centralities, shortest paths and Louvain. The formulas follow
// networkx.algorithms.bipartite so results can be compared with it.
//
// Set A is the first column of the data, set B the second. Inside the app the sets are numbered
// 1 (A) and 2 (B) so they work like any other categorical metric.

import { DataError } from './data.js';
import { PATH_METRICS_MAX_WORK, detectCommunities, tryMetric } from './metrics.js';

// A projection with more links than this is refused: it would be unreadable and slow
const MAX_PROJECTION_LINKS = 200000;

const sum = (values) => values.reduce((a, b) => a + b, 0);

// networkx's bipartite betweenness normalization: the largest possible raw betweenness for a node in a
// set of size n when the other set has size m
function maxBetweenness(n, m) {
  const [s, t] = [Math.floor((n - 1) / m), (n - 1) % m];
  return ((m ** 2) * ((s + 1) ** 2) + m * (s + 1) * (2 * t - s - 1) - t * (2 * s - t + 3)) / 2;
}

// Latapy et al. bipartite clustering, "dot" mode: for node u, the average over the other nodes v
// that share a neighbor with u of |N(u) ∩ N(v)| / |N(u) ∪ N(v)|
function bipartiteClustering(G) {
  const neighbors = new Map();
  G.forEachNode((node) => neighbors.set(node, new Set(G.neighbors(node))));

  const clustering = {};
  neighbors.forEach((own, u) => {
    const others = new Set();
    own.forEach((k) => neighbors.get(k).forEach((v) => { if (v !== u) others.add(v); }));
    if (others.size === 0) {
      clustering[u] = 0;
      return;
    }
    let total = 0;
    others.forEach((v) => {
      const theirs = neighbors.get(v);
      let shared = 0;
      own.forEach((k) => { if (theirs.has(k)) shared++; });
      total += shared / (own.size + theirs.size - shared);
    });
    clustering[u] = total / others.size;
  });
  return clustering;
}

// One breadth-first pass from every node gives closeness inputs for all nodes, and diameter and
// average path length within the largest component.
function distanceMetrics(G, largest, lib) {
  const none = { distances: null, diameter: null, averagePathLength: null };
  if (G.order * (G.order + G.size) > PATH_METRICS_MAX_WORK) return none;

  const inLargest = new Set(largest);
  const distances = {}; // node -> {total, reach}
  let diameter = 0;
  let pairTotal = 0;
  let pairs = 0;
  G.forEachNode((source) => {
    const lengths = lib.shortestPath.singleSourceLength(G, source);
    let total = 0;
    let reach = 0;
    Object.keys(lengths).forEach((target) => {
      const length = lengths[target];
      total += length;
      reach++;
      if (inLargest.has(source) && target !== source) {
        if (length > diameter) diameter = length;
        pairTotal += length;
        pairs++;
      }
    });
    distances[source] = { total, reach };
  });
  return { distances, diameter: pairs === 0 ? null : diameter, averagePathLength: pairs === 0 ? null : pairTotal / pairs };
}

/**
 * All node-level and graph-level metrics for a bipartite graph, in the same shape as computeMetrics()
 * so the table, selects, histogram, node card and exports work unchanged.
 *
 * @param {Graph} G undirected graph whose nodes are in set A (first column) or set B (second column)
 * @param {{A: Set<string>, B: Set<string>}} sets
 * @param {Object} options weighted (eigenvector, PageRank, communities), resolution (Louvain),
 *   setNames ({1: name of A, 2: name of B}), lib (graphology-library namespace)
 */
export function computeBipartiteMetrics(G, sets, {
  weighted = false, resolution = 1, setNames = { 1: 'Set A', 2: 'Set B' }, lib = globalThis.graphologyLibrary
} = {}) {
  const { centrality } = lib.metrics;
  const getEdgeWeight = weighted ? 'weight' : null;
  const nA = sets.A.size;
  const nB = sets.B.size;

  const set = {};
  const degree = {};
  const degreeCentrality = {};
  G.forEachNode((node) => {
    const isA = sets.A.has(node);
    set[node] = isA ? 1 : 2;
    degree[node] = G.degree(node);
    degreeCentrality[node] = degree[node] / (isA ? nB : nA);
  });

  // Raw betweenness (weights are not distances), scaled separately for each set like networkx does
  const rawBetweenness = centrality.betweenness(G, { normalized: false, getEdgeWeight: null });
  const maxA = maxBetweenness(nA, nB);
  const maxB = maxBetweenness(nB, nA);
  const betweenness = {};
  Object.keys(rawBetweenness).forEach((node) => {
    const max = set[node] === 1 ? maxA : maxB;
    betweenness[node] = max > 0 ? rawBetweenness[node] / max : 0;
  });

  const eigenvector = tryMetric('Eigenvector centrality', () => centrality.eigenvector(G, { getEdgeWeight }));
  const pagerank = tryMetric('PageRank', () => centrality.pagerank(G, { getEdgeWeight }));
  const clustering = bipartiteClustering(G);

  const components = lib.components.connectedComponents(G);
  const largest = components.reduce((best, c) => (c.length > best.length ? c : best), []);
  const { distances, diameter, averagePathLength } = distanceMetrics(G, largest, lib);

  // networkx's bipartite closeness: scaled by what a node could reach at best, then by how much it reaches
  let closeness = null;
  if (distances) {
    closeness = {};
    const N = G.order;
    G.forEachNode((node) => {
      const { total, reach } = distances[node];
      const best = set[node] === 1 ? nB + 2 * (nA - 1) : nA + 2 * (nB - 1);
      closeness[node] = total > 0 && N > 1 ? (best / total) * ((reach - 1) / (N - 1)) : 0;
    });
  }

  const communities = detectCommunities(G, { weighted, resolution, lib });
  const averageOf = (values, nodes) => (nodes.size === 0 ? null : sum([...nodes].map((node) => values[node])) / nodes.size);

  return {
    directed: false,
    bipartite: true,
    setNames,
    sets,
    node: {
      degree,
      degreeCentrality,
      betweenness,
      closeness,
      eigenvector,
      pagerank,
      bipClustering: clustering,
      community: communities ? communities.assignment : null,
      set
    },
    global: {
      nodesA: nA,
      nodesB: nB,
      edges: G.size,
      averageDegreeA: averageOf(degree, sets.A),
      averageDegreeB: averageOf(degree, sets.B),
      density: G.size / (nA * nB),
      components: components.length,
      largestComponent: G.order === 0 ? 0 : largest.length / G.order,
      diameter,
      averagePathLength,
      averageBipClusteringA: averageOf(clustering, sets.A),
      averageBipClusteringB: averageOf(clustering, sets.B),
      communities: communities ? communities.count : null,
      modularity: communities ? communities.modularity : null
    },
    communitySizes: communities ? communities.sizes : []
  };
}

export const PROJECTION_WEIGHTINGS = {
  count: 'Shared neighbors',
  jaccard: 'Jaccard (share of all neighbors)',
  newman: 'Newman (rarer shared neighbors count more)'
};

/**
 * Project a bipartite network onto one of its sets: two nodes of that set are linked when they share
 * at least `minShared` neighbors in the other set.
 *
 * @param {Graph} G the bipartite graph
 * @param {{A: Set<string>, B: Set<string>}} sets
 * @param {'A'|'B'} side which set to keep
 * @param {Object} options weighting ('count' | 'jaccard' | 'newman'), minShared (default 1)
 * @returns {Graph} undirected graph of the kept set; edges have `weight` (chosen scheme) and `shared`
 *   (number of shared neighbors). Nodes without links are kept.
 */
export function projectNetwork(G, sets, side, { weighting = 'count', minShared = 1 } = {}) {
  const keep = side === 'A' ? sets.A : sets.B;
  const other = side === 'A' ? sets.B : sets.A;

  const pairs = new Map(); // "u\0v" -> {u, v, shared, newman}
  other.forEach((k) => {
    const members = G.neighbors(k);
    const scale = members.length > 1 ? 1 / (members.length - 1) : 0;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const [u, v] = members[i] < members[j] ? [members[i], members[j]] : [members[j], members[i]];
        const key = `${u}\u0000${v}`;
        let pair = pairs.get(key);
        if (!pair) {
          pair = { u, v, shared: 0, newman: 0 };
          pairs.set(key, pair);
          if (pairs.size > MAX_PROJECTION_LINKS) {
            throw new DataError(
              `This projection would have more than ${MAX_PROJECTION_LINKS.toLocaleString()} links, which is too many to show. ` +
              'Try projecting onto the other set, or use a smaller network.'
            );
          }
        }
        pair.shared++;
        pair.newman += scale;
      }
    }
  });

  const P = new graphology.UndirectedGraph();
  G.forEachNode((node) => { if (keep.has(node)) P.addNode(node); });
  pairs.forEach(({ u, v, shared, newman }) => {
    if (shared < minShared) return;
    let weight = shared;
    if (weighting === 'jaccard') weight = shared / (G.degree(u) + G.degree(v) - shared);
    else if (weighting === 'newman') weight = newman;
    P.addEdge(u, v, { weight, shared });
  });
  return P;
}
