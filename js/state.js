// Shared application state for the currently loaded network.
// Modules import `app` instead of passing many arguments around or using window globals.

export const app = {
  G: null,                // graphology graph
  result: null,           // output of computeMetrics()
  nodeList: [],           // node objects for the D3 views: {id, degree, ..., community}
  edgeList: [],           // edge objects: {source: node, target: node, weight, scaled_weight, ...}
  graphType: 'undirected',
  graphWeight: 'unweighted',
  weighted: false,        // edge weights in the network on screen
  mode: 'unipartite',     // 'unipartite' | 'bipartite' (what the user chose before Navigate)
  source: null,           // what was loaded: {G, edges, sets, weighted, directed, setNames}
  views: new Map(),       // cached results per network view: 'main', 'A' (projection), 'B' (projection)
  networkView: 'main',    // which of those is on screen
  sets: null,             // {A: Set, B: Set} when a bipartite network is on screen
  colorValues: [],        // unique edge weights (plus 0), for the matrix legend
  vizType: 'force',       // 'force' | 'arc' | 'matrix'
  vizBlocked: false,      // true while a large network waits for "Click to load"
  controller: new AbortController(), // aborted on every Navigate to drop the old views' listeners
  table: null,            // Tabulator instance
  sigma: null,            // Sigma renderer of the force layout, when drawn
  graph: null             // graphology graph of the force layout (with x/y/size/color)
};
