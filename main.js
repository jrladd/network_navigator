$( function() {

  $('.btn').click(function(){
    var $btn = $(this).button('loading');
    setTimeout(function() {
      var weighted_edges = [];
      var data = $('textarea').val();
      var list = data.split("\n");
      var rows = '';
      var allInfo = '';
      list.forEach(function(l){
        var items = l.split(",");
        weighted_edges.push(items);
      });

      $('tbody').empty();

      // console.log(weighted_edges);
      var G = new jsnx.Graph();
      G.addWeightedEdgesFrom(weighted_edges);
      // console.log(G.nodes());
      // console.log(G.edges());
      var betweenness = jsnx.betweennessCentrality(G)._stringValues;
      var clustering = jsnx.clustering(G)._stringValues;
      var degree = G.degree()._stringValues;
      var eigenvector = jsnx.eigenvectorCentrality(G)._stringValues;
      var density = jsnx.density(G);
      var averageClustering = jsnx.averageClustering(G);
      var transitivity = jsnx.transitivity(G);
      var info = jsnx.info(G);
      G.nodes().forEach(function(node){
        var row = '<tr>';
        row = row + '<td>' + node + '</td>'
        row = row + '<td>' + degree[node] + '</td>';
        row = row + '<td>' + betweenness[node].toFixed(10) + '</td>';
        row = row + '<td>' + eigenvector[node].toFixed(10) + '</td>';
        row = row + '<td>' + clustering[node].toFixed(10) + '</td>';
        rows = rows + row
      });
      $('tbody').append(rows);
      $.bootstrapSortable({ applyLast: true });
      $.bootstrapSortable({ sign: 'reversed' })
      $('.collapse').collapse('show');
      $btn.button('reset');
      allInfo = allInfo + "<div>"+info+"</div>";
      allInfo = allInfo + "<div>Density: "+density.toFixed(8)+"</div>";
      allInfo = allInfo + "<div>Avg Clustering Coefficient: "+averageClustering.toFixed(8)+"</div>";
      allInfo = allInfo + "<div>Transitivity: "+transitivity.toFixed(8)+"</div>";
      $('.panel-body').append(allInfo);
    }, 2000);

  });


});
