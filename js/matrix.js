// Code for Adjacency Matrix network visualzation
export function drawMatrix(edgeList, nodeList, colorValues, graphType, graphWeight) {

  // Keep track of original list while allowing nodelist to change
  let originalList = [...nodeList];
  let updatedNodeList = Array.from(Array(nodeList.length).keys())
  var selectedNodes = [];

  // Initialize variables
  var color;
  var brushArea;

  const margin = {
  top: 200,
  right: 200,
  bottom: 200,
  left: 200
  };

  // Create responsive CSV
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

  // Create brush for zooming
  const brush = d3.brush().on('end', brushed);

  // Container for legend
  svg.append("g")
  .attr("class", "legendLinear")
  .attr("transform", `translate(${width},0)`);

  // Scale for square opacity
  var opacity = d3.scaleLinear()
    .range([1, 1000])
    .clamp(true);

  // Scale for X-axis
  var x = d3.scaleBand()
    .rangeRound([0, width])
    .paddingInner(0.1)
    .align(0);

  // Keep track of node IDs
  var nodeIDs = nodeList.map(d => d.id);

  // Draw matrix
  updateFullMatrix(nodeList,edgeList,nodeIDs);

  // Function to draw matrix
  function updateFullMatrix(nodeList,edgeList,nodeIDs) {
    // Redo color scales each time to keep consistent with picker
    var origColor = $('#color-picker-matrix').val().replace(/[rgb\(\)]/gm, "").split(",");
    var newColor = origColor.map(c => { return Math.round((255-c)*0.8+parseInt(c))});
    var newRGB = `rgb(${newColor.join(",")})`;

    color = d3.scaleLinear()
      .domain([1, d3.max(colorValues)])
      .range([newRGB,$('#color-picker-matrix').val()])

    // Create and draw legend
    var legendLinear = d3.legendColor()
      .shapeWidth(50)
      .cells(colorValues.slice(1))
      .scale(color)
      .labelOffset(40);

    svg.select(".legendLinear")
      .call(legendLinear);

    // Build initial matrix
    let matrix = nodeList.map(function (outer, i) {
      outer.index = i;
      return nodeList.map(function (inner, j) {
        // if we want to use community add a check and change final zero to inner.community
        return {y: i, x: j, weight: i === j ? 0 : 0};
      });
    });
    // Update matrix values depending on edges
    edgeList.forEach(function (l,i) {
      matrix[nodeIDs.indexOf(l.source.id)][nodeIDs.indexOf(l.target.id)].weight = l.weight;
      matrix[nodeIDs.indexOf(l.target.id)][nodeIDs.indexOf(l.source.id)].weight = l.weight;
    });

    x.domain(d3.range(nodeList.length),);

    // Create and update rows
    var row = svg.selectAll('.row')
      .data(matrix);

    row.exit().remove();

    var rowEnter = row.enter().append('g');

    rowEnter.merge(row)
        .attr('class', 'row')
        .attr('transform', (_, i) => 'translate(0,' + x(i) + ')')
        .each(makeRow); 

    rowEnter.append("line")
      .attr("x2", width)
      .style("stroke", '#f4f4f4');

    svg.selectAll('.row-label').remove();

    rowEnter.merge(row).append('text')
      .attr('class', 'row-label')
      .attr('x', -14)
      .attr('y', x.bandwidth() / 2)
      .attr('dy', '0.32em')
      .style('font-size', '1rem')
      .style('text-anchor', 'end')
      .text((_, i) => nodeList[i].id);


    // Create and update columns
    var column = svg.selectAll('.column')
      .data(matrix);

    column.exit().remove();

    var columnEnter = column.enter().append('g');

    columnEnter.merge(column)
        .attr('class', 'column')
        .attr('transform', (_, i) => 'translate(' + x(i) + ', 0)rotate(-90)')

    columnEnter.append("line")
      .attr("x1", -width)
      .style("stroke", '#f4f4f4');

    svg.selectAll('.column-label').remove();

    columnEnter.merge(column)
      .append('text')
      .attr('class', 'column-label')
      .attr('x', 14)
      .attr('y', x.bandwidth() / 2)
      .attr('dy', '0.32em')
      .style('text-anchor', 'start')
      .text( (_, i) => nodeList[i].id);

    // Call brush so that brushArea is always on top
    if (brushArea) {
      brushArea.remove();
    }
    brushArea = svg.append('g');
    brushArea.call(brush);
  }


  // A function to create shaded cells in each row of matrix
  function makeRow(rowData) {
    // Create and update cells
    var cell = d3.select(this).selectAll('.matrix-cell')
      .data(rowData);

    cell.exit().remove()

    var cellEnter = cell.enter().append('rect')

    cellEnter.merge(cell)
        .attr('class', 'matrix-cell')
        .attr('x', (d, i) => x(d.x))
        .attr('width', x.bandwidth())
        .attr('height', x.bandwidth())
        .style('stroke', '#000000')
        .style('stroke-width', 0)
        .style('fill', (d) => {if (d.weight===0) {return 'white';} else {return color(d.weight)} });

    // Add title text to each cell (currently you can't see this because of the brush)
    cellEnter.append('title')
      .text(function (d) {
        return nodeList[d.y].id + ' - ' + nodeList[d.x].id + ', degree: ' + d.weight;
      });

  }

  // Reorder matrix based on centrality measures
  function updateMatrix(orderValue, orderDirection) {
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
    console.log(updatedNodeList, nodeList);
    x.domain(updatedNodeList);

    var t = svg.transition().duration(1500);

    t.selectAll(".row")
      .delay(function (d, i) {
        return x(i) * 4;
      })
      .attr("transform", function (d, i) {
        return "translate(0," + x(i) + ")";
      })
    t.selectAll(".matrix-cell")
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

  // Handle buttons for reordering matrix
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

  // When graph is brushed, zoom to the brush selection
  // (Uses only the x-axis to determine a square brush area
  function brushed() {
	  if (d3.event.selection) {
	    var [[x0,y0],[x1,y1]] = d3.event.selection;
	    var selected = updatedNodeList.filter(d => x0 < x(d) && x1 > x(d));
	    if (selectedNodes.length === 0) {
	      selectedNodes = selected.map(d => nodeList[d]);
	    } else { 
	      selectedNodes = selected.map(d => selectedNodes[d]);
	    }
	    var selectedIDs = selectedNodes.map(d => d.id);
	    var selectedEdges = edgeList.filter(e => selectedIDs.indexOf(e.source.id) !== -1 && selectedIDs.indexOf(e.target.id) !== -1);
	    updateFullMatrix(selectedNodes,selectedEdges,selectedIDs);
            $('#order-matrix-cells').prop("disabled", true);
            $('#reverse-matrix-order').prop("disabled", true);
	    brushArea.call(brush.move, null);
	  }
	  
  }

  // Restore zoom to original matrix, with full node list
  d3.select("#restore-zoom")
    .style("visibility", "visible")
    .on("click", function() {
	    updateFullMatrix(nodeList,edgeList,nodeIDs);
	    selectedNodes = [];
            $('#order-matrix-cells').prop("disabled", false);
            $('#reverse-matrix-order').prop("disabled", false);
    });

    // When searching in table, filter visualization
    var table = $('#metrics-table').DataTable();
    table.on('search.dt', function() { 
	    let nodeIds = table.rows({filter: 'applied'}).data().map(d => d[0]); 
	    d3.selectAll('.row-label').style('opacity', (_, i) => nodeIds.indexOf(nodeList[i].id) == -1 ? '0': '1');
	    d3.selectAll('.column-label').style('opacity', (_, i) => nodeIds.indexOf(nodeList[i].id) == -1 ? '0': '1');
    });

};
