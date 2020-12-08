export function drawMatrix(edgeList, nodeList, colorValues){
  console.log(edgeList, nodeList);
   // Build initial matrix
  const matrix = nodeList.map(function (outer, i) {
    outer.index = i;
    return nodeList.map(function (inner, j) {
      // if we want to use community add a check and change final zero to inner.community
      return {i: i, j: j, weight: i === j ? 0 : 0};
    });
   });
  console.log('first matrix', matrix);

   // Update matrix values depending on edges
  edgeList.forEach(function (l) {
     matrix[l.source.index][l.target.index].weight = l.weight;
     matrix[l.target.index][l.source.index].weight = l.weight;
  });
  console.log('second matrix', matrix);

  const margin = {
  top: 200,
  right: 200,
  bottom: 200,
  left: 200
  };

  let svg = d3.select('#matrix-viz')
    .append("div")
    .classed("svg-container", true)
    .append('svg')
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 1400 1000")
    .classed("svg-content-responsive", true)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  const width = +svg.attr('width') + 1000 - margin.left;
  const height = +svg.attr('height') + 1000 - margin.top;

  var color = d3.scaleLinear()
    .domain(colorValues)
    .range(["#f7fbff", "#e3eef9", "#cfe1f2", "#b5d4e9", "#93c3df", "#6daed5", "#4b97c9", "#2f7ebc", "#1864aa", "#0a4a90", "#08306b"]);

  var opacity = d3.scaleLinear()
    .range([0.5, 1])
    .clamp(true);

  var x = d3.scaleBand()
    .rangeRound([0, width])
    .paddingInner(0.1)
    .align(0);

  x.domain(d3.range(nodeList.length));

  opacity.domain([0, d3.max(edgeList, (d) => d.betweenness * 20)]);

  var row = svg.selectAll('g.row')
    .data(matrix)
    .enter().append('g')
    .attr('class', 'row')
    .attr('transform', (_, i) => 'translate(0,' + x(i) + ')')
    .each(makeRow);

  row.append('text')
    .attr('class', 'label')
    .attr('x', -14)
    .attr('y', x.bandwidth() / 2)
    .attr('dy', '0.32em')
    .style('fill', '#999')
    .style('font-size', '1rem')
    .style('text-anchor', 'end')
    .text((_, i) => nodeList[i].id);

  var column = svg.selectAll('g.column')
    .data(matrix)
    .enter().append('g')
    .attr('class', 'column')
    .attr('transform', (_, i) => 'translate(' + x(i) + ', 0)rotate(-90)')
    .append('text')
    .attr('class', 'label')
    .attr('x', 14)
    .attr('y', x.bandwidth() / 2)
    .attr('dy', '0.32em')
    .style('text-anchor', 'start')
    .text( (_, i) => nodeList[i].id);

  svg.append("g")
  .attr("class", "legendLinear")
  .attr("transform", `translate(${width},0)`);

  var legendLinear = d3.legendColor()
    .shapeWidth(50)
    .cells(colorValues)
    .scale(color)
    .labelOffset(40);

  svg.select(".legendLinear")
    .call(legendLinear);

  function makeRow(rowData) {
    var cell = d3.select(this).selectAll('rect.cell')
      .data(rowData)
      .enter().append('rect')
      .attr('class', 'cell')
      .attr('x', (_, i) => x(i))
      .attr('width', x.bandwidth())
      .attr('height', x.bandwidth())
      .style('fill-opacity', (d) => d.weight > 0 ? opacity(d.weight) : 1)
      .style('fill', (d) => color(d.weight))
      .on('mouseover', function (d) {
        row.filter((_, i) => d.i === i)
          .selectAll('text')
          .style('fill', '#000000')
          .style('font-weight', 'bold');
        column.filter((_, j) => d.j === j)
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
        return nodeList[d.i].id + ' - ' + nodeList[d.j].id + ', degree: ' + d.weight;
      });
  }
};
