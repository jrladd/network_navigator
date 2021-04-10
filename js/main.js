import { drawMatrix } from './matrix.js';
import { drawForceLayout } from './forceLayout.js';
import { drawArcDiagram } from './arcDiagram.js';
import { drawHist } from './hist.js';
import { parse } from './csv.min.js';


// Define global variables
let nodeList, edgeList, G, selectedGraph, degree, betweenness, eigenvector, clustering, colorValues, graphType, graphWeight;

const divs = ['#matrix-viz', '#force-layout-viz','#arc-diagram-viz'];

// Allow drag and drop on textarea
$('textarea').on('dragover', function (e) {
  e.preventDefault(e);
  e.stopPropagation(e);
});

$('textarea').on('drop', function (e) {
  e.preventDefault(e);
  e.stopPropagation(e);
  let $textarea = this;
  var files = e.originalEvent.dataTransfer.files;
  var reader = new FileReader();
  reader.onload = function (e) {
    $textarea.value = e.target.result;
  }
  for (var i = 0; i < files.length; i++) {
    reader.readAsText(files[i]);
  }
});

// Toggle instructions and histogram
$('#show-instructions').click(function (e) {
  e.preventDefault(e);
  $('#instructions').slideToggle();
})

$('#show-hist').click(function (e) {
  e.preventDefault(e);
  $('#hist-container').slideToggle();
  $('#download-hist').slideToggle();
})

// Manage side-by-side collapsing metrics/viz panels
$('#metrics-collapse').click(function (e) {
	let metrics = document.querySelector('#metrics');
	let viz = document.querySelector('#viz');
	if (!metrics.classList.contains('w-50-ns')) {
		metrics.classList.add('w-50-ns');
		metrics.classList.add('br');
		viz.classList.remove('width-collapse');
		$('#viz-off').hide();
		$('#viz-on').show();
		$('#metrics-collapse em').text('collapse');
		window.setTimeout(function() {table.columns.adjust()}, 500);
	}
	else if (metrics.classList.contains('width-collapse')) {
		metrics.classList.remove('width-collapse');
		viz.classList.add('w-50-ns');
		metrics.classList.add('br');
		$('#metric-off').hide();
		$('#metric-on').show();
		$('#metrics-collapse em').text('collapse');
		window.setTimeout(function() {table.columns.adjust()}, 500);
	} else { 
		metrics.classList.add('width-collapse');
		viz.classList.remove('w-50-ns');
		$('#metric-on').hide();
		$('#metric-off').show();
		$('#metrics-collapse em').text('expand');
		window.setTimeout(function() {table.columns.adjust()}, 500);
	}
});

$('#viz-collapse').click(function (e) {
	let viz = document.querySelector('#viz');
	let metrics = document.querySelector('#metrics');
	if (!viz.classList.contains('w-50-ns')) {
		viz.classList.add('w-50-ns');
		metrics.classList.remove('width-collapse');
		metrics.classList.add('br');
		$('#metric-off').hide();
		$('#metric-on').show();
		$('#viz-collapse em').text('collapse');
		window.setTimeout(function() {table.columns.adjust()}, 500);
	}
	else if (viz.classList.contains('width-collapse')) {
		viz.classList.remove('width-collapse');
		metrics.classList.add('w-50-ns');
		metrics.classList.add('br');
		$('#viz-off').hide();
		$('#viz-on').show();
		$('#viz-collapse em').text('collapse');
		window.setTimeout(function() {table.columns.adjust()}, 500);
	} else { 
		viz.classList.add('width-collapse');
		metrics.classList.remove('w-50-ns');
		metrics.classList.remove('br');
		$('#viz-on').hide();
		$('#viz-off').show();
		$('#viz-collapse em').text('expand');
		window.setTimeout(function() {table.columns.adjust()}, 500);
	}
});

// Handle collapse for customize graph form
$('#customize-form').click( function(e) {
  e.stopPropagation();
});

$('#customize').click(function () {
  let customize = $('#customize');
  let customizeOpen = $('#open-customize-form');
  let customizeClose = $('#close-customize-form');
  let selectedDiv = selectedGraph.toLowerCase().replaceAll(' ', '-');
  customize.toggleClass('customize-expand');
  customizeOpen.toggleClass('dn');
  customizeClose.toggleClass('dn flex');
  $(`#${selectedDiv}`).toggle();
  $('#customize-form').toggle();
});

// Draw each graph type when it is selected by user
function drawGraphs(selectedGraph) {
  divs.map(div => {
    let splitDiv = div.split('-').map(d => d.replace('#', ''));
    let filteredDiv = splitDiv.filter(d => selectedGraph.toLowerCase().split(' ').includes(d));
    if (filteredDiv.length > 0) {
      $(div).css('padding', '.5rem');
      $(div).css('height', '100%');
      $(div).css('width', '100%');
      $(div).css('visibility', 'visible');
      // Check if svg has been drawn
      if ($(div).find('svg').length == 0) {
        if ((filteredDiv.includes('matrix'))) drawMatrix(edgeList, nodeList, colorValues, graphType, graphWeight);
        if (filteredDiv.includes('force')) drawForceLayout(edgeList, nodeList, colorValues, graphType, graphWeight);
        if (filteredDiv.includes('arc')) drawArcDiagram(edgeList, nodeList, colorValues, graphType, graphWeight);
      }
    } else {
      $(div).css('visibility', 'hidden');
      $(div).css('padding', '0');
      $(div).css('height', '0');
      $(div).css('border', '0');
      $(div).css('width', '0');
    }
  });
}

// Check if graph selected
$('#selected-graph').on('click', function (e) {
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

function updateDownloadURL(svg, filename, link) {
  getDownloadURL(svg, filename, function (error, url) {
    if (error) {
      console.error(error);
    } else {
      link.href = url;
    }
  });
}

// Download buttons for main visualization and histogram
$('#download-graph').on('click', function (e) {
  divs.map(div => {
    let splitDiv = div.split('-').map(d => d.replace('#', ''));
    let filteredDiv = splitDiv.filter(d => selectedGraph.toLowerCase().split(' ').includes(d));
    if (filteredDiv.length > 0) {
      updateDownloadURL(d3.selectAll(`${div} svg`), selectedGraph.toLowerCase().replaceAll(' ', '_'), $(this));
    } 
  });
});

$('#download-hist').on('click', function (e) {
  let filename = 'histogram_' + $('input[name="histType"]:checked').val();
  console.log(filename);
  updateDownloadURL(d3.selectAll(`#hist`), filename, $(this));
});

// Initialize DataTable for metrics
var table = $('#metrics-table').DataTable({
	paging: false,
	scrollY: 400,
	scrollX: true,
	buttons: [{extend:'copy', text:'Copy to Clipboard'}, {extend:'csv', text: 'Download as CSV'}],
	dom: 'Bfti',
	order: [[1, 'desc']],
	autoWidth: false,
	columnDefs: [
		{searchable: false, targets: [1,2,3,4]}
	]
});

// Calculate metrics and display graphs when user clicks "Navigate" button
$('#calculate').click(function () {
  divs.map((div) => {
    $(div).html('');
  });
  $('#row-error').hide();
  $('#eigen-error').hide();
  $('#customize-form').hide();

  selectedGraph = "Force Layout";
  $('.loader').addClass('is-active'); // CSS Loader while calculating
    // Get CSV and parse rows
    var data = $('textarea').val();
    graphType = $("input[name='graphType']:checked").val();
    graphWeight = $("input[name='graphWeight']:checked").val();
    var headerRow = document.querySelector("#headerRow");
    var edges = parse(data);
    if (headerRow.checked) {
      edges = edges.slice(1);
    }
    // For D3 visualizations
    edgeList = [];
    edges.map(edge => {
      let item = {};
      item['source'] = edge[0];
      item['target'] = edge[1];
      item['weight'] = typeof (edge[2]) === 'undefined' ? 1 : parseInt(edge[2]);
      // item['val'] = 1;
      // Check if multiple edges between same nodes
      let match = edgeList.find(r => ((r.source === edge[0]) && (r.target === edge[1])));
      if (match) {
        item.weight = item.weight + match.weight;
        Object.assign(match, item);
      } else {
        edgeList.push(item);
      }
    });

    colorValues = [...new Set(edgeList.map(edge => edge.weight))]
    colorValues.push(0);
    colorValues.sort((a, b) => a - b);

    $('#info-panel').empty();
	
    // Create JSNetworkX object and calculate metrics

    G = (graphType === 'undirected') ? new jsnx.Graph() : new jsnx.DiGraph();

    try {
      if (graphWeight === 'unweighted') {
        G.addEdgesFrom(edges);
      } else if (graphWeight === 'weighted') {
        G.addWeightedEdgesFrom(edges);
      }
      betweenness = jsnx.betweennessCentrality(G)._stringValues;
      degree = G.degree()._stringValues;

      var density = jsnx.density(G);
      var averageClustering = "N/A";
      if (graphType === 'undirected') {
        averageClustering = jsnx.averageClustering(G).toFixed(4);
        clustering = jsnx.clustering(G)._stringValues;
        var clusteringSorted = reverse_sort(clustering);
      }
      var transitivity = jsnx.transitivity(G);
      var numberOfNodes = G.nodes().length;
      var numberOfEdges = G.edges().length;
      var averageDegree = Object.values(degree).reduce((a, b) => {
        return a + b;
      }) / numberOfNodes;

    } catch (err) {
      console.error(err);
      $("#row-error").show();
    }

    try {
      eigenvector = jsnx.eigenvectorCentrality(G)._stringValues;
    } catch (err) {
      console.error(err);
      if (err.message !== 'Empty graph.') {
        $('#eigen-error').show();
      }
    }

    var degreeSorted = reverse_sort(degree);
    var betweennessSorted = reverse_sort(betweenness);
    if (eigenvector) {
      var eigenvectorSorted = reverse_sort(eigenvector);
    }

    var tableData = [];
    nodeList = [];
    G.nodes().forEach(function (node) {
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
      e.source = idToNode[e.source];
      e.target = idToNode[e.target];
      e.scaled_weight = edgeWidth(e.weight);
    });

    // Add metrics to DataTable and page, display all
    table.clear().rows.add(tableData).draw();
    let metrics = document.getElementById("metrics");
    let viz = document.getElementById("viz");
    let buttons = document.getElementById("buttons");
    metrics.style.display = "block";
    viz.style.display = "block";
    buttons.style.display = "block";
    $('#metric-off').hide();
    $('#viz-off').hide();
    //$btn.button('reset');
    var allInfo = `
          <div class="fl w-50 mv2">
    Total Nodes: ${numberOfNodes}<br/>
    Total Edges: ${numberOfEdges}<br/>
    Average Degree: ${averageDegree}<br/>
    </div>
    <div class="fl w-50 mv2">
    Density: ${density.toFixed(4)}<br/>
    Avg. Clustering Coefficient: ${averageClustering}<br/>
    Transitivity: ${transitivity.toFixed(4)}<br/>
    </div>
    `
    if (graphType === 'directed') {
	    allInfo += `<div class='fl w-100 tc pa2 br4 ba b--gold bg-light-yellow gold'>Clustering coefficients cannot be calculated for directed graphs.</div>`
    }
    $('#info-panel').append(allInfo);
    selectHist();
    $('#histType').change(function() {
      selectHist();
      // Change centrality if the user selects histogram button
      nodeSizeHist();
    });

    // Draw Force Layout by default
    if ((G.nodes().length <= 500) && (selectedGraph == 'Force Layout')) {
      drawGraphs(selectedGraph);
    } else {
      $('#viz-warning').show();
      $('.viz').hide();
    }

    $('#load-viz').click(function () {
      $('#viz-warning').hide();
      $('.viz').show();
      drawGraphs(selectedGraph);
    });

   $('.loader').removeClass('is-active');
   document.querySelector("#results").scrollIntoView({behavior: "smooth"});
   table.columns.adjust();
   $("#metrics-table_wrapper").addClass('mt2');
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

function nodeSizeHist() {
	let radios = document.getElementsByName('histType');
	radios.forEach(r => {
		if (r.checked) { 
			centrality = r.value;
		};
	});
	document.querySelector('#centrality').value = centrality;
	document.querySelector('#centrality-arc').value = centrality;
        d3.selectAll('.node').attr('r', d => d[`radius_${centrality}`]);
        d3.selectAll('.nodeLabel').attr('font-size', d => d[`fontSize_${centrality}`]);
        d3.selectAll('.node-arc').attr('r', d => d[`radius_${centrality}`]);
}

