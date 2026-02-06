// Force Layout network visualization using Sigma.js + Graphology
export function drawForceLayout(edgeList, nodeList, colorValues, graphType, graphWeight) {

    // --- Build graphology graph instance ---
    const graph = new graphology.Graph({ type: graphType === 'directed' ? 'directed' : 'undirected' });

    nodeList.forEach(node => {
        graph.addNode(node.id, {
            x: Math.random() * 1000 - 500,
            y: Math.random() * 1000 - 500,
            size: (node.radius_degree || 15) / 5,
            color: document.getElementById('color-picker').value || '#08B3E5',
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

    edgeList.forEach((edge, i) => {
        const source = typeof edge.source === 'object' ? edge.source.id : edge.source;
        const target = typeof edge.target === 'object' ? edge.target.id : edge.target;
        try {
            graph.addEdge(source, target, {
                size: graphWeight === 'weighted' ? Math.max(edge.scaled_weight / 4, 1) : 1,
                originalWeight: edge.scaled_weight || 1,
                color: '#8888AA',
                type: graphType === 'directed' ? 'arrow' : 'line'
            });
        } catch (e) {
            // Skip duplicate edges
        }
    });

    // --- Force-directed layout (spring-electric model) ---
    const ITERATIONS = 300;
    const REPULSION = 500;
    const ATTRACTION = 0.005;
    const GRAVITY = 0.001;
    const DAMPING = 0.9;
    const nodes = graph.nodes();

    // Velocity arrays
    const vx = {}, vy = {};
    nodes.forEach(node => { vx[node] = 0; vy[node] = 0; });

    function forceIteration() {
        // Repulsion between all node pairs
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i], n2 = nodes[j];
                const p1 = graph.getNodeAttributes(n1);
                const p2 = graph.getNodeAttributes(n2);
                let dx = p2.x - p1.x;
                let dy = p2.y - p1.y;
                let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                let force = REPULSION / (dist * dist);
                let fx = (dx / dist) * force;
                let fy = (dy / dist) * force;
                vx[n1] -= fx; vy[n1] -= fy;
                vx[n2] += fx; vy[n2] += fy;
            }
        }

        // Attraction along edges
        graph.forEachEdge((edge, attrs, source, target) => {
            const p1 = graph.getNodeAttributes(source);
            const p2 = graph.getNodeAttributes(target);
            let dx = p2.x - p1.x;
            let dy = p2.y - p1.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            let force = dist * ATTRACTION;
            let fx = (dx / dist) * force;
            let fy = (dy / dist) * force;
            vx[source] += fx; vy[source] += fy;
            vx[target] -= fx; vy[target] -= fy;
        });

        // Center gravity
        graph.forEachNode(node => {
            const attrs = graph.getNodeAttributes(node);
            vx[node] -= attrs.x * GRAVITY;
            vy[node] -= attrs.y * GRAVITY;
        });

        // Apply velocities with damping
        graph.forEachNode(node => {
            vx[node] *= DAMPING;
            vy[node] *= DAMPING;
            const attrs = graph.getNodeAttributes(node);
            graph.setNodeAttribute(node, 'x', attrs.x + vx[node]);
            graph.setNodeAttribute(node, 'y', attrs.y + vy[node]);
        });
    }

    // Run layout iterations
    for (let i = 0; i < ITERATIONS; i++) {
        forceIteration();
    }

    // --- Create Sigma renderer ---
    const container = document.getElementById('force-layout-viz');

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

    // --- Click to highlight neighbors ---
    renderer.on('clickNode', ({ node }) => {
        highlightedNode = node;
        highlightedNeighbors = new Set(graph.neighbors(node));
        renderer.refresh();
    });

    renderer.on('clickStage', () => {
        highlightedNode = null;
        highlightedNeighbors.clear();
        renderer.refresh();
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
    const table = new DataTable('#metrics-table');
    table.on('search.dt', function() {
        const data = table.rows({ filter: 'applied' }).data().toArray();
        const ids = data.map(d => d[0]);
        if (ids.length === table.rows().data().length) {
            filteredNodeIds = null;
        } else {
            filteredNodeIds = new Set(ids);
        }
        renderer.refresh();
    });

    // --- Customize: Size by centrality ---
    document.getElementById('centrality').addEventListener('change', function() {
        const centrality = this.value;
        graph.forEachNode((node, attrs) => {
            const radiusKey = `radius_${centrality}`;
            if (attrs[radiusKey] !== undefined) {
                graph.setNodeAttribute(node, 'size', attrs[radiusKey] / 5);
            }
        });
        renderer.refresh();
    });

    // --- Customize: Color scale ---
    document.getElementById('color-scale').addEventListener('change', function() {
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
        renderer.refresh();
    });

    // --- Customize: Edge weights ---
    document.getElementById('edge-weight').addEventListener('change', function() {
        const showWeights = this.checked;
        graph.forEachEdge((edge, attrs) => {
            graph.setEdgeAttribute(edge, 'size', showWeights ? (attrs.originalWeight / 4 || 1) : 1);
        });
        renderer.refresh();
    });

    // --- Customize: Node labels ---
    document.getElementById('node-label').addEventListener('change', function() {
        renderer.setSetting('renderLabels', this.checked);
    });

    // Make sure edge weight checkbox is checked if graph is weighted
    if (graphWeight === 'weighted') { document.getElementById('edge-weight').checked = true; }

    // --- Customize: Directed arrows ---
    document.getElementById('directed-arrows').addEventListener('change', function() {
        const showArrows = this.checked;
        graph.forEachEdge(edge => {
            graph.setEdgeAttribute(edge, 'type', showArrows ? 'arrow' : 'line');
        });
        renderer.refresh();
    });

    // Make sure arrow checkbox is checked if graph is directed
    if (graphType === 'directed') { document.getElementById('directed-arrows').checked = true; }

    // --- Restore Zoom ---
    document.getElementById('restore-zoom').addEventListener('click', function() {
        if (document.getElementById('force-layout-viz').style.visibility !== 'hidden') {
            renderer.getCamera().animatedReset();
        }
    });

    // --- Expose for cross-module access (updateColor, nodeSizeHist) ---
    window._sigmaInstance = renderer;
    window._graphologyInstance = graph;
}
