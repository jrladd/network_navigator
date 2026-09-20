import { drawMatrix } from './matrix.js';
import { drawForceLayout } from './forceLayout.js';
import { drawArcDiagram } from './arcDiagram.js';
import { drawHist } from './hist.js';
import { addEdgeAttributeDropdown } from './edgeAttribute.js';
import * as metrics from './metrics.js';


// Define global variables
let nodeList, edgeList, G, selectedGraph, degree, betweenness, eigenvector, clustering, colorValues, graphType, graphWeight, numberOfNodes, numberOfEdges, densityVal, averageDegree, averageClusteringVal, transitivityVal;

// Aborted on every "Navigate" so listeners from the previous network's visualizations go away
let vizController = new AbortController();

const divs = ['#matrix-viz', '#force-layout-viz','#arc-diagram-viz'];

// Allow drag and drop on textarea
const textarea = document.querySelector('textarea');
textarea.addEventListener('dragover', function (e) {
  e.preventDefault();
  e.stopPropagation();
});

textarea.addEventListener('drop', function (e) {
  e.preventDefault();
  e.stopPropagation();
  var files = e.dataTransfer.files;
  if (files.length === 0) return;
  var reader = new FileReader();
  reader.onload = function (ev) {
    textarea.value = ev.target.result;
  }
  // Only the first file is used; one FileReader can't read several files at once
  reader.readAsText(files[0]);
});

// Toggle instructions
document.getElementById('close-icon').addEventListener('click', function (e) {
  e.preventDefault();
  document.getElementById('instructions').style.display = 'none';
  document.getElementById('close-icon').style.display = 'none';
  document.getElementById('info-icon').style.display = 'inline';
});

document.getElementById('info-icon').addEventListener('click', function (e) {
  e.preventDefault();
  document.getElementById('instructions').style.display = 'block';
  document.getElementById('info-icon').style.display = 'none';
  document.getElementById('close-icon').style.display = 'inline';
});

// Toggle histogram
document.getElementById('show-hist').addEventListener('click', function (e) {
  e.preventDefault();
  const container = document.getElementById('hist-container');
  container.style.display = container.style.display === 'none' ? 'block' : 'none';
});

// Manage side-by-side collapsing metrics/viz panels
document.getElementById('metrics-collapse').addEventListener('click', function (e) {
	let metricsEl = document.querySelector('#metrics');
	let vizEl = document.querySelector('#viz');
	if (!metricsEl.classList.contains('w-50-ns')) {
		metricsEl.classList.add('w-50-ns');
		metricsEl.classList.add('br');
		vizEl.classList.remove('width-collapse');
		document.getElementById('viz-off').style.display = 'none';
		document.getElementById('viz-on').style.display = 'inline';
		document.querySelector('#metrics-collapse em').textContent = 'collapse';
		window.setTimeout(function() {table.redraw(true)}, 500);
	}
	else if (metricsEl.classList.contains('width-collapse')) {
		metricsEl.classList.remove('width-collapse');
		vizEl.classList.add('w-50-ns');
		metricsEl.classList.add('br');
		document.getElementById('metric-off').style.display = 'none';
		document.getElementById('metric-on').style.display = 'inline';
		document.querySelector('#metrics-collapse em').textContent = 'collapse';
		window.setTimeout(function() {table.redraw(true)}, 500);
	} else {
		metricsEl.classList.add('width-collapse');
		vizEl.classList.remove('w-50-ns');
		document.getElementById('metric-on').style.display = 'none';
		document.getElementById('metric-off').style.display = 'inline';
		document.querySelector('#metrics-collapse em').textContent = 'expand';
		window.setTimeout(function() {table.redraw(true)}, 500);
	}
});

document.getElementById('viz-collapse').addEventListener('click', function (e) {
	let vizEl = document.querySelector('#viz');
	let metricsEl = document.querySelector('#metrics');
	if (!vizEl.classList.contains('w-50-ns')) {
		vizEl.classList.add('w-50-ns');
		metricsEl.classList.remove('width-collapse');
		metricsEl.classList.add('br');
		document.getElementById('metric-off').style.display = 'none';
		document.getElementById('metric-on').style.display = 'inline';
		document.querySelector('#viz-collapse em').textContent = 'collapse';
		window.setTimeout(function() {table.redraw(true)}, 500);
	}
	else if (vizEl.classList.contains('width-collapse')) {
		vizEl.classList.remove('width-collapse');
		metricsEl.classList.add('w-50-ns');
		metricsEl.classList.add('br');
		document.getElementById('viz-off').style.display = 'none';
		document.getElementById('viz-on').style.display = 'inline';
		document.querySelector('#viz-collapse em').textContent = 'collapse';
		window.setTimeout(function() {table.redraw(true)}, 500);
	} else {
		vizEl.classList.add('width-collapse');
		metricsEl.classList.remove('w-50-ns');
		metricsEl.classList.remove('br');
		document.getElementById('viz-on').style.display = 'none';
		document.getElementById('viz-off').style.display = 'inline';
		document.querySelector('#viz-collapse em').textContent = 'expand';
		window.setTimeout(function() {table.redraw(true)}, 500);
	}
});

// Handle collapse for customize graph form
document.getElementById('customize-form').addEventListener('click', function(e) {
  e.stopPropagation();
});

const customizePanels = ['force-layout', 'arc-diagram', 'adjacency-matrix'];

function customizeIsOpen() {
  return document.getElementById('customize').classList.contains('customize-expand');
}

// Show only the panel for the selected visualization (when the form is open)
function showCustomizePanel() {
  const open = customizeIsOpen();
  const selectedDiv = selectedGraph ? selectedGraph.toLowerCase().replaceAll(' ', '-') : null;
  customizePanels.forEach(id => {
    document.getElementById(id).style.display = open && id === selectedDiv ? 'flex' : 'none';
  });
  document.getElementById('customize-form').style.display = open ? 'block' : 'none';
}

// Collapse the customize form back to its initial state
function resetCustomize() {
  document.getElementById('customize').classList.remove('customize-expand');
  document.getElementById('open-customize-form').classList.remove('dn');
  const customizeClose = document.getElementById('close-customize-form');
  customizeClose.classList.add('dn');
  customizeClose.classList.remove('flex');
  showCustomizePanel();
}

document.getElementById('customize').addEventListener('click', function () {
  if (!selectedGraph) return;
  let customizeOpen = document.getElementById('open-customize-form');
  let customizeClose = document.getElementById('close-customize-form');
  this.classList.toggle('customize-expand');
  customizeOpen.classList.toggle('dn');
  customizeClose.classList.toggle('dn');
  customizeClose.classList.toggle('flex');
  showCustomizePanel();
});

// Track which visualizations have been drawn
const drawnVisualizations = {
  force: false,
  arc: false,
  matrix: false
};

// Draw each graph type when it is selected by user
function drawGraphs(selectedGraph) {
  const signal = vizController.signal;
  divs.map(div => {
    let el = document.querySelector(div);
    let splitDiv = div.split('-').map(d => d.replace('#', ''));
    let filteredDiv = splitDiv.filter(d => selectedGraph.toLowerCase().split(' ').includes(d));
    if (filteredDiv.length > 0) {
      el.style.padding = '.5rem';
      el.style.height = '100%';
      el.style.width = '100%';
      el.style.visibility = 'visible';

      // Check if we need to draw the visualization
      if (filteredDiv.includes('matrix') && !drawnVisualizations.matrix) {
        drawMatrix(edgeList, nodeList, colorValues, graphType, graphWeight, signal);
        drawnVisualizations.matrix = true;
      }
      if (filteredDiv.includes('force') && !drawnVisualizations.force) {
        drawForceLayout(edgeList, nodeList, colorValues, graphType, graphWeight, signal);
        drawnVisualizations.force = true;
      }
      if (filteredDiv.includes('arc') && !drawnVisualizations.arc) {
        drawArcDiagram(edgeList, nodeList, colorValues, graphType, graphWeight, signal);
        drawnVisualizations.arc = true;
      }

      // Redraw Sigma in case its state changed while it was hidden
      if (filteredDiv.includes('force') && window._sigmaInstance) window._sigmaInstance.refresh();

      // Reload edge attribute filters when switching visualizations
      if (filteredDiv.includes('force')) addEdgeAttributeDropdown(edgeList, 'force-layout');
      if (filteredDiv.includes('arc')) addEdgeAttributeDropdown(edgeList, 'arc-diagram');
    } else {
      el.style.visibility = 'hidden';
      el.style.padding = '0';
      el.style.height = '0';
      el.style.border = '0';
      el.style.width = '0';
    }
  });
  showCustomizePanel();
}

// Check if graph selected
document.getElementById('selected-graph').addEventListener('click', function (e) {
  const choice = e.target.text;
  // Ignore clicks on the gaps between the buttons
  if (choice && selectedGraph !== choice) {
    selectedGraph = choice;
    drawGraphs(selectedGraph);
  }
});

// Download visualizations
function getDownloadURL(svg, filename, callback) {
  let height = parseInt(svg.style("height").split('px')[0]) + 1000;
  let width = parseInt(svg.style("width").split('px')[0]) + 1000;
  let canvas;
  let doctype = '<?xml version="1.0" standalone="no"?>' + '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

  // serialize our SVG XML to a string.
  let source = (new XMLSerializer()).serializeToString(svg.node());
  source = source.replace('<svg', `<svg height="${height}" width="${width}"`);
  // create a file blob of our SVG.
  const blob = new Blob([doctype + source], {
    type: 'image/svg+xml;charset=utf-8'
  });

  const url = window.URL.createObjectURL(blob);
  let image = d3.select('body').append('img')
    .style('display', 'none')
    .attr('width', width)
    .attr('height', height)
    .node();

  image.src = url;

  image.onerror = function () {
    callback(new Error('An error occurred while attempting to load SVG'));
  };
  image.onload = function () {
    canvas = d3.select('body').append('canvas')
      .style('display', 'none')
      .attr('width', width)
      .attr('height', height)
      .node();
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0);

    let a = document.createElement('a');
    a.download = `${filename}_visualization.png`;
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    d3.selectAll([canvas, image]).remove();
  };
}

function updateDownloadURL(svg, filename) {
  getDownloadURL(svg, filename, function (error) {
    if (error) {
      console.error(error);
    }
  });
}

const form = document.querySelector('#download-form')
form.addEventListener('submit', event => {
  event.preventDefault()
  if (!G) return;
  let downloadType = document.querySelector("#download-type");
  switch (downloadType.value) {
	  case 'viz-png':
		  if (selectedGraph === 'Force Layout') {
			  // Sigma canvas-based export

			  // First check if force layout has been drawn
			  if (!drawnVisualizations.force) {
				  alert('Force layout has not been generated yet. Please navigate to the Force Layout view first.');
				  break;
			  }

			  if (window._sigmaInstance) {
				  try {
					  // Force Sigma to re-render to ensure WebGL buffers are populated
					  window._sigmaInstance.refresh();

					  // Sigma renders directly into #force-layout-viz (no wrapper element)
					  const container = document.querySelector('#force-layout-viz');

					  if (!container) {
						  alert('Force layout container not found.');
						  break;
					  }

					  // Get all canvases directly from the force-layout-viz container
					  const canvases = container.querySelectorAll('canvas');
					  if (canvases.length === 0) {
						  alert('No canvas elements found in force layout. Please refresh and try again.');
						  break;
					  }

					  // Merge only the visual layers (not the hover/mouse layers) at Sigma's pixel-ratio resolution
					  const visualLayers = ['sigma-edges', 'sigma-edgeLabels', 'sigma-nodes', 'sigma-labels'];
					  const visualCanvases = Array.from(canvases).filter(canvas =>
						  visualLayers.includes(canvas.className)
					  );

					  const w = canvases[0].width;
					  const h = canvases[0].height;
					  const mergedCanvas = document.createElement('canvas');
					  mergedCanvas.width = w;
					  mergedCanvas.height = h;
					  const ctx = mergedCanvas.getContext('2d');

					  // White background
					  ctx.fillStyle = '#FFFFFF';
					  ctx.fillRect(0, 0, w, h);

					  visualCanvases.forEach(canvas => ctx.drawImage(canvas, 0, 0));

					  // Download
					  const a = document.createElement('a');
					  a.download = 'force_layout_visualization.png';
					  a.href = mergedCanvas.toDataURL('image/png');
					  document.body.appendChild(a);
					  a.click();
					  document.body.removeChild(a);
				  } catch (err) {
					  console.error('Error exporting force layout:', err);
					  alert('Error exporting force layout: ' + err.message);
				  }
			  } else {
				  alert('Force layout not initialized. Please generate the visualization first.');
			  }
		  } else {
			  divs.map(div => {
				  let splitDiv = div.split('-').map(d => d.replace('#', ''));
				  let filteredDiv = splitDiv.filter(d => selectedGraph.toLowerCase().split(' ').includes(d));
				  if (filteredDiv.length > 0) {
					  updateDownloadURL(d3.selectAll(`${div} svg`), selectedGraph.toLowerCase().replaceAll(' ', '_'));
				  }
			  });
		  }
		  break;
	  case 'viz-svg':
		  if (selectedGraph === 'Force Layout') {
			  alert('SVG export is not available for the force layout visualization. Please use PNG export instead.');
		  } else {
			  divs.map(div => {
				  let splitDiv = div.split('-').map(d => d.replace('#', ''));
				  let filteredDiv = splitDiv.filter(d => selectedGraph.toLowerCase().split(' ').includes(d));
				  if (filteredDiv.length > 0) {
					  var serializer = new XMLSerializer();
					  var xmlString = serializer.serializeToString(d3.select(`${div} svg`).node());
					  var imgData = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xmlString);
					  let filename = selectedGraph.toLowerCase().replaceAll(' ', '_');
					  let a = document.createElement('a');
					  a.download = `${filename}_visualization.svg`;
					  a.href = imgData;
					  document.body.appendChild(a);
					  a.click();
					  document.body.removeChild(a);
				  }
			  });
		  }
		  break;
	  case 'hist':
		  let filename = 'histogram_' + document.querySelector('input[name="histType"]:checked').value;
		  updateDownloadURL(d3.selectAll(`#hist`), filename);
		  break;
	  case 'metrics':
                  let text = `Global Network Metrics:

Total Nodes: ${numberOfNodes}
Total Edges: ${numberOfEdges}
Average Degree: ${averageDegree.toFixed(4)}
Density: ${densityVal.toFixed(4)}
Avg. Clustering Coefficient: ${averageClusteringVal}
Transitivity: ${transitivityVal.toFixed(4)}

Looking for node-level metrics? Click "Download as CSV" next to the data table on the main Network Navigator page.`
                  let a = document.createElement('a');
                  a.download = `global_network_metrics.txt`;
                  a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
  };
})

// Initialize Tabulator for metrics
var table = new Tabulator('#metrics-table', {
	height: "400px",
	layout: "fitDataStretch",
	data: [],
	columns: [
		{title: "Node ID", field: "nodeId", headerFilter: "input"},
		{title: "Degree", field: "degree", sorter: "number", headerSort: true},
		{title: "Betweenness Centrality", field: "betweenness", sorter: "number", headerSort: true},
		{title: "Eigenvector Centrality", field: "eigenvector", sorter: "number", headerSort: true},
		{title: "Clustering Coefficient", field: "clustering", sorter: "number", headerSort: true}
	],
	initialSort: [
		{column: "degree", dir: "desc"}
	]
});

// Add copy to clipboard functionality
document.getElementById('copy-table').addEventListener('click', function() {
	try {
		// Get all data from table
		const data = table.getData();

		// Create header row
		const headers = ['Node ID', 'Degree', 'Betweenness Centrality', 'Eigenvector Centrality', 'Clustering Coefficient'];

		// Create CSV format
		let csv = headers.join('\t') + '\n';
		data.forEach(row => {
			csv += `${row.nodeId}\t${row.degree}\t${row.betweenness}\t${row.eigenvector}\t${row.clustering}\n`;
		});

		// Copy to clipboard
		navigator.clipboard.writeText(csv).then(() => {
			// Show success feedback
			const btn = document.getElementById('copy-table');
			const originalText = btn.textContent;
			btn.textContent = 'Copied!';
			setTimeout(() => {
				btn.textContent = originalText;
			}, 2000);
		}).catch(err => {
			console.error('Failed to copy:', err);
			alert('Failed to copy to clipboard. Please try again or use the CSV download button.');
		});
	} catch (err) {
		console.error('Error copying table:', err);
		alert('Failed to copy to clipboard. Please try again or use the CSV download button.');
	}
});

// Add CSV download functionality
document.getElementById('download-csv').addEventListener('click', function() {
	table.download("csv", "network_metrics.csv");
});


// Thrown for problems with the user's data (as opposed to bugs)
class DataError extends Error {}

// Parse pasted data into a de-duplicated list of edges: {source, target, weight, ...extra columns}.
// Duplicate edges (and, for undirected networks, reversed duplicates) are merged; the last one wins.
function parseEdges(text, hasHeader, directed, weighted) {
  const rows = [];

  if (hasHeader) {
    const parsed = d3.csvParse(text);
    const columns = (parsed.columns || []).map(c => c.trim().toLowerCase());
    if (!columns.includes('source') || !columns.includes('target')) {
      throw new DataError('With "Header Row?" checked, your data needs columns named "source" and "target" (and "weight" for weighted networks).');
    }
    parsed.forEach((d, i) => {
      const row = {};
      parsed.columns.forEach((c, j) => { row[columns[j]] = d[c]; });
      const blank = Object.values(row).every(v => v === undefined || String(v).trim() === '');
      if (blank) return;
      rows.push({ row, line: i + 2 });
    });
  } else {
    d3.csvParseRows(text).forEach((cells, i) => {
      if (cells.every(c => c.trim() === '')) return;
      if (cells.length < 2 || (weighted && cells.length < 3) || cells.length > 3) {
        throw new DataError(`Row ${i + 1} has ${cells.length} value${cells.length === 1 ? '' : 's'}.`);
      }
      rows.push({ row: { source: cells[0], target: cells[1], weight: cells[2] }, line: i + 1 });
    });
  }

  const edges = new Map();
  rows.forEach(({ row, line }) => {
    const source = String(row.source ?? '').trim();
    const target = String(row.target ?? '').trim();
    if (source === '' || target === '') {
      throw new DataError(`Row ${line} is missing a source or target.`);
    }
    let weight = 1;
    if (weighted) {
      weight = Number(row.weight);
      if (row.weight === undefined || String(row.weight).trim() === '' || isNaN(weight)) weight = 1;
    }
    const key = (directed || source <= target) ? `${source}\u0000${target}` : `${target}\u0000${source}`;
    edges.set(key, { ...row, source, target, weight });
  });
  return [...edges.values()];
}

// Show a problem with the user's data
function showRowError(message) {
  document.getElementById('row-error-detail').textContent = message || '';
  document.getElementById('row-error').style.display = 'block';
}

// Hide results (used when a new Navigate fails, so stale results don't linger)
function hideResults() {
  ['metrics', 'viz', 'buttons'].forEach(id => { document.getElementById(id).style.display = 'none'; });
}

// Put all customize controls back to their defaults for a new network
function resetControls() {
  const defaults = {
    'centrality': 'degree', 'color-scale': 'none',
    'centrality-arc': 'degree', 'color-scale-arc': 'none',
    'order-arc-nodes': 'original', 'order-matrix-cells': 'original'
  };
  Object.entries(defaults).forEach(([id, value]) => { document.getElementById(id).value = value; });
  ['reverse-arc-order', 'reverse-matrix-order'].forEach(id => {
    const el = document.getElementById(id);
    el.checked = false;
    el.disabled = false;
  });
  document.getElementById('vertical').checked = true;
  document.getElementById('edge-weight').checked = false;
  document.getElementById('directed-arrows').checked = false;
  document.getElementById('degree').checked = true;
}

// Disable metric choices that aren't available for this network
// (eigenvector centrality may not converge; clustering isn't defined for directed graphs)
function syncMetricOptions() {
  const available = { degree: true, betweenness: true, eigenvector: !!eigenvector, clustering: !!clustering };
  ['centrality', 'color-scale', 'centrality-arc', 'color-scale-arc', 'order-arc-nodes', 'order-matrix-cells'].forEach(id => {
    Array.from(document.getElementById(id).options).forEach(option => {
      if (option.value in available) {
        option.disabled = !available[option.value];
        option.hidden = !available[option.value];
      }
    });
  });
  document.querySelectorAll('input[name="histType"]').forEach(radio => {
    radio.disabled = !available[radio.value];
    document.querySelector(`label[for="${radio.id}"]`).style.opacity = available[radio.value] ? '1' : '0.4';
  });
}

// Rank nodes by metric value (1 = highest)
function rankNodes(dict) {
  const ranks = new Map();
  reverse_sort(dict).forEach((node, i) => ranks.set(node, i + 1));
  return ranks;
}

function formatWithRank(value, rank) {
  return `${value.toFixed(4)} (${rank})`;
}

async function navigate() {
  // Tear down the previous network's visualizations and their listeners
  vizController.abort();
  vizController = new AbortController();
  if (window._sigmaInstance) {
    window._sigmaInstance.kill();
  }
  window._sigmaInstance = null;
  window._graphologyInstance = null;
  window._edgeAttrFilteredNodes = null;

  Object.keys(drawnVisualizations).forEach(key => { drawnVisualizations[key] = false; });
  divs.forEach(div => { document.querySelector(div).innerHTML = ''; });
  document.querySelectorAll('[id^="attribute-section-"], [id^="edge-attr-container-"]').forEach(el => el.remove());
  document.getElementById('row-error').style.display = 'none';
  document.getElementById('eigen-error').style.display = 'none';
  document.getElementById('viz-warning').style.display = 'none';
  document.getElementById('info-panel').innerHTML = '';
  try { table.clearHeaderFilter(); } catch (err) { /* table not ready yet */ }
  G = null;
  selectedGraph = 'Force Layout';
  resetControls();
  resetCustomize();

  // Read the user's options and data
  const data = document.querySelector('textarea').value;
  graphType = document.querySelector("input[name='graphType']:checked").value;
  graphWeight = document.querySelector("input[name='graphWeight']:checked").value;
  const hasHeader = document.getElementById('headerRow').checked;

  // Build the graphology graph
  let edges;
  try {
    edges = parseEdges(data, hasHeader, graphType === 'directed', graphWeight === 'weighted');
    if (edges.length === 0) {
      throw new DataError('No edges found. Paste or drop an edge list above.');
    }
  } catch (err) {
    if (!(err instanceof DataError)) throw err;
    console.warn(err.message);
    showRowError(err.message);
    hideResults();
    return;
  }

  const GraphClass = graphType === 'undirected' ? graphology.UndirectedGraph : graphology.DirectedGraph;
  G = new GraphClass();
  edges.forEach(edge => {
    G.mergeEdge(edge.source, edge.target, graphWeight === 'weighted' ? { weight: edge.weight } : undefined);
  });

  // Calculate metrics with graphology
  const result = metrics.computeMetrics(G, { weighted: graphWeight === 'weighted' });
  degree = result.degree;
  betweenness = result.betweenness;
  eigenvector = result.eigenvector;
  clustering = result.clustering;
  densityVal = result.density;
  averageDegree = result.averageDegree;
  averageClusteringVal = result.averageClustering === null ? 'N/A' : result.averageClustering.toFixed(4);
  transitivityVal = result.transitivity;
  numberOfNodes = G.order;
  numberOfEdges = G.size;
  if (!eigenvector) {
    document.getElementById('eigen-error').style.display = 'block';
  }

  const betweennessRanks = rankNodes(betweenness);
  const eigenvectorRanks = eigenvector ? rankNodes(eigenvector) : null;
  const clusteringRanks = clustering ? rankNodes(clustering) : null;

  colorValues = [...new Set(edges.map(edge => edge.weight))];
  colorValues.push(0);
  colorValues.sort((a, b) => a - b);

  // Node data for the table and the visualizations
  const tableData = [];
  nodeList = [];
  G.forEachNode(function (node) {
    const item = { id: node, degree: degree[node], betweenness: betweenness[node] };
    if (eigenvector) item.eigenvector = eigenvector[node];
    if (clustering) item.clustering = clustering[node];
    nodeList.push(item);

    tableData.push({
      nodeId: node,
      degree: degree[node],
      betweenness: formatWithRank(betweenness[node], betweennessRanks.get(node)),
      eigenvector: eigenvector ? formatWithRank(eigenvector[node], eigenvectorRanks.get(node)) : 'N/A',
      clustering: clustering ? formatWithRank(clustering[node], clusteringRanks.get(node)) : 'N/A'
    });
  });

  // Scales for node radius and font size, for each available metric
  ['degree', 'eigenvector', 'betweenness', 'clustering'].forEach(size => {
    if (!nodeList.some(node => node.hasOwnProperty(size))) return;
    const domain = d3.extent(nodeList, d => d[size]);
    const centralitySize = d3.scaleLinear().domain(domain).range([15, 50]);
    const fontSize = d3.scaleLinear().domain(domain).range([20, 30]);
    nodeList.forEach(node => {
      node[`radius_${size}`] = centralitySize(node[size]);
      node[`fontSize_${size}`] = fontSize(node[size]);
    });
  });

  // Embed node objects as edge source and target, and scale edge widths
  const idToNode = {};
  nodeList.forEach(n => { idToNode[n.id] = n; });
  const edgeWidth = d3.scaleLinear()
    .domain(d3.extent(edges, d => d.weight))
    .range([3, 20]);
  edgeList = edges.map(e => ({
    ...e,
    source: idToNode[e.source],
    target: idToNode[e.target],
    scaled_weight: edgeWidth(e.weight)
  }));

  syncMetricOptions();

  // Add metrics to Tabulator and page, display all
  await table.setData(tableData);
  const tabulatorSearchInput = document.querySelector('.tabulator-header-filter input');
  if (tabulatorSearchInput) tabulatorSearchInput.placeholder = 'Find a Node ID';
  document.getElementById('metrics').style.display = 'block';
  document.getElementById('viz').style.display = 'block';
  document.getElementById('buttons').style.display = 'block';
  document.getElementById('metric-off').style.display = 'none';
  document.getElementById('viz-off').style.display = 'none';

  let allInfo = `
    <div class="fl w-50-l w-100 mv2">
    Total Nodes: ${numberOfNodes}<br/>
    Total Edges: ${numberOfEdges}<br/>
    Average Degree: ${averageDegree.toFixed(4)}<br/>
    </div>
    <div class="fl w-50-l w-100 mv2">
    Density: ${densityVal.toFixed(4)}<br/>
    Avg. Clustering Coefficient: ${averageClusteringVal}<br/>
    Transitivity: ${transitivityVal.toFixed(4)}<br/>
    </div>
    `;
  if (graphType === 'directed') {
    allInfo += `<div class='fl w-100 tc pa2 br4 ba b--gold bg-light-yellow gold'>Clustering coefficients cannot be calculated for directed graphs.</div>`;
  }
  document.getElementById('info-panel').innerHTML = allInfo;
  selectHist();

  // Draw Force Layout by default, unless the network is large
  if (G.order <= 500) {
    drawGraphs(selectedGraph);
  } else {
    document.getElementById('viz-warning').style.display = 'block';
  }

  table.redraw(true);
  const tabulatorWrapper = document.querySelector('.tabulator');
  if (tabulatorWrapper) tabulatorWrapper.classList.add('mt2');
}

// Calculate metrics and display graphs when user clicks "Navigate" button
document.getElementById('calculate').addEventListener('click', function () {
  const loader = document.querySelector('.loader');
  loader.classList.add('is-active');
  // Give the browser a chance to paint the loader before the (synchronous) heavy work
  requestAnimationFrame(() => setTimeout(async () => {
    try {
      await navigate();
      if (G) document.querySelector("#results").scrollIntoView({behavior: "smooth"});
    } catch (err) {
      console.error(err);
      G = null;
      hideResults();
      showRowError(`Something went wrong while processing your data (${err.message}).`);
    } finally {
      loader.classList.remove('is-active');
    }
  }, 0));
});

// Draw the visualization anyway when the network is large
document.getElementById('load-viz').addEventListener('click', function () {
  document.getElementById('viz-warning').style.display = 'none';
  drawGraphs(selectedGraph);
});

// Radio buttons for histogram also control node size
document.getElementById('histType').addEventListener('change', function () {
  selectHist();
  nodeSizeHist();
});

function reverse_sort(dict) {
  return Object.keys(dict).sort(function (a, b) {
    return dict[b] - dict[a]
  });
}

// Draw histogram for the selected radio button
function selectHist() {
  const checked = document.querySelector('input[name="histType"]:checked');
  const values = { degree, betweenness, eigenvector, clustering }[checked.value];
  if (values) {
    drawHist(values);
  } else {
    d3.select("svg#hist").selectAll('*').remove();
  }
}

// Smaller node size for arc diagram
var arcSize = d3.scaleLinear()
    .domain([15, 50])
    .range([3, 6]);

function nodeSizeHist() {
	const checked = document.querySelector('input[name="histType"]:checked');
	if (!checked || !G) return;
	const centrality = checked.value;
	document.querySelector('#centrality').value = centrality;
	document.querySelector('#centrality-arc').value = centrality;
	// Update sigma force layout if it exists
	if (window._sigmaInstance && window._graphologyInstance) {
		window._graphologyInstance.forEachNode((node, attrs) => {
			const radiusKey = `radius_${centrality}`;
			if (attrs[radiusKey] !== undefined) {
				window._graphologyInstance.setNodeAttribute(node, 'size', attrs[radiusKey] / 5);
			}
		});
		// (Skipped while the force layout is hidden; it refreshes when shown again)
		if (document.getElementById('force-layout-viz').offsetWidth > 0) window._sigmaInstance.refresh();
	}
	// Update D3 arc diagram
	d3.selectAll('.node-arc').attr('r', d => arcSize(d[`radius_${centrality}`]));
}
