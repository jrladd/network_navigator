// Everything that downloads a file: images of the visualizations and histogram,
// the global metrics text, the node table, and the network with metrics as GEXF (for Gephi).

import { app } from './state.js';
import { availableMetrics, visibleGlobalMetrics } from './metrics.js';

const VIZ_NAMES = { force: 'force_layout', arc: 'arc_diagram', matrix: 'adjacency_matrix' };
const VIZ_CONTAINERS = { force: '#force-layout-viz', arc: '#arc-diagram-viz', matrix: '#matrix-viz' };

// CSS from the page that a standalone SVG image would otherwise lose
const SVG_STYLE = '.tick text { font-size: 2em; } text { font-family: system-ui, sans-serif; }';

function saveUrl(url, filename) {
  const a = document.createElement('a');
  a.download = filename;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  saveUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Serialize an on-page <svg> as a standalone document, sized from its viewBox
function serializeSvg(svg) {
  const viewBox = svg.viewBox && svg.viewBox.baseVal;
  const width = viewBox && viewBox.width ? viewBox.width : svg.clientWidth || 1000;
  const height = viewBox && viewBox.height ? viewBox.height : svg.clientHeight || 1000;

  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', width);
  clone.setAttribute('height', height);
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = SVG_STYLE;
  clone.insertBefore(style, clone.firstChild);

  const xml = new XMLSerializer().serializeToString(clone);
  return { xml: `<?xml version="1.0" standalone="no"?>${xml}`, width, height };
}

function downloadSvg(svg, name) {
  const { xml } = serializeSvg(svg);
  saveBlob(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }), `${name}_visualization.svg`);
}

function downloadSvgAsPng(svg, filename) {
  const { xml, width, height } = serializeSvg(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => saveBlob(blob, filename), 'image/png');
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    alert('Sorry, the image could not be created.');
  };
  image.src = url;
}

// Sigma draws in stacked canvases; merge the visible layers into one PNG
function downloadForceLayoutPng() {
  if (!app.sigma) {
    alert('Force layout not initialized. Please generate the visualization first.');
    return;
  }
  const container = document.querySelector(VIZ_CONTAINERS.force);
  if (container.offsetWidth === 0) {
    alert('Show the force layout first, then download it.');
    return;
  }
  app.sigma.refresh();
  const layers = ['sigma-edges', 'sigma-edgeLabels', 'sigma-nodes', 'sigma-labels'];
  const canvases = Array.from(container.querySelectorAll('canvas')).filter((c) => layers.includes(c.className));
  if (canvases.length === 0) {
    alert('No canvas elements found in force layout. Please refresh and try again.');
    return;
  }

  const merged = document.createElement('canvas');
  merged.width = canvases[0].width;
  merged.height = canvases[0].height;
  const ctx = merged.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, merged.width, merged.height);
  canvases.forEach((canvas) => ctx.drawImage(canvas, 0, 0));
  merged.toBlob((blob) => saveBlob(blob, 'force_layout_visualization.png'), 'image/png');
}

function metricsText() {
  const lines = visibleGlobalMetrics(app.result).map((metric) =>
    `${metric.label}: ${metric.value === null || metric.value === undefined ? 'N/A' : metric.format(metric.value)}`);
  return `Global Network Metrics:\n\n${lines.join('\n')}\n\nLooking for node-level metrics? Use "Node table (CSV)" in the Download menu, or the "Download as CSV" button under the data table.`;
}

// The projected network as an edge list (source, target, link weight, number of shared neighbors)
function projectionCsv() {
  const quote = (text) => `"${String(text).replace(/"/g, '""')}"`;
  const rows = ['source,target,weight,shared'];
  app.G.forEachEdge((edge, attrs, source, target) => {
    rows.push([quote(source), quote(target), attrs.weight, attrs.shared].join(','));
  });
  return rows.join('\n') + '\n';
}

// A copy of the graph with every metric as node attributes, so it opens in Gephi with them
function gexfText() {
  const copy = app.G.copy();
  const metrics = availableMetrics(app.result);
  copy.forEachNode((node) => {
    copy.setNodeAttribute(node, 'label', node);
    metrics.forEach((metric) => {
      copy.setNodeAttribute(node, metric.key, app.result.node[metric.key][node]);
    });
  });
  return graphologyLibrary.gexf.write(copy);
}

export function download(kind) {
  if (!app.G) return;
  const vizName = VIZ_NAMES[app.vizType];

  switch (kind) {
    case 'viz-png':
      if (app.vizType === 'force') {
        downloadForceLayoutPng();
      } else {
        const svg = document.querySelector(`${VIZ_CONTAINERS[app.vizType]} svg`);
        if (svg) downloadSvgAsPng(svg, `${vizName}_visualization.png`);
      }
      break;
    case 'viz-svg':
      if (app.vizType === 'force') {
        alert('SVG export is not available for the force layout visualization. Please use PNG export instead.');
      } else {
        const svg = document.querySelector(`${VIZ_CONTAINERS[app.vizType]} svg`);
        if (svg) downloadSvg(svg, vizName);
      }
      break;
    case 'hist': {
      const checked = document.querySelector('input[name="histType"]:checked');
      downloadSvgAsPng(document.querySelector('svg#hist'), `histogram_${checked ? checked.value : 'metric'}.png`);
      break;
    }
    case 'metrics':
      saveBlob(new Blob([metricsText()], { type: 'text/plain;charset=utf-8' }), 'global_network_metrics.txt');
      break;
    case 'csv':
      app.table.download('csv', 'network_metrics.csv');
      break;
    case 'projection':
      if (app.networkView !== 'main') {
        saveBlob(new Blob([projectionCsv()], { type: 'text/csv;charset=utf-8' }), `projection_${app.networkView}.csv`);
      }
      break;
    case 'gexf':
      saveBlob(new Blob([gexfText()], { type: 'application/gexf+xml;charset=utf-8' }), 'network_with_metrics.gexf');
      break;
  }
}

// Wire up the download menu (call once at startup)
export function initDownloads() {
  const menu = document.getElementById('download-menu');
  menu.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-download]');
    if (!button) return;
    menu.open = false;
    download(button.dataset.download);
  });
  // Close the menu when clicking elsewhere or pressing Escape
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) menu.open = false; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.open = false; });
}
