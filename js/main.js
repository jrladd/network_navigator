import { drawMatrix } from './matrix.js';
import { drawForceLayout } from './forceLayout.js';
import { drawArcDiagram } from './arcDiagram.js';
import { drawHist } from './hist.js';
import { addEdgeAttributeDropdown } from './edgeAttribute.js';
import * as metrics from './metrics.js';


// Define global variables
let nodeList, edgeList, G, selectedGraph, degree, betweenness, eigenvector, clustering, colorValues, graphType, graphWeight, numberOfNodes, numberOfEdges, densityVal, averageDegree, averageClusteringVal, transitivityVal;

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
  var reader = new FileReader();
  reader.onload = function (ev) {
    textarea.value = ev.target.result;
  }
  for (var i = 0; i < files.length; i++) {
    reader.readAsText(files[i]);
  }
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
		window.setTimeout(function() {table.columns.adjust()}, 500);
	}
	else if (metricsEl.classList.contains('width-collapse')) {
		metricsEl.classList.remove('width-collapse');
		vizEl.classList.add('w-50-ns');
		metricsEl.classList.add('br');
		document.getElementById('metric-off').style.display = 'none';
		document.getElementById('metric-on').style.display = 'inline';
		document.querySelector('#metrics-collapse em').textContent = 'collapse';
		window.setTimeout(function() {table.columns.adjust()}, 500);
	} else {
		metricsEl.classList.add('width-collapse');
		vizEl.classList.remove('w-50-ns');
		document.getElementById('metric-on').style.display = 'none';
		document.getElementById('metric-off').style.display = 'inline';
		document.querySelector('#metrics-collapse em').textContent = 'expand';
		window.setTimeout(function() {table.columns.adjust()}, 500);
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
		window.setTimeout(function() {table.columns.adjust()}, 500);
	}
	else if (vizEl.classList.contains('width-collapse')) {
		vizEl.classList.remove('width-collapse');
		metricsEl.classList.add('w-50-ns');
		metricsEl.classList.add('br');
		document.getElementById('viz-off').style.display = 'none';
		document.getElementById('viz-on').style.display = 'inline';
		document.querySelector('#viz-collapse em').textContent = 'collapse';
		window.setTimeout(function() {table.columns.adjust()}, 500);
	} else {
		vizEl.classList.add('width-collapse');
		metricsEl.classList.remove('w-50-ns');
		metricsEl.classList.remove('br');
		document.getElementById('viz-on').style.display = 'none';
		document.getElementById('viz-off').style.display = 'inline';
		document.querySelector('#viz-collapse em').textContent = 'expand';
		window.setTimeout(function() {table.columns.adjust()}, 500);
	}
});

// Handle collapse for customize graph form
document.getElementById('customize-form').addEventListener('click', function(e) {
  e.stopPropagation();
});

document.getElementById('customize').addEventListener('click', function () {
  let customize = document.getElementById('customize');
  let customizeOpen = document.getElementById('open-customize-form');
  let customizeClose = document.getElementById('close-customize-form');
  let selectedDiv = selectedGraph.toLowerCase().replaceAll(' ', '-');
  customize.classList.toggle('customize-expand');
  customizeOpen.classList.toggle('dn');
  customizeClose.classList.toggle('dn');
  customizeClose.classList.toggle('flex');

  let selectedPanel = document.getElementById(selectedDiv);
  selectedPanel.style.display = selectedPanel.style.display === 'none' ? 'flex' : 'none';

  let formPanel = document.getElementById('customize-form');
  formPanel.style.display = formPanel.style.display === 'none' ? 'block' : 'none';
});

// Draw each graph type when it is selected by user
function drawGraphs(selectedGraph) {
  divs.map(div => {
    let el = document.querySelector(div);
    let splitDiv = div.split('-').map(d => d.replace('#', ''));
    let filteredDiv = splitDiv.filter(d => selectedGraph.toLowerCase().split(' ').includes(d));
    if (filteredDiv.length > 0) {
      el.style.padding = '.5rem';
      el.style.height = '100%';
      el.style.width = '100%';
      el.style.visibility = 'visible';
      // Check if visualization has been drawn (SVG for D3, sigma-container for Sigma)
      let hasSvg = el.querySelector('svg') !== null;
      let hasSigma = el.querySelector('.sigma-container') !== null;
      if (!hasSvg && !hasSigma) {
        if ((filteredDiv.includes('matrix'))) drawMatrix(edgeList, nodeList, colorValues, graphType, graphWeight);
        if (filteredDiv.includes('force')) drawForceLayout(edgeList, nodeList, colorValues, graphType, graphWeight);
        if (filteredDiv.includes('arc')) drawArcDiagram(edgeList, nodeList, colorValues, graphType, graphWeight);
      }
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
}

// Check if graph selected
document.getElementById('selected-graph').addEventListener('click', function (e) {
  if (selectedGraph !== e.target.text) {
    selectedGraph = e.target.text;
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
  let downloadType = document.querySelector("#download-type");
  switch (downloadType.value) {
	  case 'viz-png':
		  if (selectedGraph === 'Force Layout') {
			  // Sigma canvas-based export
			  const sigmaCanvases = document.querySelectorAll('#force-layout-viz canvas');
			  if (sigmaCanvases.length > 0) {
				  // Sigma uses multiple canvases; combine them
				  const container = document.querySelector('#force-layout-viz .sigma-container');
				  const w = container.offsetWidth;
				  const h = container.offsetHeight;
				  const mergedCanvas = document.createElement('canvas');
				  mergedCanvas.width = w;
				  mergedCanvas.height = h;
				  const ctx = mergedCanvas.getContext('2d');
				  ctx.fillStyle = '#FFFFFF';
				  ctx.fillRect(0, 0, w, h);
				  sigmaCanvases.forEach(c => ctx.drawImage(c, 0, 0));
				  let a = document.createElement('a');
				  a.download = 'force_layout_visualization.png';
				  a.href = mergedCanvas.toDataURL('image/png');
				  document.body.appendChild(a);
				  a.click();
				  document.body.removeChild(a);
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
					  var imgData = 'data:image/svg+xml;base64,' + btoa(xmlString);
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
Average Degree: ${averageDegree}
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

// Initialize DataTable for metrics
var table = new DataTable('#metrics-table', {
	paging: false,
	scrollY: 400,
	scrollX: true,
	buttons: [{extend:'copy', text:'Copy to Clipboard'}, {extend:'csv', text: 'Download as CSV'}],
	layout: {
		topStart: 'buttons',
		topEnd: 'search',
		bottomStart: 'info'
	},
	order: [[1, 'desc']],
	autoWidth: false,
	columnDefs: [
		{searchable: false, targets: [1,2,3,4]}
	]
});


// Calculate metrics and display graphs when user clicks "Navigate" button
document.getElementById('calculate').addEventListener('click', function () {
  document.querySelector('.loader').classList.add('is-active');

  divs.map((div) => {
    document.querySelector(div).innerHTML = '';
  });
  document.getElementById('row-error').style.display = 'none';
  document.getElementById('eigen-error').style.display = 'none';
  document.getElementById('customize-form').style.display = 'none';

  // Clean up previous sigma instance if it exists
  if (window._sigmaInstance) {
    window._sigmaInstance.kill();
    window._sigmaInstance = null;
    window._graphologyInstance = null;
  }

  selectedGraph = "Force Layout";
    // Get CSV and parse rows
    var data = document.querySelector('textarea').value;
    graphType = document.querySelector("input[name='graphType']:checked").value;
    graphWeight = document.querySelector("input[name='graphWeight']:checked").value;
    var headerRow = document.querySelector("#headerRow");
    var edges;
    if (headerRow.checked) {
      edges = d3.csvParse(data, function(d) {
	      d = Object.keys(d).reduce((c, k) => (c[k.toLowerCase()] = d[k], c), {});
	      return [d.source,d.target,d.weight];
      });
      edgeList = d3.csvParse(data);
      edgeList = edgeList.map(d => { return Object.keys(d).reduce((c, k) => (c[k.toLowerCase()] = d[k], c), {}); });
      edgeList = edgeList.map(d => {d.weight = Number(d.weight); return d;});
    } else {
      edges = d3.csvParseRows(data);
    }

    document.getElementById('info-panel').innerHTML = '';

    // Create Graphology graph and calculate metrics
    const GraphClass = graphType === 'undirected' ? graphology.UndirectedGraph : graphology.DirectedGraph;
    G = new GraphClass();

    try {
      // Add edges to graph
      edges.forEach(edge => {
        const source = String(edge[0]).trim();
        const target = String(edge[1]).trim();
        const weight = edge[2] !== undefined ? Number(edge[2]) : 1;

        if (!G.hasNode(source)) G.addNode(source);
        if (!G.hasNode(target)) G.addNode(target);

        if (graphWeight === 'weighted') {
          G.addEdge(source, target, { weight: weight });
        } else {
          G.addEdge(source, target);
        }
      });

      betweenness = metrics.betweennessCentrality(G);
      degree = metrics.degreeDict(G);

      densityVal = metrics.density(G);
      averageClusteringVal = "N/A";
      if (graphType === 'undirected') {
        averageClusteringVal = metrics.averageClusteringCoeff(G).toFixed(4);
        clustering = metrics.clusteringCoefficient(G);
        var clusteringSorted = reverse_sort(clustering);
      }
      transitivityVal = metrics.transitivity(G);
      numberOfNodes = G.order;
      numberOfEdges = G.size;
      averageDegree = Object.values(degree).reduce((a, b) => {
        return a + b;
      }) / numberOfNodes;

    } catch (err) {
      console.error(err);
      document.getElementById("row-error").style.display = 'block';
    }

    try {
      eigenvector = metrics.eigenvectorCentrality(G);
    } catch (err) {
      console.error(err);
      if (err.message !== 'Empty graph.') {
        document.getElementById('eigen-error').style.display = 'block';
      }
    }

    var degreeSorted = reverse_sort(degree);
    var betweennessSorted = reverse_sort(betweenness);
    if (eigenvector) {
      var eigenvectorSorted = reverse_sort(eigenvector);
    }

    if (headerRow.checked === false) {
        edgeList = [];
        G.forEachEdge(function(edge, attrs, source, target) {
          edgeList.push({
            source: source,
            target: target,
            weight: attrs.weight !== undefined ? +attrs.weight : 1
          });
        });
    }

    colorValues = [...new Set(edgeList.map(edge => edge.weight))]
    colorValues.push(0);
    colorValues.sort((a, b) => a - b);

    var tableData = [];
    nodeList = [];
    G.forEachNode(function (node) {
      // For D3 Visualizations
      let item = {};
      item['id'] = node;
      item['degree'] = degree[node];
      item['betweenness'] = betweenness[node].toFixed(4);
      let betweennessString = `${betweenness[node].toFixed(4)} (${(betweennessSorted.indexOf(node) + 1).toString()})`;
      let eigenvectorString = "N/A";
      let clusteringString = "N/A";
      if (eigenvector) {
        eigenvectorString = `${eigenvector[node].toFixed(4)} (${(eigenvectorSorted.indexOf(node) + 1).toString()})`;
        item['eigenvector'] = eigenvector[node].toFixed(4);
      }
      if (graphType === 'undirected') {
        clusteringString = `${clustering[node].toFixed(4)} (${(clusteringSorted.indexOf(node) + 1).toString()})`;
        item['clustering'] = clustering[node].toFixed(4);
      } else {item['clustering'] = 5};
      item ['community'] = 1;
      var row = [node, degree[node], betweennessString, eigenvectorString, clusteringString];
      tableData.push(row);
      nodeList.push(item);
    });

    const sizes = ['degree', 'eigenvector', 'betweenness', 'clustering']
    sizes.map(size => {
      if (nodeList.some(node => node.hasOwnProperty(size))){
        var centralitySize = d3.scaleLinear()
          .domain([d3.min(nodeList, function (d) {
            return d[size];
          }), d3.max(nodeList, function (d) {
            return d[size];
          })])
          .range([15, 50]);

        var fontSize = d3.scaleLinear()
          .domain([d3.min(nodeList, function (d) {
            return d[size];
          }), d3.max(nodeList, function (d) {
            return d[size];
          })])
          .range([20, 30]);
        nodeList = nodeList.map(node => {
          node[`radius_${size}`] = centralitySize(node[size])
          node[`fontSize_${size}`] = fontSize(node[size])
          return node
        })
      }
    });

    var idToNode = {};

    // Add indexes to nodes
    nodeList.forEach(function (n) {
      idToNode[n.id] = n;
    });

    var edgeWidth = d3.scaleLinear()
      .domain([d3.min(edgeList, function (d) {
        return d.weight;
      }), d3.max(edgeList, function (d) {
        return d.weight;
      })])
      .range([3, 20]);
    // Embed nodes as source and target
    edgeList.map(function (e) {
      e.source = idToNode[e.source] || idToNode[e.source.id] || e.source;
      e.target = idToNode[e.target] || idToNode[e.target.id] || e.target;
      e.scaled_weight = edgeWidth(e.weight);
    });

    // Add metrics to DataTable and page, display all
    table.clear().rows.add(tableData).draw();
    const dtSearchInput = document.querySelector('.dt-search input');
    if (dtSearchInput) dtSearchInput.placeholder = 'Find a Node ID';
    let metricsEl = document.getElementById("metrics");
    let vizEl = document.getElementById("viz");
    let buttons = document.getElementById("buttons");
    metricsEl.style.display = "block";
    vizEl.style.display = "block";
    buttons.style.display = "block";
    document.getElementById('metric-off').style.display = 'none';
    document.getElementById('viz-off').style.display = 'none';
    var allInfo = `
    <div class="fl w-50-l w-100 mv2">
    Total Nodes: ${numberOfNodes}<br/>
    Total Edges: ${numberOfEdges}<br/>
    Average Degree: ${averageDegree}<br/>
    </div>
    <div class="fl w-50-l w-100 mv2">
    Density: ${densityVal.toFixed(4)}<br/>
    Avg. Clustering Coefficient: ${averageClusteringVal}<br/>
    Transitivity: ${transitivityVal.toFixed(4)}<br/>
    </div>
    `
    if (graphType === 'directed') {
	    allInfo += `<div class='fl w-100 tc pa2 br4 ba b--gold bg-light-yellow gold'>Clustering coefficients cannot be calculated for directed graphs.</div>`
    }
    document.getElementById('info-panel').innerHTML += allInfo;
    selectHist();
    document.getElementById('histType').addEventListener('change', function() {
      selectHist();
      nodeSizeHist();
    });

    // Draw Force Layout by default
    if ((G.order <= 500) && (selectedGraph == 'Force Layout')) {
      drawGraphs(selectedGraph);
    } else {
      document.getElementById('viz-warning').style.display = 'block';
      document.querySelectorAll('.viz').forEach(el => el.style.display = 'none');
    }

    document.getElementById('load-viz').addEventListener('click', function () {
      document.getElementById('viz-warning').style.display = 'none';
      document.querySelectorAll('.viz').forEach(el => el.style.display = 'block');
      drawGraphs(selectedGraph);
    });

   document.querySelector('.loader').classList.remove('is-active');
   document.querySelector("#results").scrollIntoView({behavior: "smooth"});
   table.columns.adjust();
   const dtWrapper = document.querySelector('#metrics-table_wrapper') || document.querySelector('.dt-container');
   if (dtWrapper) dtWrapper.classList.add('mt2');
});

function reverse_sort(dict) {
  return Object.keys(dict).sort(function (a, b) {
    return dict[b] - dict[a]
  });
}

// Radio buttons for histogram
function selectHist() {
	  let radios = document.getElementsByName('histType');
	  radios.forEach(r => {
		  if (r.checked) {
			  switch (r.value) {
				  case 'degree':
					  drawHist(degree);
					  break;
				  case 'betweenness':
					  drawHist(betweenness);
					  break;
				  case 'eigenvector':
					  drawHist(eigenvector);
					  break;
				  case 'clustering':
					  if (graphType !== 'directed') {
					      drawHist(clustering);
					  } else {
					      d3.select("svg#hist").selectAll('*').remove();
					      d3.select("svg#hist").append('text').attr('width', '100%').attr("x", 50).attr("y", 50).text("Clustering coefficients cannot be calculated for directed graphs.")
					  }
			  };
		  };
	  });
}

// Smaller node size for arc diagram
var arcSize = d3.scaleLinear()
    .domain([15, 50])
    .range([3, 6]);

function nodeSizeHist() {
	let radios = document.getElementsByName('histType');
	let centrality;
	radios.forEach(r => {
		if (r.checked) {
			centrality = r.value;
		};
	});
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
		window._sigmaInstance.refresh();
	}
	// Update D3 arc diagram
	d3.selectAll('.node-arc').attr('r', d => arcSize(d[`radius_${centrality}`]));
}
