import { drawMatrix } from './matrix.js';
import { drawForceAtlas } from './forceAtlas.js';
import { drawArcDiagram } from './arcDiagram.js';
import { drawHist } from './hist.js';


// Define global variables
let nodeList, edgeList, G, selectedGraph, degree, betweenness, eigenvector, clustering, matrix, colorValues;


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

$('#show-instructions').click(function (e) {
  e.preventDefault(e);
  $('#instructions').slideToggle();
})

$('#show-hist').click(function (e) {
  e.preventDefault(e);
  $('#hist-container').slideToggle();
})

$('#metrics-collapse').click(function (e) {
	let metrics = document.querySelector('#metrics');
	let viz = document.querySelector('#viz');
	if (!metrics.classList.contains('w-50-ns')) {
		metrics.classList.add('w-50-ns');
		viz.classList.remove('width-collapse');
		$('#viz-off').hide();
		$('#viz-on').show();
		$('#metrics-collapse em').text('collapse');
	}
	else if (metrics.classList.contains('width-collapse')) {
		metrics.classList.remove('width-collapse');
		viz.classList.add('w-50-ns');
		$('#metric-off').hide();
		$('#metric-on').show();
		$('#metrics-collapse em').text('collapse');
	} else { 
		metrics.classList.add('width-collapse');
		viz.classList.remove('w-50-ns');
		$('#metric-on').hide();
		$('#metric-off').show();
		$('#metrics-collapse em').text('expand');
	}
});

$('#viz-collapse').click(function (e) {
	let viz = document.querySelector('#viz');
	let metrics = document.querySelector('#metrics');
	if (!viz.classList.contains('w-50-ns')) {
		viz.classList.add('w-50-ns');
		metrics.classList.remove('width-collapse');
		$('#metric-off').hide();
		$('#metric-on').show();
		$('#viz-collapse em').text('collapse');
	}
	else if (viz.classList.contains('width-collapse')) {
		viz.classList.remove('width-collapse');
		metrics.classList.add('w-50-ns');
		$('#viz-off').hide();
		$('#viz-on').show();
		$('#viz-collapse em').text('collapse');
	} else { 
		viz.classList.add('width-collapse');
		metrics.classList.remove('w-50-ns');
		$('#viz-on').hide();
		$('#viz-off').show();
		$('#viz-collapse em').text('expand');
	}
});

// Check if graph selected
$('#selected-graph').on('click', function (e) {
  if (selectedGraph !== e.target.text) {
    selectedGraph = e.target.text;
    let divs = ['#matrix-viz', '#force-atlas-viz', '#arc-viz'];
    divs.map(div => {
      let splitDiv = div.split('-').map(d => d.replace('#',''));
      let filteredDiv = splitDiv.filter(d => selectedGraph.toLowerCase().split(' ').includes(d));
      if (filteredDiv.length > 0 ){
        $(div).css('padding', '.5rem');
        $(div).css('height', '100%');
        $(div).css('width', '100%');
        $(div).css('visibility', 'visible');
        // Check if svg has been drawn
        if ( $(div).find('svg').length == 0) {
          if ((filteredDiv.includes('matrix'))) drawMatrix(edgeList, nodeList, matrix, colorValues);
          if (filteredDiv.includes('force')) drawForceAtlas(edgeList, nodeList, colorValues);
          if (filteredDiv.includes('arc')) drawArcDiagram(edgeList, nodeList, colorValues);
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
});


var table = $('#metrics-table').DataTable({
	paging: false,
	scrollY: 400,
	buttons: [{extend:'copy', text:'Copy to Clipboard'}, {extend:'csv', text: 'Download as CSV'}],
	dom: 'Bfti',
	order: [[1, 'desc']]
});
$('#calculate').click(function () {
//var $btn = $(this).button('loading');
$('#row-error').hide();
$('#eigen-error').hide();
selectedGraph = "Force Directed Layout";

setTimeout(function () {
  // var edges = [];
  var data = $('textarea').val();
  var graphType = $("input[name='graphType']:checked").val();
  // var graphMode = $("input[name='graphMode']:checked").val();
  var graphWeight = $("input[name='graphWeight']:checked").val();
  var edges = $.csv.toArrays(data);
  // For D3 visualizations
  edgeList = [];
  edges.map(edge => {
    let item = {};
    item['source'] = edge[0];
    item['target'] = edge[1];
    item['weight'] = typeof (edge[2]) === 'undefined' ? 0 : edge[2];
    item['val'] = 1;
    // Check if multiple edges between same nodes
    let match = edgeList.find(r => ((r.source === edge[0]) && (r.target === edge[1])));
    if (match) {
      item.val = item.val + match.val;
      Object.assign(match, item);
    } else {
      edgeList.push(item);
    }
  });

  colorValues = [...new Set(edgeList.map(edge => edge.val))]
  colorValues.push(0);
  colorValues.sort((a, b) => a - b);

  $('#info-panel').empty();

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
    //$btn.button('reset');
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
    let betweennessString = `${betweenness[node].toFixed(4)} (${betweennessSorted.indexOf(node).toString()})`;
    let eigenvectorString = "N/A";
    let clusteringString = "N/A";
    if (eigenvector) {
      eigenvectorString = `${eigenvector[node].toFixed(4)} (${eigenvectorSorted.indexOf(node).toString()})`;
      item['eigenvector'] = eigenvector[node].toFixed(4);
    }
    if (graphType === 'undirected') {
      clusteringString = `${clustering[node].toFixed(4)} (${clusteringSorted.indexOf(node).toString()})`;
      item['clustering'] = clustering[node].toFixed(4);
    }
    var row = [node, degree[node], betweennessString, eigenvectorString, clusteringString];
    tableData.push(row);
    nodeList.push(item);
  });

  var idToNode = {};

  // Add indexes to nodes
  nodeList.forEach(function (n) {
    idToNode[n.id] = n;
  });

  // Embed nodes as source and target
  edgeList.forEach(function (e) {
    e.source = idToNode[e.source];
    e.target = idToNode[e.target];
  });

  nodeList.sort(function (a, b) {
    if (b.community != a.community)
      return b.community - a.community;
    else
      return b.degree - a.degree;
  });

  // Build initial matrix
  matrix = nodeList.map(function (outer, i) {
    console.log('matrix', i);
    outer.index = i;
    return nodeList.map(function (inner, j) {
      // if we want to use community add a check and change final zero to inner.community
      return {i: i,j: j, val: i === j ? 0 : 0};
    });
  });

  // Update matrix values depending on edges
  edgeList.forEach(function (l) {
    matrix[l.source.index][l.target.index].val = l.val;
    matrix[l.target.index][l.source.index].val = l.val;
  });
  window.matrix = matrix;

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
  $('#info-panel').append(allInfo);
  selectHist();
  $('#histType').change(function() {
    selectHist();
  });

  if ((G.nodes().length <= 500) && (selectedGraph == 'Force Directed Layout')) {
    drawForceAtlas(edgeList, nodeList, matrix, colorValues);
    // drawNetwork(G);
  } else {
    $('#viz-warning').show();
    $('.viz').hide();
  }

  $('#load-viz').click(function () {
    $('#viz-warning').hide();
    $('.viz').show();
    drawNetwork(G);
  });
}, 2000);

});

function reverse_sort(dict) {
  return Object.keys(dict).sort(function (a, b) {
    return dict[b] - dict[a]
  });
}

function drawNetwork(G) {
  jsnx.draw(G, {
    element: '#canvas',
    withLabels: false,
    weighted: true,
    nodeStyle: {
      fill: 'lightblue',
      stroke: 'none'
    },
    nodeAttr: {
      r: 5,
      title: function (d) {
        return d.label;
      }
    },
    edgeStyle: {
      fill: '#999'
    },
    stickyDrag: true
  });
}

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
					  drawHist(clustering);
			  };
		  };
	  });
}


// function drawMatrix(edgeList, nodeList){
//   var margin = {
//   top: 75,
//   right: 200,
//   bottom: 200,
//   left: 75
//   };

//   var width = $('#matrix-canvas').parent().width();
//   var height = $('#matrix-canvas').parent().height();

//   // Get values for coloring matrix, would change this to community if wanting to color by different value
//   const values = [...new Set(edgeList.map(edge => edge.val))]
//   values.push(0);
//   values.sort((a, b) => a - b);
//   var color = d3.scaleLinear()
//     .domain(values)
//     .range(["rgb(46, 73, 123)", "rgb(71, 187, 94)"]);

//   var opacity = d3.scaleLinear()
//     .range([0.5, 1])
//     .clamp(true);

//   var x = d3.scaleBand()
//     .rangeRound([0, height-200])
//     .paddingInner(0.1)
//     .align(0);

//   var svg = d3.select('#matrix-canvas').append('svg')
//     .attr('width', width)
//     .attr('height', height - 100)
//     // .node();
//     .append('g')
//     .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

//   // console.log(canvas);
//   // var context = canvas.getContext('2d');
//   var idToNode = {};

//   // Add indexes to nodes
//   nodeList.forEach(function (n) {
//     idToNode[n.id] = n;
//   }); 

//   // Embed nodes as source and target
//   edgeList.forEach(function (e) {
//     e.source = idToNode[e.source];
//     e.target = idToNode[e.target];
//   });

//   nodeList.sort(function (a, b) {
//     if (b.community != a.community)
//       return b.community - a.community;
//     else
//       return b.degree - a.degree;
//   });
//   x.domain(d3.range(nodeList.length));

//   opacity.domain([0, d3.max(edgeList, function (d) { return d.betweenness * 20; })]);

//   // Build initial matrix
//   var matrix = nodeList.map(function (outer, i) {
//     outer.index = i;
//     return nodeList.map(function (inner, j) {
//       // if we want to use community add a check and change final zero to inner.community
//       return {i: i, j: j, val: i === j ? 0 : 0};
//     });
//   });
//   window.matrix = matrix;
//   // window.edgeList = edgeList;
//   // Update matrix values depending on edges
//   edgeList.forEach(function (l) {
//     matrix[l.source.index][l.target.index].val = l.val;
//     matrix[l.target.index][l.source.index].val = l.val;
//   });
//   // context.clearRect(0, 0, width, height);

//   var row = svg.selectAll('g.row')
//     .data(matrix)
//     .enter().append('g')
//     .attr('class', 'row')
//     .attr('transform', function (d, i) { console.log('d',d,'i',i);return 'translate(0,' + x(i) + ')'; })
//     .each(makeRow);

//   row.append('text')
//     .attr('class', 'label')
//     .attr('x', -4)
//     .attr('y', x.bandwidth() / 2)
//     .attr('dy', '0.32em')
//     .text(function (d, i) { return nodeList[i].id; });

//   var column = svg.selectAll('g.column')
//     .data(matrix)
//     .enter().append('g')
//     .attr('class', 'column')
//     .attr('transform', function(d, i) { return 'translate(' + x(i) + ', 0)rotate(-90)'; })
//     .append('text')
//     .attr('class', 'label')
//     .attr('x', 4)
//     .attr('y', x.bandwidth() / 2)
//     .attr('dy', '0.32em')
//     .text(function (d, i) { return nodeList[i].id; });

//   svg.append("g")
//   .attr("class", "legendLinear")
//   .attr("transform", `translate(${height-190},0)`);

//   var legendLinear = d3.legendColor()
//     .shapeWidth(30)
//     .cells(values)
//     .scale(color)
//     .labelOffset(20);

//   svg.select(".legendLinear")
//     .call(legendLinear);

//   function makeRow(rowData) {
//     var cell = d3.select(this).selectAll('rect.cell')
//       .data(rowData)
//       .enter().append('rect')
//       .attr('class', 'cell')
//       .attr('x', function (d, i) { return x(i); })
//       .attr('width', x.bandwidth())
//       .attr('height', x.bandwidth())
//       .style('fill-opacity', function (d) { return d.val > 0 ? opacity(d.val) : 1; })
//       .style('fill', function (d) {
//           return color(d.val);
//       })
//       .on('mouseover', function (d) {
//         row.filter(function (_, i) { return d.i === i; })
//           .selectAll('text')
//           .style('fill', '#000000')
//           .style('font-weight', 'bold');
//         column.filter(function (_, j) { return d.j === j; })
//           .style('fill', '#000000')
//           .style('font-weight', 'bold');
//       })
//       .on('mouseout', function () {
//         row.selectAll('text')
//           .style('fill', null)
//           .style('font-weight', null);
//         column
//           .style('fill', null)
//           .style('font-weight', null);
//       });

//     cell.append('title')
//       .text(function (d) {
//         return nodeList[d.i].id + ' - ' + nodeList[d.j].id + ', degree: ' + d.val;
//       });
//   }
// }
