// Adjacency Matrix network visualization (D3)
// Rows are sources and columns are targets; undirected edges fill both symmetric cells.
// `signal` is aborted when a new network is loaded, removing this visualization's listeners.
import { selection } from './selection.js';

// Labels get too small to read when a band is narrower than this (in SVG units)
const MIN_LABEL_BAND = 9;

export function drawMatrix(edgeList, nodeList, colorValues, graphType, graphWeight, signal) {
  const listen = (target, type, handler) => target.addEventListener(type, handler, { signal });

  const margin = { top: 200, right: 200, bottom: 200, left: 200 };
  const width = 1200 - margin.left;
  const height = 1200 - margin.top;

  // Which nodes are shown as rows and columns (a brushed zoom shows a subset)
  let rowNodes = nodeList;
  let colNodes = nodeList;
  let shownEdges = edgeList;
  let fullOrder = nodeList.map(d => d.id);
  let zoomed = false;

  // Create responsive SVG
  const svg = d3.select('#matrix-viz')
    .append("div")
    .classed("svg-container", true)
    .append('svg')
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 1400 1400")
    .classed("svg-content-responsive", true)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // Scales map node ids to positions
  const x = d3.scaleBand().range([0, width]).align(0);
  const y = d3.scaleBand().range([0, height]).align(0);

  // Container for legend
  svg.append("g")
    .attr("class", "legendLinear")
    .attr("transform", `translate(${width + 10},0)`);

  // Bands that follow the selected node (drawn under the brush, ignoring pointer events)
  const highlightRow = svg.append('rect').attr('class', 'highlight').attr('width', width).attr('fill', '#08B3E5').attr('fill-opacity', 0.18).attr('pointer-events', 'none').attr('display', 'none');
  const highlightCol = svg.append('rect').attr('class', 'highlight').attr('height', height).attr('fill', '#08B3E5').attr('fill-opacity', 0.18).attr('pointer-events', 'none').attr('display', 'none');

  // Brush for zooming: only over the cells, so the labels stay clickable
  const brush = d3.brush().extent([[0, 0], [width, height]]).on('end', brushed);
  let brushArea = null;

  // ---- colors: a light tint of the chosen cell color up to the full color
  const cellColorInput = document.getElementById('cell-color');
  let color;

  function makeColorScale() {
    const base = d3.color(cellColorInput.value) || d3.color('#08b3e5');
    const light = d3.rgb(
      Math.round(base.r + (255 - base.r) * 0.8),
      Math.round(base.g + (255 - base.g) * 0.8),
      Math.round(base.b + (255 - base.b) * 0.8)
    );
    color = d3.scaleLinear()
      .domain([0, d3.max(colorValues)])
      .range([light.formatRgb(), base.formatRgb()]);

    // Create and draw legend (unweighted networks only have one cell color, so no legend)
    const legend = svg.select(".legendLinear");
    legend.selectAll('*').remove();
    const values = colorValues.slice(1);
    if (graphWeight === 'weighted' && values.length > 1) {
      legend.call(d3.legendColor()
        .shapeWidth(50)
        .cells(values.length > 8 ? 5 : values)
        .scale(color)
        .labelOffset(40));
    }
  }

  const cellFill = d => d.weight === 0 ? 'white' : color(d.weight);

  // ---- drawing
  function draw() {
    x.domain(colNodes.map(d => d.id));
    y.domain(rowNodes.map(d => d.id));
    makeColorScale();

    // Build the matrix: one cell per (row node, column node)
    const cells = new Map(rowNodes.map(r => [r.id, new Map(colNodes.map(c => [c.id, { row: r.id, col: c.id, weight: 0 }]))]));
    shownEdges.forEach(edge => {
      const s = edge.source.id, t = edge.target.id;
      const cell = cells.get(s) && cells.get(s).get(t);
      if (cell) cell.weight = edge.weight;
      // Undirected edges fill the symmetric cell too
      if (graphType !== 'directed') {
        const mirror = cells.get(t) && cells.get(t).get(s);
        if (mirror) mirror.weight = edge.weight;
      }
    });

    svg.selectAll('.row, .column').remove();
    const showLabels = y.bandwidth() >= MIN_LABEL_BAND && x.bandwidth() >= MIN_LABEL_BAND;

    // Rows, with their cells and labels
    const row = svg.selectAll('.row')
      .data(rowNodes)
      .enter().append('g')
      .attr('class', 'row')
      .attr('transform', d => 'translate(0,' + y(d.id) + ')');

    row.append("line")
      .attr("x2", width)
      .style("stroke", '#f4f4f4');

    row.each(function (rowNode) {
      d3.select(this).selectAll('.matrix-cell')
        .data(colNodes.map(c => cells.get(rowNode.id).get(c.id)))
        .enter().append('rect')
        .attr('class', 'matrix-cell')
        .attr('x', d => x(d.col))
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .style('stroke', '#000000')
        .style('stroke-width', 0)
        .style('fill', cellFill);
    });

    row.append('text')
      .attr('class', 'row-label')
      .attr('x', -14)
      .attr('y', y.bandwidth() / 2)
      .attr('dy', '0.32em')
      .style('font-size', '1rem')
      .style('text-anchor', 'end')
      .style('cursor', 'pointer')
      .style('font-family', 'sans-serif')
      .attr('display', showLabels ? null : 'none')
      .text(d => d.id)
      .on('click', (event, d) => selection.select(d.id === selection.selected ? null : d.id));

    // Columns (rotated), with their labels
    const column = svg.selectAll('.column')
      .data(colNodes)
      .enter().append('g')
      .attr('class', 'column')
      .attr('transform', d => 'translate(' + x(d.id) + ', 0)rotate(-90)');

    column.append("line")
      .attr("x1", -width)
      .style("stroke", '#f4f4f4');

    column.append('text')
      .attr('class', 'column-label')
      .attr('x', 14)
      .attr('y', x.bandwidth() / 2)
      .attr('dy', '0.32em')
      .style('text-anchor', 'start')
      .style('cursor', 'pointer')
      .style('font-family', 'sans-serif')
      .attr('display', showLabels ? null : 'none')
      .text(d => d.id)
      .on('click', (event, d) => selection.select(d.id === selection.selected ? null : d.id));

    // Selection bands go above the cells, and the brush on top of everything
    highlightRow.raise();
    highlightCol.raise();
    if (brushArea) brushArea.remove();
    brushArea = svg.append('g');
    brushArea.call(brush);

    styleLabels();
  }

  // Label visibility/emphasis for the selection and the table search
  function styleLabels() {
    const selected = selection.selected;
    const opacity = d => selection.isVisible(d.id) ? '1' : '0';
    const showLabels = y.bandwidth() >= MIN_LABEL_BAND && x.bandwidth() >= MIN_LABEL_BAND;
    const display = d => showLabels || d.id === selected ? null : 'none';
    const weight = d => d.id === selected ? 'bold' : 'normal';

    svg.selectAll('.row-label').style('opacity', opacity).style('font-weight', weight).attr('display', display);
    svg.selectAll('.column-label').style('opacity', opacity).style('font-weight', weight).attr('display', display);

    const rowPos = selected !== null ? y(selected) : undefined;
    const colPos = selected !== null ? x(selected) : undefined;
    highlightRow
      .attr('display', rowPos === undefined ? 'none' : null)
      .attr('y', rowPos).attr('height', y.bandwidth());
    highlightCol
      .attr('display', colPos === undefined ? 'none' : null)
      .attr('x', colPos).attr('width', x.bandwidth());
  }

  // Reorder the full matrix by a node metric, name, or community
  function updateMatrix(orderValue, orderDirection) {
    let ordered;
    if (orderValue === 'original') {
      ordered = [...nodeList];
    } else if (orderValue === 'name') {
      ordered = [...nodeList].sort((a, b) => d3.ascending(a.id, b.id));
    } else if (orderValue === 'community') {
      // Blocks of communities (1 = largest first); within a block, highest degree first
      ordered = [...nodeList].sort((a, b) => a.community - b.community || b.degree - a.degree);
    } else {
      ordered = [...nodeList].sort((a, b) => b[orderValue] - a[orderValue]);
    }
    if (orderDirection) ordered.reverse();
    fullOrder = ordered.map(d => d.id);
    x.domain(fullOrder);
    y.domain(fullOrder);

    const t = svg.transition().duration(1500);
    t.selectAll(".row")
      .delay(d => y(d.id) * 4)
      .attr("transform", d => "translate(0," + y(d.id) + ")");
    t.selectAll(".matrix-cell")
      .delay(d => x(d.col) * 4)
      .attr("x", d => x(d.col));
    t.selectAll(".column")
      .delay(d => x(d.id) * 4)
      .attr("transform", d => "translate(" + x(d.id) + ")rotate(-90)");
    styleLabels();
  }

  // Handle controls for reordering the matrix
  const currentOrder = () => [
    document.getElementById('order-matrix-cells').value,
    document.getElementById('reverse-matrix-order').checked
  ];
  listen(document.getElementById('order-matrix-cells'), 'change', () => updateMatrix(...currentOrder()));
  listen(document.getElementById('reverse-matrix-order'), 'change', () => updateMatrix(...currentOrder()));

  // Recolor cells when the cell color changes (no redraw needed)
  listen(cellColorInput, 'input', () => {
    makeColorScale();
    svg.selectAll('.matrix-cell').style('fill', cellFill);
  });

  // When the graph is brushed, zoom to the nodes inside the brush selection
  function brushed(event) {
    if (!event.selection) return;
    const [[x0, y0], [x1, y1]] = event.selection;
    const inBand = (scale, lo, hi) => id => scale(id) + scale.bandwidth() > lo && scale(id) < hi;
    const byId = new Map(nodeList.map(d => [d.id, d]));
    const selectedCols = x.domain().filter(inBand(x, x0, x1)).map(id => byId.get(id));
    const selectedRows = y.domain().filter(inBand(y, y0, y1)).map(id => byId.get(id));
    brushArea.call(brush.move, null);
    if (selectedCols.length === 0 || selectedRows.length === 0) return;

    const rowIds = new Set(selectedRows.map(d => d.id));
    const colIds = new Set(selectedCols.map(d => d.id));
    rowNodes = selectedRows;
    colNodes = selectedCols;
    shownEdges = edgeList.filter(e =>
      (rowIds.has(e.source.id) && colIds.has(e.target.id)) ||
      (graphType !== 'directed' && rowIds.has(e.target.id) && colIds.has(e.source.id)));
    zoomed = true;
    document.getElementById('order-matrix-cells').disabled = true;
    document.getElementById('reverse-matrix-order').disabled = true;
    draw();
  }

  // Restore zoom to the original matrix, with the full node list in the current order
  listen(document.getElementById('restore-zoom'), 'click', () => {
    if (document.getElementById('matrix-viz').hidden || !zoomed) return;
    const byId = new Map(nodeList.map(d => [d.id, d]));
    rowNodes = colNodes = fullOrder.map(id => byId.get(id));
    shownEdges = edgeList;
    zoomed = false;
    document.getElementById('order-matrix-cells').disabled = false;
    document.getElementById('reverse-matrix-order').disabled = false;
    draw();
  });

  listen(selection, 'select', styleLabels);
  listen(selection, 'filter', styleLabels);

  draw();
}
