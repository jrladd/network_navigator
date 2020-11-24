export function drawMatrix(edgeList, nodeList, matrix, colorValues){
  const margin = {
  top: 200,
  right: 200,
  bottom: 200,
  left: 200
  };

  let svg = d3.select('#matrix-viz')
    .append("div")
    // Container class to make it responsive.
    .classed("svg-container", true)
    .append('svg')
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 1400 1000")
    .classed("svg-content-responsive", true)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  const width = +svg.attr('width') + 1000 - margin.left;
  const height = +svg.attr('height') + 1000 - margin.top;

  // Get colorValues for coloring matrix, would change this to community if wanting to color by different value
  var color = d3.scaleLinear()
    .domain(colorValues)
    .range(["rgb(46, 73, 123)", "rgb(71, 187, 94)"]);

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
    .attr('transform', (d, i) => 'translate(0,' + x(i) + ')')
    .each(makeRow);

  row.append('text')
    .attr('class', 'label')
    .attr('x', -14)
    .attr('y', x.bandwidth() / 2)
    .attr('dy', '0.32em')
    .text((d, i) => nodeList[i].id);

  var column = svg.selectAll('g.column')
    .data(matrix)
    .enter().append('g')
    .attr('class', 'column')
    .attr('transform', function(d, i) { return 'translate(' + x(i) + ', 0)rotate(-90)'; })
    .append('text')
    .attr('class', 'label')
    .attr('x', 14)
    .attr('y', x.bandwidth() / 2)
    .attr('dy', '0.32em')
    .text(function (d, i) { return nodeList[i].id; });

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
      .attr('x', function (d, i) { console.log('makeRow', d, i); return x(i); })
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
