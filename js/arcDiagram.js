// Arc Diagram network visualization (D3)
// `signal` is aborted when a new network is loaded, removing this visualization's listeners.
import { app } from './state.js';
import { selection } from './selection.js';
import { appearance } from './appearance.js';
import { communityColor } from './palette.js';

const EDGE_COLOR = '#aaa';

export function drawArcDiagram(edgeList, nodeList, colorValues, graphType, graphWeight, signal) {
    const listen = (target, type, handler) => target.addEventListener(type, handler, { signal });

    // Initialize variables
    const originalList = [...nodeList];
    let graphDirection = document.querySelector("input[name='graphDirection']:checked").value;
    let hovered = null; // node under the mouse (mouse only; touch users tap to select)
    const margin = {
        top: -200,
        right: 75,
        bottom: 75,
        left: 100
    };

    // Create Responsive SVG
    const svg = d3.select('#arc-diagram-viz')
        .append("div")
        .classed("svg-container", true)
        .append('svg')
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "-50 -300 1600 1600")
        .classed("svg-content-responsive", true);

    const step = 16;
    const width = 1200 - margin.left;
    const height = 1200 - margin.left;
    const extent = [[margin.left, margin.top], [width - margin.right, height - margin.top]];

    // Create and call zoom for SVG
    const zoom = d3.zoom().extent(extent).scaleExtent([0.75, 4]).on('zoom', zoomed);
    svg.call(zoom);

    // Background: clicking empty space clears the selection
    svg.append('rect')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', 'transparent')
        .on('click', () => selection.clear());

    const container = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Nodes, labels and arcs grow when there are few nodes, so small networks stay readable
    const spacing = height / Math.max(1, nodeList.length - 1);
    const grow = Math.max(1, Math.min(3, spacing / 12));
    const labelFontSize = Math.max(8, Math.min(20, spacing * 0.6));

    // A linear scale for node size (shared radius is 15-50)
    const size = d3.scaleLinear()
        .domain([15, 50])
        .range([3 * grow, 6 * grow]);

    // Scales for horizontal (x) or vertical (y) orientation
    const x = d3.scalePoint()
        .domain(nodeList.map(d => d.id))
        .range([0, width]);

    const y = d3.scalePoint()
        .domain(nodeList.map(d => d.id))
        .range([0, height]);

    // Positions for the current orientation
    const labelTransform = d => graphDirection === 'vertical'
        ? `translate(${margin.left},${y(d.id)})rotate(0)`
        : `translate(${x(d.id)}, ${height - margin.left})rotate(-45)`;
    const nodeTransform = d => graphDirection === 'vertical'
        ? `translate(${margin.left},${y(d.id)})`
        : `translate(${x(d.id)}, ${height - margin.left})`;
    const overlayTransform = d => graphDirection === 'vertical'
        ? `translate(${margin.left - 90},${y(d.id) - 8})rotate(0)`
        : `translate(${x(d.id) - 90}, ${height - margin.left + 80})rotate(-45)`;
    const overlayWidth = () => graphDirection === 'vertical' ? margin.left + 40 : margin.left + 50;

    // Create labels
    const labelsDiv = container.append("g")
        .style("font-family", "sans-serif")
        .style("font-size", `${labelFontSize}px`)
        .attr("text-anchor", "end")
        .attr("id", "labels");

    const label = labelsDiv.selectAll("text")
        .data(nodeList)
        .enter().append("text")
            .attr("x", -16)
            .attr("fill", '#333')
            .text(d => d.id)
            .attr("transform", labelTransform)
            .attr("y", graphDirection === 'vertical' ? "0.35em" : 10);

    // Create container and circles for nodes
    const nodesDiv = container.append("g")
        .style("font-family", "sans-serif")
        .style("font-size", "8px")
        .attr("text-anchor", "end")
        .attr("id", "nodes");

    const node = nodesDiv.selectAll("circle")
        .data(nodeList)
        .enter().append("circle")
            .classed("node-arc", true)
            .attr("r", d => size(appearance.radius(d)))
            .attr("fill", d => appearance.color(d))
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .attr("transform", nodeTransform);

    // Create container and paths for arcs (edges)
    const arcsDiv = container.insert("g", "*")
        .attr("fill", "none")
        .style("stroke-opacity", 0.6)
        .style("stroke-width", 1.5 * Math.min(grow, 2))
        .attr("id", "arcs");

    const path = arcsDiv.selectAll("path")
        .data(edgeList)
        .enter().append("path")
            .classed("arc", true)
            .style("stroke", pathColor)
            .attr("d", arc);

    // Create overlays to handle mouse events
    const overlaysDiv = container.append("g")
        .attr("class", "overlays")
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .attr("id", "overlays");

    const overlay = overlaysDiv.selectAll("rect")
        .data(nodeList)
        .enter().append("rect")
            .attr("height", step)
            .attr("width", overlayWidth())
            .style("cursor", "pointer")
            .attr("transform", overlayTransform);

    // Hover (mouse only) highlights neighbors; click or tap selects a node
    [overlay, node].forEach(selectionOfElements => {
        selectionOfElements
            .on("pointerenter", (event, d) => {
                if (event.pointerType !== 'mouse') return;
                hovered = d.id;
                styleAll();
            })
            .on("pointerleave", () => {
                hovered = null;
                styleAll();
            })
            .on("click", (event, d) => {
                event.stopPropagation();
                selection.select(d.id === selection.selected ? null : d.id);
            });
    });

    // Edges are tinted by community when nodes are colored by community and both ends match
    function pathColor(d) {
        if (appearance.colorBy === 'community' && d.source.community === d.target.community) {
            return communityColor(d.source.community, appearance.communitySizes);
        }
        return EDGE_COLOR;
    }

    // Coordinates for drawing arcs
    function arc(d) {
        if (graphDirection === 'vertical') {
            const y1 = y(d.source.id);
            const y2 = y(d.target.id);
            const r = Math.abs(y2 - y1) / 2;
            return `M${margin.left},${y1}A${r},${r} 0,0,${y1 < y2 ? 1 : 0} ${margin.left},${y2}`;
        } else {
            const x1 = x(d.source.id);
            const x2 = x(d.target.id);
            const r = Math.abs(x2 - x1) / 2;
            return `M${x1} ${height - margin.left} A ${r},${r} 0 0,${x1 < x2 ? 1 : 0} ${x2},${height - margin.left}`;
        }
    }

    // Apply selection, hover, table search, and edge-attribute filter to every element
    let nearCache = { focus: null, ids: null };
    function nearIds(focus) {
        if (nearCache.focus !== focus) {
            nearCache = { focus, ids: new Set([focus, ...app.G.neighbors(focus)]) };
        }
        return nearCache.ids;
    }

    function styleAll() {
        const focus = hovered !== null ? hovered : selection.selected;
        const near = focus !== null && app.G.hasNode(focus) ? nearIds(focus) : null;

        const nodeOpacity = d => {
            if (!selection.isVisible(d.id)) return 0;
            if (!selection.passesAttrFilter(d.id)) return 0.1;
            return near && !near.has(d.id) ? 0.25 : 1;
        };
        node.style('opacity', nodeOpacity);
        label
            .style('opacity', nodeOpacity)
            .style('font-weight', d => d.id === selection.selected ? 'bold' : 'normal')
            .attr('fill', d => d.id === focus ? '#000' : '#333');

        path
            .style('stroke', d => near && (d.source.id === focus || d.target.id === focus) ? '#333' : pathColor(d))
            .style('stroke-opacity', d => {
                if (!selection.isVisible(d.source.id) || !selection.isVisible(d.target.id)) return 0;
                if (selection.attrFilter && !selection.attrFilter.test(d)) return 0.08;
                if (near) return d.source.id === focus || d.target.id === focus ? 1 : 0.1;
                return 0.6;
            });
    }

    listen(selection, 'select', styleAll);
    listen(selection, 'filter', styleAll);
    listen(selection, 'attrfilter', styleAll);

    // Shared node appearance (size and color)
    listen(appearance, 'change', () => {
        node.attr('r', d => size(appearance.radius(d))).attr('fill', d => appearance.color(d));
        styleAll(); // edge tints depend on the color setting
    });

    // Handle movement of arcs when graph updates
    function updateArc(orderValue, orderDirection) {
        let updatedNodeList;
        if (orderValue === 'original') {
            updatedNodeList = [...originalList];
        } else {
            // Ascending by name, or by the metric's value (communities: 1 = largest first)
            const key = orderValue === 'name' ? 'id' : orderValue;
            updatedNodeList = [...nodeList].sort((a, b) => key === 'id' ? d3.ascending(a.id, b.id) : a[key] - b[key]);
        }
        if (orderDirection) updatedNodeList.reverse();
        y.domain(updatedNodeList.map(d => d.id));
        x.domain(updatedNodeList.map(d => d.id));

        const t = container.transition()
            .duration(750);

        label.transition(t)
            .delay((d, i) => i * 20)
            .attr("transform", labelTransform)
            .attr("y", graphDirection === 'vertical' ? "0.35em" : 10);

        node.transition(t)
            .delay((d, i) => i * 20)
            .attr("transform", nodeTransform);

        path.transition(t)
            .delay((d, i) => i * 10)
            .attrTween("d", d => () => arc(d));

        overlay.transition(t)
            .delay((d, i) => i * 20)
            .attr("width", overlayWidth())
            .attr("transform", overlayTransform);
    }

    // Controls for node order and graph orientation
    const currentOrder = () => [
        document.getElementById('order-arc-nodes').value,
        document.getElementById('reverse-arc-order').checked
    ];
    listen(document.getElementById('order-arc-nodes'), 'change', () => updateArc(...currentOrder()));
    listen(document.getElementById('reverse-arc-order'), 'change', () => updateArc(...currentOrder()));
    document.querySelectorAll("input[name='graphDirection']").forEach(radio => {
        listen(radio, 'change', () => {
            graphDirection = document.querySelector("input[name='graphDirection']:checked").value;
            updateArc(...currentOrder());
        });
    });

    // Zooming translates the size of the svg container (the base translate is kept so that
    // "Restore zoom" returns to exactly the starting view)
    function zoomed(event) {
        const transform = event.transform;
        if (graphDirection === 'vertical') {
            transform.x = 0;
        } else {
            transform.y = Math.min(0, transform.y);
        }
        container.attr("transform", `translate(${margin.left},${margin.top}) ${transform.toString()}`);
    }

    // Restore to original zoom
    listen(document.getElementById('restore-zoom'), 'click', () => {
        if (!document.getElementById('arc-diagram-viz').hidden) {
            svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        }
    });

    // Apply any table search that is already active
    styleAll();
}
