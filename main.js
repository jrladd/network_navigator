$( function() {

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


  var table = $('#metrics-table').DataTable();
  $('#calculate').click(function(){
	  //var $btn = $(this).button('loading');
    $('#row-error').hide();
    $('#eigen-error').hide();

    setTimeout(function() {
      // var edges = [];
      var data = $('textarea').val();
      var graphType = $("input[name='graphType']:checked").val();
      // var graphMode = $("input[name='graphMode']:checked").val();
      var graphWeight = $("input[name='graphWeight']:checked").val();
      var edges = $.csv.toArrays(data);

      $('#info-panel').empty();

      if (graphType === 'undirected') {
        var G = new jsnx.Graph();
      } else if (graphType === 'directed') {
        var G = new jsnx.DiGraph();
      }

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
	var averageDegree = Object.values(degree).reduce((a,b) => { return a + b; }) / numberOfNodes;

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
      G.nodes().forEach(function(node){
	let betweennessString = `${betweenness[node].toFixed(4)} (${betweennessSorted.indexOf(node).toString()})`;
	let eigenvectorString = "N/A";
	let clusteringString = "N/A";
	if (eigenvector) {
		eigenvectorString = `${eigenvector[node].toFixed(4)} (${eigenvectorSorted.indexOf(node).toString()})`;
	}
	if (graphType === 'undirected') {
		clusteringString = `${clustering[node].toFixed(4)} (${clusteringSorted.indexOf(node).toString()})`;
	}
        var row = [node, degree[node], betweennessString, eigenvectorString, clusteringString];
	tableData.push(row);
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

      if (G.nodes().length <= 500) {
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
