// Force Layout network visualization using Sigma.js + Graphology
// `signal` is aborted when a new network is loaded, removing this visualization's listeners.
export function drawForceLayout(edgeList, nodeList, colorValues, graphType, graphWeight, signal) {

    // --- Build graphology graph instance ---
    const graph = new graphology.Graph({ type: graphType === 'directed' ? 'directed' : 'undirected' });

    // The color picker holds an rgb() string once jscolor has initialized
    let nodeColor = document.getElementById('color-picker').value || '#08B3E5';
    if (/^[0-9a-f]{6}$/i.test(nodeColor)) nodeColor = '#' + nodeColor;

    nodeList.forEach(node => {
        graph.addNode(node.id, {
            x: 0,
            y: 0,
            size: (node.radius_degree || 15) / 5,
            color: nodeColor,
            label: node.id,
            // Store centrality radii for later customization
            radius_degree: node.radius_degree,
            radius_betweenness: node.radius_betweenness,
            radius_eigenvector: node.radius_eigenvector,
            radius_clustering: node.radius_clustering,
            // Store metric values for color scaling
            degree: node.degree,
            betweenness: node.betweenness,
            eigenvector: node.eigenvector,
            clustering: node.clustering
        });
    });

    // edgeList is already de-duplicated and every edge refers to a node in nodeList
    edgeList.forEach(edge => {
        graph.addEdge(edge.source.id, edge.target.id, {
            size: graphWeight === 'weighted' ? Math.max(edge.scaled_weight / 4, 1) : 1,
            originalWeight: edge.scaled_weight || 1,
            color: '#8888AA',
            type: graphType === 'directed' ? 'arrow' : 'line'
        });
    });

    const listen = (id, type, handler) => document.getElementById(id).addEventListener(type, handler, { signal });

    // --- Force-directed layout (ForceAtlas2 from graphology-library) ---
    const { layout, layoutForceAtlas2 } = graphologyLibrary;
    layout.circular.assign(graph);
    layoutForceAtlas2.assign(graph, {
        iterations: 400,
        settings: layoutForceAtlas2.inferSettings(graph)
    });

    // --- Create Sigma renderer ---
    const container = document.getElementById('force-layout-viz');

    // Sigma can't render into a collapsed (hidden) container; state changes made meanwhile
    // are drawn when the layout is shown again (see drawGraphs in main.js)
    const safeRefresh = () => { if (container.offsetWidth > 0) renderer.refresh(); };

    // State for highlighting
    let highlightedNode = null;
    let highlightedNeighbors = new Set();
    let filteredNodeIds = null;

    const renderer = new Sigma(graph, container, {
        renderLabels: document.getElementById('node-label').checked,
        labelFont: 'sans-serif',
        labelSize: 14,
        labelColor: { color: '#333' },
        defaultEdgeType: graphType === 'directed' ? 'arrow' : 'line',
        nodeReducer: (node, data) => {
            const res = { ...data };
            if (highlightedNode) {
                if (node !== highlightedNode && !highlightedNeighbors.has(node)) {
                    res.color = '#f0f0f0';
                    res.label = '';
                }
            }
            if (filteredNodeIds && !filteredNodeIds.has(node)) {
                res.hidden = true;
            }
            if (window._edgeAttrFilteredNodes && !window._edgeAttrFilteredNodes.has(node)) {
                res.color = '#f0f0f0';
                res.label = '';
            }
            return res;
        },
        edgeReducer: (edge, data) => {
            const res = { ...data };
            if (highlightedNode) {
                const source = graph.source(edge);
                const target = graph.target(edge);
                if (source !== highlightedNode && target !== highlightedNode) {
                    res.hidden = true;
                }
            }
            if (filteredNodeIds) {
                const source = graph.source(edge);
                const target = graph.target(edge);
                if (!filteredNodeIds.has(source) || !filteredNodeIds.has(target)) {
                    res.hidden = true;
                }
            }
            if (window._edgeAttrFilteredNodes) {
                const source = graph.source(edge);
                const target = graph.target(edge);
                if (!window._edgeAttrFilteredNodes.has(source) || !window._edgeAttrFilteredNodes.has(target)) {
                    res.hidden = true;
                }
            }
            return res;
        }
    });

    // Fit the graph to the viewport on initial load
    // Use a small delay to ensure the container has proper dimensions
    setTimeout(() => {
        // The network may have been replaced (renderer killed) within the delay
        if (!signal.aborted && container.offsetWidth > 0) renderer.getCamera().animatedReset({ duration: 0 });
    }, 100);

    // --- Click to highlight neighbors ---
    renderer.on('clickNode', ({ node }) => {
        highlightedNode = node;
        highlightedNeighbors = new Set(graph.neighbors(node));
        safeRefresh();
    });

    renderer.on('clickStage', () => {
        highlightedNode = null;
        highlightedNeighbors.clear();
        safeRefresh();
    });

    // --- Drag nodes ---
    let draggedNode = null;
    let isDragging = false;

    renderer.on('downNode', (e) => {
        isDragging = true;
        draggedNode = e.node;
        renderer.getCamera().disable();
    });

    renderer.getMouseCaptor().on('mousemovebody', (e) => {
        if (!isDragging || !draggedNode) return;
        const pos = renderer.viewportToGraph(e);
        graph.setNodeAttribute(draggedNode, 'x', pos.x);
        graph.setNodeAttribute(draggedNode, 'y', pos.y);
    });

    renderer.getMouseCaptor().on('mouseup', () => {
        if (draggedNode) {
            isDragging = false;
            draggedNode = null;
            renderer.getCamera().enable();
        }
    });

    // --- Table search filtering ---
    const table = Tabulator.findTable('#metrics-table')[0];
    if (table) {
        const onDataFiltered = function(filters, rows) {
            const ids = rows.map(row => row.getData().nodeId);
            const allRows = table.getData();
            if (ids.length === allRows.length) {
                filteredNodeIds = null;
            } else {
                filteredNodeIds = new Set(ids);
            }
            safeRefresh();
        };
        table.on('dataFiltered', onDataFiltered);
        signal.addEventListener('abort', () => table.off('dataFiltered', onDataFiltered));
    }

    // --- Customize: Size by centrality ---
    listen('centrality', 'change', function() {
        const centrality = this.value;
        graph.forEachNode((node, attrs) => {
            const radiusKey = `radius_${centrality}`;
            if (attrs[radiusKey] !== undefined) {
                graph.setNodeAttribute(node, 'size', attrs[radiusKey] / 5);
            }
        });
        safeRefresh();
    });

    // --- Customize: Color scale ---
    listen('color-scale', 'change', function() {
        const centrality = this.value;
        const pickerVal = document.getElementById('color-picker').value;
        if (centrality === 'none') {
            graph.forEachNode(node => {
                graph.setNodeAttribute(node, 'color', pickerVal);
            });
        } else {
            const origColor = pickerVal.replace(/[rgb()]/gm, '').split(',');
            const newColor = origColor.map(c => Math.round((255 - c) * 0.9 + parseInt(c)));
            const newRGB = `rgb(${newColor.join(',')})`;
            let maxVal = 0;
            graph.forEachNode((node, attrs) => {
                const val = Number(attrs[centrality]);
                if (val > maxVal) maxVal = val;
            });
            const colorScale = d3.scaleLinear().domain([0, maxVal]).range([newRGB, pickerVal]);
            graph.forEachNode((node, attrs) => {
                graph.setNodeAttribute(node, 'color', colorScale(Number(attrs[centrality])));
            });
        }
        safeRefresh();
    });

    // --- Customize: Edge weights ---
    listen('edge-weight', 'change', function() {
        const showWeights = this.checked;
        graph.forEachEdge((edge, attrs) => {
            graph.setEdgeAttribute(edge, 'size', showWeights ? (attrs.originalWeight / 4 || 1) : 1);
        });
        safeRefresh();
    });

    // --- Customize: Node labels ---
    listen('node-label', 'change', function() {
        renderer.setSetting('renderLabels', this.checked);
    });

    // Make sure edge weight checkbox is checked if graph is weighted
    if (graphWeight === 'weighted') { document.getElementById('edge-weight').checked = true; }

    // --- Customize: Directed arrows ---
    listen('directed-arrows', 'change', function() {
        const showArrows = this.checked;
        graph.forEachEdge(edge => {
            graph.setEdgeAttribute(edge, 'type', showArrows ? 'arrow' : 'line');
        });
        safeRefresh();
    });

    // Make sure arrow checkbox is checked if graph is directed
    if (graphType === 'directed') { document.getElementById('directed-arrows').checked = true; }

    // --- Restore Zoom ---
    listen('restore-zoom', 'click', function() {
        if (document.getElementById('force-layout-viz').style.visibility !== 'hidden') {
            renderer.getCamera().animatedReset();
        }
    });

    // --- Expose for cross-module access (updateColor, nodeSizeHist) ---
    window._sigmaInstance = renderer;
    window._graphologyInstance = graph;
}
