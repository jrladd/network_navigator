// Force Layout network visualization using Sigma.js + Graphology
// `signal` is aborted when a new network is loaded, removing this visualization's listeners.
import { app } from './state.js';
import { selection } from './selection.js';
import { appearance } from './appearance.js';
import { formatNodeValue } from './metrics.js';

const DIMMED_COLOR = '#e3e9ee';
const LIVE_LAYOUT_SECONDS = 6;
const LIVE_LAYOUT_MAX_NODES = 1000;

export function drawForceLayout(edgeList, nodeList, colorValues, graphType, graphWeight, signal) {
    const container = document.getElementById('force-layout-viz');
    const listen = (target, type, handler) => target.addEventListener(type, handler, { signal });

    // --- Build graphology graph instance ---
    const graph = new graphology.Graph({ type: graphType === 'directed' ? 'directed' : 'undirected' });
    const nodesById = new Map(nodeList.map(node => [node.id, node]));

    nodeList.forEach(node => {
        graph.addNode(node.id, {
            x: 0,
            y: 0,
            size: appearance.radius(node) / 5,
            color: appearance.color(node),
            label: node.id
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

    // --- Force-directed layout (ForceAtlas2 from graphology-library) ---
    const { layout, layoutForceAtlas2, FA2Layout } = graphologyLibrary;
    layout.circular.assign(graph);
    layoutForceAtlas2.assign(graph, {
        iterations: 400,
        settings: layoutForceAtlas2.inferSettings(graph)
    });

    // --- Create Sigma renderer ---
    let focusNeighbors = new Set();

    const renderer = new Sigma(graph, container, {
        renderLabels: document.getElementById('node-label').checked,
        labelFont: 'sans-serif',
        labelSize: 14,
        labelColor: { color: '#333' },
        defaultEdgeType: graphType === 'directed' ? 'arrow' : 'line',
        allowInvalidContainer: true,
        nodeReducer: (node, data) => {
            const res = { ...data };
            const focus = selection.selected;
            if (focus) {
                if (node === focus) {
                    res.highlighted = true;
                    res.forceLabel = true;
                } else if (!focusNeighbors.has(node)) {
                    res.color = DIMMED_COLOR;
                    res.label = '';
                }
            }
            if (!selection.isVisible(node)) {
                res.hidden = true;
            }
            if (!selection.passesAttrFilter(node)) {
                res.color = '#f0f0f0';
                res.label = '';
            }
            return res;
        },
        edgeReducer: (edge, data) => {
            const res = { ...data };
            const source = graph.source(edge);
            const target = graph.target(edge);
            const focus = selection.selected;
            if (focus && source !== focus && target !== focus) {
                res.hidden = true;
            }
            if (!selection.isVisible(source) || !selection.isVisible(target)) {
                res.hidden = true;
            }
            if (!selection.passesAttrFilter(source) || !selection.passesAttrFilter(target)) {
                res.hidden = true;
            }
            return res;
        }
    });

    // Sigma can't render into a collapsed (hidden) container; state changes made meanwhile
    // are drawn when the layout is shown again (see ensureDrawn in main.js)
    const safeRefresh = () => { if (container.offsetWidth > 0) renderer.refresh(); };

    // Fit the graph to the viewport on initial load
    setTimeout(() => {
        // The network may have been replaced (renderer killed) within the delay
        if (!signal.aborted && container.offsetWidth > 0) renderer.getCamera().animatedReset({ duration: 0 });
    }, 100);

    // --- Selection: click a node to highlight it and its neighbors ---
    // A drag ends with a click on the same node; don't treat that as a selection
    let movedWhileDragging = false;
    renderer.on('clickNode', ({ node }) => {
        if (movedWhileDragging) {
            movedWhileDragging = false;
            return;
        }
        selection.select(node === selection.selected ? null : node);
    });
    renderer.on('clickStage', () => selection.clear());

    listen(selection, 'select', () => {
        focusNeighbors = selection.selected && graph.hasNode(selection.selected)
            ? new Set(graph.neighbors(selection.selected))
            : new Set();
        safeRefresh();
    });
    listen(selection, 'filter', safeRefresh);
    listen(selection, 'attrfilter', safeRefresh);

    // --- Shared node appearance (size and color) ---
    listen(appearance, 'change', () => {
        graph.forEachNode((id) => {
            const node = nodesById.get(id);
            graph.setNodeAttribute(id, 'size', appearance.radius(node) / 5);
            graph.setNodeAttribute(id, 'color', appearance.color(node));
        });
        safeRefresh();
    });

    // --- Hover tooltip (pointer devices only; touch users tap for the node card) ---
    if (window.matchMedia('(hover: hover)').matches) {
        const tip = document.createElement('div');
        tip.className = 'float-tip';
        tip.hidden = true;
        document.body.append(tip);
        signal.addEventListener('abort', () => tip.remove());

        renderer.on('enterNode', ({ node }) => {
            const data = nodesById.get(node);
            tip.textContent = `${node} · ${formatNodeValue('degree', data.degree)} connections`;
            tip.hidden = false;
        });
        renderer.on('leaveNode', () => { tip.hidden = true; });
        listen(container, 'mousemove', (e) => {
            tip.style.left = `${e.clientX + 14}px`;
            tip.style.top = `${e.clientY + 14}px`;
        });
    }

    // --- Drag nodes ---
    let draggedNode = null;
    let isDragging = false;

    renderer.on('downNode', (e) => {
        stopLiveLayout();
        isDragging = true;
        movedWhileDragging = false;
        draggedNode = e.node;
        renderer.getCamera().disable();
    });

    renderer.getMouseCaptor().on('mousemovebody', (e) => {
        if (!isDragging || !draggedNode) return;
        const pos = renderer.viewportToGraph(e);
        graph.setNodeAttribute(draggedNode, 'x', pos.x);
        graph.setNodeAttribute(draggedNode, 'y', pos.y);
        movedWhileDragging = true;
    });

    renderer.getMouseCaptor().on('mouseup', () => {
        if (draggedNode) {
            isDragging = false;
            draggedNode = null;
            renderer.getCamera().enable();
        }
    });

    // --- Layout controls ---
    const relayoutButton = document.getElementById('relayout');
    const liveButton = document.getElementById('live-layout');
    let liveLayout = null;
    let liveTimer = null;

    function stopLiveLayout() {
        if (liveTimer) clearTimeout(liveTimer);
        liveTimer = null;
        if (liveLayout) {
            liveLayout.kill();
            liveLayout = null;
        }
        liveButton.setAttribute('aria-pressed', 'false');
        liveButton.textContent = 'Live layout';
    }
    signal.addEventListener('abort', stopLiveLayout);

    listen(relayoutButton, 'click', () => {
        stopLiveLayout();
        layout.random.assign(graph, { scale: 100 });
        layoutForceAtlas2.assign(graph, {
            iterations: 400,
            settings: layoutForceAtlas2.inferSettings(graph)
        });
        safeRefresh();
        renderer.getCamera().animatedReset({ duration: 300 });
    });

    // Animate the layout in a worker for a few seconds, so you can watch the network settle
    liveButton.disabled = graph.order > LIVE_LAYOUT_MAX_NODES;
    liveButton.title = liveButton.disabled ? 'Live layout is only available for networks up to 1,000 nodes.' : '';
    listen(liveButton, 'click', () => {
        if (liveLayout) {
            stopLiveLayout();
            return;
        }
        liveLayout = new FA2Layout(graph, { settings: layoutForceAtlas2.inferSettings(graph) });
        liveLayout.start();
        liveButton.setAttribute('aria-pressed', 'true');
        liveButton.textContent = 'Stop live layout';
        liveTimer = setTimeout(stopLiveLayout, LIVE_LAYOUT_SECONDS * 1000);
    });

    // --- Customize: Edge weights ---
    listen(document.getElementById('edge-weight'), 'change', function() {
        const showWeights = this.checked;
        graph.forEachEdge((edge, attrs) => {
            graph.setEdgeAttribute(edge, 'size', showWeights ? (attrs.originalWeight / 4 || 1) : 1);
        });
        safeRefresh();
    });
    // Make sure edge weight checkbox is checked if graph is weighted
    if (graphWeight === 'weighted') { document.getElementById('edge-weight').checked = true; }

    // --- Customize: Node labels ---
    listen(document.getElementById('node-label'), 'change', function() {
        renderer.setSetting('renderLabels', this.checked);
    });

    // --- Customize: Directed arrows ---
    listen(document.getElementById('directed-arrows'), 'change', function() {
        const showArrows = this.checked;
        graph.forEachEdge(edge => {
            graph.setEdgeAttribute(edge, 'type', showArrows ? 'arrow' : 'line');
        });
        safeRefresh();
    });
    // Make sure arrow checkbox is checked if graph is directed
    if (graphType === 'directed') { document.getElementById('directed-arrows').checked = true; }

    // --- Restore Zoom ---
    listen(document.getElementById('restore-zoom'), 'click', function() {
        if (!container.hidden && container.offsetWidth > 0) {
            renderer.getCamera().animatedReset();
        }
    });

    // --- Expose for cross-module access (downloads, resize after layout changes) ---
    app.sigma = renderer;
    app.graph = graph;
}
