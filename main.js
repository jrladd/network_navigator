$( function() {

  $('.btn').click(function(){
    var $btn = $(this).button('loading');
    setTimeout(function() {
      var weighted_edges = [];
      var data = $('textarea').val();
      var list = data.split("\n");
      var rows = '';
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
      // console.log(betweenness, clustering, degree);
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
    }, 2000);

  });


});
