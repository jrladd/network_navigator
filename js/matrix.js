export function drawMatrix(edgeList, nodeList, colorValues, graphType, graphWeight) {

  let originalList = [...nodeList];
   // Build initial matrix
  const matrix = nodeList.map(function (outer, i) {
    outer.index = i;
    return nodeList.map(function (inner, j) {
      // if we want to use community add a check and change final zero to inner.community
      return {y: i, x: j, weight: i === j ? 0 : 0};
    });
   });

   // Update matrix values depending on edges
  edgeList.forEach(function (l) {
     matrix[l.source.index][l.target.index].weight = l.weight;
     matrix[l.target.index][l.source.index].weight = l.weight;
  });

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

  var origColor = $('#color-picker-matrix').val().replace(/[rgb\(\)]/gm, "").split(",");
  var newColor = origColor.map(c => { return Math.round((255-c)*0.8+parseInt(c))});
  var newRGB = `rgb(${newColor.join(",")})`;

  var color = d3.scaleLinear()
    .domain([d3.min(colorValues), d3.max(colorValues)])
    .range([newRGB,$('#color-picker-matrix').val()])
    //.range(["#f7fbff", "#e3eef9", "#cfe1f2", "#b5d4e9", "#93c3df", "#6daed5", "#4b97c9", "#2f7ebc", "#1864aa", "#0a4a90", "#08306b"]);

  var opacity = d3.scaleLinear()
    .range([0.5, 1])
    .clamp(true);

  var x = d3.scaleBand()
    .rangeRound([0, width])
    .paddingInner(0.1)
    .align(0);

  x.domain(d3.range(nodeList.length),);

  var row = svg.selectAll('row')
    .data(matrix)
    .enter().append('g')
      .attr('class', 'row')
      .attr('transform', (_, i) => 'translate(0,' + x(i) + ')')
      .each(makeRow);

  row.append("line")
    .attr("x2", width)
    .style("stroke", '#fff');

  row.append('text')
    .attr('class', 'label')
    .attr('x', -14)
    .attr('y', x.bandwidth() / 2)
    .attr('dy', '0.32em')
    .style('fill', '#999')
    .style('font-size', '1rem')
    .style('text-anchor', 'end')
    .text((_, i) => nodeList[i].id);

  var column = svg.selectAll('column')
    .data(matrix)
    .enter().append('g')
      .attr('class', 'column')
      .attr('transform', (_, i) => 'translate(' + x(i) + ', 0)rotate(-90)')

  column.append("line")
    .attr("x1", -width)
    .style("stroke", '#fff');

  column
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
    var cell = d3.select(this).selectAll('.matrix-cell')
      .data(rowData.filter((d) => d.weight))
      .enter().append('rect')
        .attr('class', 'matrix-cell')
        .attr('x', (d, i) => x(d.x))
        .attr('width', x.bandwidth())
        .attr('height', x.bandwidth())
        .style('stroke', '#000000')
        .style('stroke-width', 0)
        .style('fill-opacity', (d) => d.weight > 0 ? opacity(d.weight) : 1)
        .style('fill', (d) => color(d.weight))
        .on('mouseover', function (d) {
          d3.select(this).style('stroke-width', 1);
          row.filter((_, i) => d.y === i)
            .selectAll('text')
            .style('fill', '#000000')
            .style('font-weight', 'bold');
          column.filter((_, j) => d.x === j)
            .style('fill', '#000000')
            .style('font-weight', 'bold');
        })
        .on('mouseout', function () {
          d3.select(this).style('stroke-width', 0)
          row.selectAll('text')
            .style('fill', null)
            .style('font-weight', null);
          column
            .style('fill', null)
            .style('font-weight', null);
        });
    cell.append('title')
      .text(function (d) {
        return nodeList[d.y].id + ' - ' + nodeList[d.x].id + ', degree: ' + d.weight;
      });
  }
  function updateMatrix(orderValue, orderDirection) {
    let updatedNodeList;
    if (orderValue === 'original') {
      updatedNodeList = orderDirection ? [...originalList].reverse() : originalList;
      updatedNodeList = d3.range(updatedNodeList.length).sort((a, b) => updatedNodeList[a].index - updatedNodeList[b].index);
    } else {
      updatedNodeList = (orderValue === 'name') ? 
        (orderDirection ? 
          d3.range(nodeList.length).sort((a, b) => d3.descending(nodeList[a].id, nodeList[b].id))
        :
          d3.range(nodeList.length).sort((a, b) => d3.ascending(nodeList[a].id, nodeList[b].id))
        ) :
        (orderDirection ?
          d3.range(nodeList.length).sort((a, b) => nodeList[b][orderValue] - nodeList[a][orderValue]).reverse()
        :
          d3.range(nodeList.length).sort((a, b) => nodeList[b][orderValue] - nodeList[a][orderValue])
        )
    }
    x.domain(updatedNodeList,);

    var t = svg.transition().duration(1500);

    t.selectAll(".row")
      .delay(function (d, i) {
        return x(i) * 4;
      })
      .attr("transform", function (d, i) {
        return "translate(0," + x(i) + ")";
      })
    t.selectAll(".cell")
      .delay(function (d) {
        return x(d.x) * 4;
      })
      .attr("x", function (d) {
        return x(d.x);
      });

    t.selectAll(".column")
      .delay(function (d, i) {
        return x(i) * 4;
      })
      .attr("transform", function (d, i) {
        return "translate(" + x(i) + ")rotate(-90)";
      });
  }

  d3.select('#order-matrix-cells').on('change', function () {
    let orderValue = this.value;
    let orderDirection = $('#reverse-matrix-order').is(':checked');
    updateMatrix(orderValue, orderDirection);
  });

  d3.select('#reverse-matrix-order').on('change', function () {
    let orderDirection = this.checked;
    let orderValue = $('#order-matrix-cells').val();
    updateMatrix(orderValue, orderDirection);
  });
};
