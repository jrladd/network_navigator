import { drawMatrix } from './matrix.js';

// Define global variables
let nodeList, edgeList, G, selectedGraph, matrixDrawn, networkDrawn;


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

// Check if graph selected
$('#selected-graph').on('click', function (e) {
  if (selectedGraph !== e.target.text) {
    selectedGraph = e.target.text;
    if ((selectedGraph.includes('Force'))) {
      $('#matrix-canvas').css('visibility', 'hidden');
      $('#matrix-canvas').css('padding', '0');
      $('#matrix-canvas').css('height', '0');
      $('#matrix-canvas').css('border', '0');
      $('#canvas').css('padding', '.5rem');
      $('#canvas').css('height', '100%');
      $('#canvas').css('visibility', 'visible');

      if (!networkDrawn) drawNetwork(G);
    } else {
      $('#canvas').css('visibility', 'hidden');
      $('#canvas').css('padding', '0');
      $('#canvas').css('height', '0');
      $('#canvas').css('border', '0');
      $('#matrix-canvas').css('padding', '.5rem');
      $('#matrix-canvas').css('height', '100%');
      $('#matrix-canvas').css('visibility', 'visible');
      if (!matrixDrawn) drawMatrix(edgeList, nodeList);
      if (networkDrawn) matrixDrawn = true;
    }
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
  window.edgeList = edgeList;

  $('#info-panel').empty();

  G = (graphType === 'undirected') ? new jsnx.Graph() : new jsnx.DiGraph();

  try {
    if (graphWeight === 'unweighted') {
      G.addEdgesFrom(edges);
    } else if (graphWeight === 'weighted') {
      G.addWeightedEdgesFrom(edges);
    }
    var betweenness = jsnx.betweennessCentrality(G)._stringValues;
    var degree = G.degree()._stringValues;

    var density = jsnx.density(G);
    var averageClustering = "N/A";
    if (graphType === 'undirected') {
      averageClustering = jsnx.averageClustering(G).toFixed(4);
      var clustering = jsnx.clustering(G)._stringValues;
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
    var eigenvector = jsnx.eigenvectorCentrality(G)._stringValues;
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
  table.clear().rows.add(tableData).draw();
  let metrics = document.getElementById("metrics");
  let viz = document.getElementById("viz");
  metrics.style.display = "block";
  viz.style.display = "block";
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

  if ((G.nodes().length <= 500) && (selectedGraph == 'Force Directed Layout')) {
    networkDrawn = true;
    drawNetwork(G);
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
