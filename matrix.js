export function drawMatrix(edgeList, nodeList){
  var margin = {
  top: 75,
  right: 200,
  bottom: 200,
  left: 75
  };

  var width = $('#matrix-canvas').parent().width();
  var height = $('#matrix-canvas').parent().height();

  // Get values for coloring matrix, would change this to community if wanting to color by different value
  const values = [...new Set(edgeList.map(edge => edge.val))]
  values.push(0);
  values.sort((a, b) => a - b);
  var color = d3.scaleLinear()
    .domain(values)
    .range(["rgb(46, 73, 123)", "rgb(71, 187, 94)"]);

  var opacity = d3.scaleLinear()
    .range([0.5, 1])
    .clamp(true);

  var x = d3.scaleBand()
    .rangeRound([0, height-200])
    .paddingInner(0.1)
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
  x.domain(d3.range(nodeList.length));

  opacity.domain([0, d3.max(edgeList, function (d) { return d.betweenness * 20; })]);

  // Build initial matrix
  var matrix = nodeList.map(function (outer, i) {
    outer.index = i;
    return nodeList.map(function (inner, j) {
      // if we want to use community add a check and change final zero to inner.community
      return {i: i, j: j, val: i === j ? 0 : 0};
    });
  });
  window.matrix = matrix;
  // window.edgeList = edgeList;
  // Update matrix values depending on edges
  edgeList.forEach(function (l) {
    matrix[l.source.index][l.target.index].val = l.val;
    matrix[l.target.index][l.source.index].val = l.val;
  });
  // context.clearRect(0, 0, width, height);

  var row = svg.selectAll('g.row')
    .data(matrix)
    .enter().append('g')
    .attr('class', 'row')
    .attr('transform', function (d, i) { console.log('d',d,'i',i);return 'translate(0,' + x(i) + ')'; })
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

  svg.append("g")
  .attr("class", "legendLinear")
  .attr("transform", `translate(${height-190},0)`);

  var legendLinear = d3.legendColor()
    .shapeWidth(30)
    .cells(values)
    .scale(color)
    .labelOffset(20);

  svg.select(".legendLinear")
    .call(legendLinear);

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
          return color(d.val);
      })
      .on('mouseover', function (d) {
        row.filter(function (_, i) { return d.i === i; })
          .selectAll('text')
          .style('fill', '#000000')
          .style('font-weight', 'bold');
        column.filter(function (_, j) { return d.j === j; })
          .style('fill', '#000000')
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
};