$( function() {
  // import {drawMatrix} from './matrix.js';
  let nodeList, edgeList, G, selectedGraph;
  $('textarea').on('dragover', function(e) {
    e.preventDefault(e);
    e.stopPropagation(e);
  });

  $('textarea').on('drop', function(e) {
    e.preventDefault(e);
    e.stopPropagation(e);
    $textarea = this;
    var files = e.originalEvent.dataTransfer.files;
    var reader = new FileReader();
    reader.onload = function(e) {
      $textarea.value = e.target.result;
    }
    for (var i=0;i<files.length;i++) {
      reader.readAsText(files[i]);
    }
  });

  $('#show-instructions').click(function(e){
    e.preventDefault(e);
    $('#instructions').slideToggle();
  })

  $('#selected-graph').on('click', function(e){
      if (selectedGraph !== e.target.text) {
        selectedGraph = e.target.text;
        if (selectedGraph.includes('Force')){
          $('#matrix-canvas').css('visibility', 'hidden');
          $('#matrix-canvas').css('padding', '0');
          $('#matrix-canvas').css('height', '0');
          $('#matrix-canvas').css('border', '0');
          $('#canvas').css('padding', '.5rem');
          $('#canvas').css('height', '100%');
          $('#canvas').css('visibility', 'visible');
          
          drawNetwork(G);
        } else {
          $('#canvas').css('visibility', 'hidden');
          $('#canvas').css('padding', '0');
          $('#canvas').css('height', '0');
          $('#canvas').css('border', '0');
          $('#matrix-canvas').css('padding', '.5rem');
          $('#matrix-canvas').css('height', '100%');
          $('#matrix-canvas').css('visibility', 'visible');
          drawMatrix(edgeList, nodeList);
        }
      }


  });
  

  var table = $('#metrics-table').DataTable();
  $('#calculate').click(function(){
	  //var $btn = $(this).button('loading');
    $('#row-error').hide();
    $('#eigen-error').hide();
    selectedGraph = "Force Directed Layout";

    setTimeout(function() {
      // var edges = [];
      var data = $('textarea').val();
      var graphType = $("input[name='graphType']:checked").val();
      // var graphMode = $("input[name='graphMode']:checked").val();
      var graphWeight = $("input[name='graphWeight']:checked").val();
      var rows = '';
      var allInfo = '';
      var edges = $.csv.toArrays(data);
      // For D3 visualizations
      edgeList = [];
      edges.map(edge => {
          let item = {};
          item['source'] = edge[0];
          item['target'] = edge[1];
          item['weight'] = typeof(edge[2]) === 'undefined' ? 0: edge[2];
          edgeList.push(item);
      });

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
        if (graphType === 'undirected') {
          var averageClustering = jsnx.averageClustering(G);
          var clustering = jsnx.clustering(G)._stringValues;
          var clusteringSorted = reverse_sort(clustering);
        }
        var transitivity = jsnx.transitivity(G);
        var info = jsnx.info(G);

      } catch(err) {
        console.error(err);
        $("#row-error").show();
        //$btn.button('reset');
      }

      try {
        var eigenvector = jsnx.eigenvectorCentrality(G)._stringValues;
      } catch(err) {
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
      G.nodes().forEach(function(node){
        // For D3 Visualizations
        let item = {};
        item['id'] = node;
        item['degree'] = degree[node];
        item['betweenness'] = betweenness[node].toFixed(10);
        let betweennessString = `${betweenness[node].toFixed(10)} (${betweennessSorted.indexOf(node).toString()})`;
        let eigenvectorString = "N/A";
        let clusteringString = "N/A";
        if (eigenvector) {
          eigenvectorString = `${eigenvector[node].toFixed(10)} (${eigenvectorSorted.indexOf(node).toString()})`;
          item['eigenvector'] = eigenvector[node].toFixed(10);
        }
        if (graphType === 'undirected') {
          clusteringString = `${clustering[node].toFixed(10)} (${clusteringSorted.indexOf(node).toString()})`;
          item['clustering'] = clustering[node].toFixed(10);
        }
        var row = [node, degree[node], betweennessString, eigenvectorString,clusteringString];
        tableData.push(row);
        nodeList.push(item);
      });
      table.clear().rows.add(tableData).draw();
      let metrics = document.getElementById("metrics");
      let viz = document.getElementById("viz");
      metrics.style.display = "block";
      viz.style.display = "block";
      //$btn.button('reset');
      allInfo = allInfo + "<div>"+info+"</div>";
      allInfo = allInfo + "<div>Density: "+density.toFixed(8)+"</div>";
      if (graphType === 'undirected') {
        allInfo = allInfo + "<div>Avg Clustering Coefficient: "+averageClustering.toFixed(8)+"</div>";
      }
      allInfo = allInfo + "<div>Transitivity: "+transitivity.toFixed(8)+"</div>";
      $('#info-panel').append(allInfo);

      if ((G.nodes().length <= 500) && (selectedGraph == 'Force Directed Layout')) {
        drawNetwork(G);
      } else {
        $('#viz-warning').show();
        $('.viz').hide();
      }

      $('#load-viz').click(function() {
        $('#viz-warning').hide();
        $('.viz').show();
        drawNetwork(G);
      });
    }, 2000);

  });




});

function reverse_sort(dict) {
  return Object.keys(dict).sort(function(a,b) {return dict[b]-dict[a]});
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
        title: function(d) { return d.label;}
      },
      edgeStyle: {fill: '#999'},
      stickyDrag: true
  });
}

function drawMatrix(edgeList, nodeList){
  console.log(edgeList, nodeList);
  var margin = {
  top: 75,
  right: 200,
  bottom: 200,
  left: 75
  };

  var width = $('#matrix-canvas').parent().width();
  var height = $('#matrix-canvas').parent().height();
  var color = d3.scaleOrdinal(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#bcbd22", "#17becf"]);
  var opacity = d3.scaleLinear()
    .range([0.5, 1])
    .clamp(true);

  var x = d3.scaleBand()
    .rangeRound([0, height-100])
    .paddingInner(0.2)
    .align(0);

  var svg = d3.select('#matrix-canvas').append('svg')
    .attr('width', width)
    .attr('height', height - 100)
    // .node();
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // console.log(canvas);
  // var context = canvas.getContext('2d');
  var idToNode = {};

  nodeList.forEach(function (n) {
    // n.degree = 0;
    idToNode[n.id] = n;
  }); 
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
  x.domain(d3.range(nodeList.length));

  opacity.domain([0, d3.max(edgeList, function (d) { return d.betweenness * 20; })]);
  console.log(nodeList);
  var matrix = nodeList.map(function (outer, i) {
    outer.index = i;
    return nodeList.map(function (inner, j) {
      return {i: i, j: j, val: i === j ? inner.degree : 0};
    });
  });
  window.matrix = matrix;
  // edgeList.forEach(function (l) {
  //   console.log(matrix[l.source.index][l.target.index], l, l.degree);
  //   matrix[l.source.index][l.target.index].val = l.degree;
  //   matrix[l.target.index][l.source.index].val = l.degree;
  // });
  // context.clearRect(0, 0, width, height);

  var row = svg.selectAll('g.row')
    .data(matrix)
    .enter().append('g')
    .attr('class', 'row')
    .attr('transform', function (d, i) { return 'translate(0,' + x(i) + ')'; })
    .each(makeRow);

  row.append('text')
    .attr('class', 'label')
    .attr('x', -4)
    .attr('y', x.bandwidth() / 2)
    .attr('dy', '0.32em')
    .text(function (d, i) { return nodeList[i].id; });

  var column = svg.selectAll('g.column')
    .data(matrix)
    .enter().append('g')
    .attr('class', 'column')
    .attr('transform', function(d, i) { return 'translate(' + x(i) + ', 0)rotate(-90)'; })
    .append('text')
    .attr('class', 'label')
    .attr('x', 4)
    .attr('y', x.bandwidth() / 2)
    .attr('dy', '0.32em')
    .text(function (d, i) { return nodeList[i].id; });


  function makeRow(rowData) {
    var cell = d3.select(this).selectAll('rect.cell')
      .data(rowData)
      .enter().append('rect')
      .attr('class', 'cell')
      .attr('x', function (d, i) { return x(i); })
      .attr('width', x.bandwidth())
      .attr('height', x.bandwidth())
      .style('fill-opacity', function (d) { return d.val > 0 ? opacity(d.val) : 1; })
      .style('fill', function (d) {
        console.log(d.val);
        if (d.val > 0)
          return color(nodeList[d.i].degree);
        // else if (d.val > 0)
        //   return '#555';
        return null;
      })
      .on('mouseover', function (d) {
        row.filter(function (_, i) { return d.i === i; })
          .selectAll('text')
          .style('fill', '#d62333')
          .style('font-weight', 'bold');
        column.filter(function (_, j) { return d.j === j; })
          .style('fill', '#d62333')
          .style('font-weight', 'bold');
      })
      .on('mouseout', function () {
        row.selectAll('text')
          .style('fill', null)
          .style('font-weight', null);
        column
          .style('fill', null)
          .style('font-weight', null);
      });

    cell.append('title')
      .text(function (d) {
        return nodeList[d.i].id + ' - ' + nodeList[d.j].id + ', degree: ' + d.val;
      });
  }
}
