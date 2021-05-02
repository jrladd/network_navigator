// Complete code for Arc Diagram network viz
export function drawArcDiagram(edgeList, nodeList, colorValues, graphType, graphWeight) {

    // Add properties to control showing and hiding elements
    nodeList = nodeList.map(node => ({...node, nodeClicked: false}));
    edgeList = edgeList.map(edge => ({...edge, edgeClicked: false}));

    // Initialize variables
    let originalList = [...nodeList];
    let graphDirection = 'vertical';
    let selectedNodes = [];
    const margin = {
        top: -200,
        right: 75,
        bottom: 75,
        left: 100
    };

    // Create Responsive SVG
    var svg = d3.select('#arc-diagram-viz')
        .append("div")
        .classed("svg-container", true)
        .append('svg')
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "-50 -300 1600 1600")
        .classed("svg-content-responsive", true);
   
    const step = 16;
    const width = +svg.attr('width') + 1200 - margin.left;
    const height = +svg.attr('height') + 1200 - margin.left;
    const extent = [[margin.left, margin.top], [width - margin.right, height - margin.top]];

    // Create and call zoom for SVG
    var zoom = d3.zoom().extent(extent).scaleExtent([0.75, 4]).on('zoom', zoomed);
    svg.call(zoom);

    // Create rectangle and container for visualization
    svg.append('rect')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', 'transparent')
        .on('click', function () {
            // Restore nodes and links to normal opacity.
            releaseNode();
        });

    var container = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // A linear scale for node size
    var size = d3.scaleLinear()
        .domain([15, 50])
        .range([3, 6]);

    // Scales for horizontal (x) or vertical (y) orientation
    var x = d3.scalePoint()
        .domain(nodeList.map(d => d.id))
        .range([0, width]);

    var y = d3.scalePoint()
        .domain(nodeList.map(d => d.id))
        .range([0, height]);

    // Create labels
    var labelsDiv = container.append("g")
        .style("font-family", "sans-serif")
        .style("font-size", "8px")
        .attr("text-anchor", "end")
        .attr("id", "labels");

    var label = labelsDiv.selectAll("text")
        .data(nodeList)
        .enter().append("text")
            .attr("x", -16)
            .attr("fill", 'black')
            .text(d => d.id)
            .attr("transform", d => graphDirection === 'vertical' ? `translate(${margin.left},${d.y = y(d.id)})rotate(0)` : `translate(${d.x = x(d.id)}, ${height - margin.left})rotate(-45)`)
            .attr("y", graphDirection === 'vertical' ? "0.35em" : 10);

    // Create container and circles for nodes
    var nodesDiv = container.append("g")
        .style("font-family", "sans-serif")
        .style("font-size", "8px")
        .attr("text-anchor", "end")
        .attr("id", "nodes");

    var node = nodesDiv.selectAll("circle")
        .data(nodeList)
        .enter().append("circle")
	    .classed("node-arc", true)
            .attr("r", d => size(d.radius_degree))
            .attr("fill", $('#color-picker-arc').val())
	    .attr("stroke", "white")
	    .attr("stroke-width", 2)
            .attr("transform", d => graphDirection === 'vertical' ? `translate(${margin.left},${d.y = y(d.id)})` : `translate(${d.x = x(d.id)}, ${height - margin.left})`);

    // Create container and paths for arcs (edges)
    var arcsDiv = container.insert("g", "*")
        .attr("fill", "none")
        .style("stroke-opacity", 0.6)
        .style("stroke-width", 1.5)
        .attr("id", "arcs");

    var path = arcsDiv.selectAll("path")
        .data(edgeList)
        .enter().append("path")
            .style("stroke", "#aaa")
            .attr("d", d => arc(d));

    // Create overlays to handle mouse events
    var overlaysDiv = container.append("g")
        .attr("class", "overlays")
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .attr("id", "overlays");

    var overlay = overlaysDiv.selectAll("rect")
        .data(nodeList)
        .enter().append("rect")
            .attr("height", step)
            .attr("width", graphDirection === 'vertical' ? margin.left + 40 : margin.left + 50)
            .attr("transform", d => graphDirection === 'vertical' ? `translate(${margin.left-90},${d.y = y(d.id) - 8})rotate(0)` : `translate(${d.x = x(d.id)- 90}, ${height - margin.left + 80})rotate(-45)`)
            .on("click", d => {
                if (!d.nodeClicked) {
                    d.nodeClicked = true;                    
                    path.filter(path => path.source.id === d.id || path.target.id === d.id)
                        .attr('edgeClicked', path => {
                            path.edgeClicked = true
                            return true
                        });
                    nodeEvent(d, 'click');
                }
            })
            .on("mouseover", d => {
                if (!d.nodeClicked) {
                    nodeEvent(d, 'mouseover');
                }
            })
            .on("mouseout", mouseOut);

    // Handle node behavior for click and mouse events
    function releaseNode(){
        selectedNodes = [];
        label.attr('nodeClicked', d => d.nodeClicked = false);
        path.attr('edgeClicked', d => d.edgeClicked = false);
        mouseOut();
    }

    function nodeEvent(d, typeOfEvent){
        
        var nodesToHighlight = edgeList.map(function (edge) {
            return edge.source.id === d.id ? edge.target : edge.target.id === d.id ? edge.source : 0
        }).filter(function (d) {
            return d
        });
       
        nodesToHighlight.push(d);
        nodesToHighlight = [...nodesToHighlight, ...selectedNodes];
        if (typeOfEvent === 'click') {
            selectedNodes = nodesToHighlight; 
        }
        
        nodesToHighlight = nodesToHighlight.reduce((unique, o) => {
            if (!unique.some(obj => obj.id === o.id)) {
                unique.push(o);
            }
            return unique;
        }, []);
        label.attr('fill', '#ccc');
        label.filter(label => label.id === d.id).attr('nodeClicked', true);
        label.filter(label => label.nodeClicked)
            .attr('fill', 'black')
            .style('font-weight', 'bold');
        label.filter(label => nodesToHighlight.some(node => label.id === node.id))
            .attr('fill', '#333');
        path.filter(path => path.source.id === d.id ||path.target.id === d.id)
            .style('stroke', '#333')
            .style('stroke-opacity', 1);
    }

    function mouseOut(){
        label.filter(label => !selectedNodes.some(node => label.id === node.id))
            .attr("fill", 'black')
            .style('font-weight', 'normal');
        path.filter(path => !path.edgeClicked)
            .style("stroke", "#aaa")
            .style("stroke-opacity", 0.6);
    }

    // Coordinates for drawing arcs
    function arc(d) {
        if (graphDirection === 'vertical') {
            const y1 = y(d.source.id);
            const y2 = y(d.target.id);
            const r = Math.abs(y2 - y1) / 2;
            return `M${margin.left},${y1}A${r},${r} 0,0,${y1 < y2 ? 1 : 0} ${margin.left},${y2}`;
        } else {
            const x1 = x(d.source.id)
            const x2 = x(d.target.id)
            const r = Math.abs(x2 - x1) / 2;
            return `M${x1} ${height - margin.left} A ${r},${r} 0 0,${x1 < x2 ? 1 : 0} ${x2},${height - margin.left}`;
        }
        
    }


    // Handle movement of arcs when graph updates
    function updateArc(orderValue, orderDirection) {
        let sortOrder, updatedNodeList;
        if (orderValue === 'original') {
            updatedNodeList = orderDirection ? [...originalList].reverse() : originalList;
        } else {
            orderValue = orderValue === 'name' ? 'id' : orderValue;
            sortOrder = (orderValue === 'id') ? nodeList.map(node => node[orderValue]).sort() : nodeList.map(node => node[orderValue]).sort((a, b) => a - b);
            sortOrder = orderDirection ? [...sortOrder].reverse() : sortOrder;
            updatedNodeList = nodeList.sort((a, b) => sortOrder.indexOf(a[orderValue]) - sortOrder.indexOf(b[orderValue]));
        }        
        y.domain(updatedNodeList.map(d => d.id));
        x.domain(updatedNodeList.map(d => d.id));

        const t = container.transition()
            .duration(750);

        label.transition(t)
            .delay((d, i) =>  i * 20)
            .attr("transform", d => graphDirection === 'vertical' ? `translate(${margin.left},${d.y = y(d.id)})rotate(0)` : `translate(${d.x = x(d.id)}, ${height - margin.left})rotate(-45)`)
            .attr("y", graphDirection === 'vertical' ? "0.35em" : 10);

        node.transition(t)
            .delay((d, i) => i * 20)
            .attr("transform", d => graphDirection === 'vertical' ? `translate(${margin.left},${d.y = y(d.id)})` : `translate(${d.x = x(d.id)}, ${height - margin.left})`);

        path.transition(t)
            .delay((d, i) => i*10)
            //.duration(750 + nodeList.length * 20)
            .attrTween("d", d => () => arc(d));

        overlay.transition(t)
            .delay((d, i) => i * 20)
            .attr("width", graphDirection === 'vertical' ? margin.left + 40 : margin.left + 50)
            .attr("transform", d => graphDirection === 'vertical' ? `translate(${margin.left-90},${d.y = y(d.id) - 8})rotate(0)` : `translate(${d.x = x(d.id)- 90}, ${height - margin.left + 80})rotate(-45)`);

    }

    // Buttons for changing centrality, node order, and graph orientation
    d3.select('#centrality-arc').on('change', function() { 
        centrality = this.value;
        node.attr('r', d => size(d[`radius_${centrality}`]));
    });

    // A dropdown menu for color with different centrality measures
    d3.select('#color-scale-arc').on('change', function() { 
        centrality = this.value;
	console.log(centrality);
	if (centrality === 'none') {
		node.attr('fill', $('#color-picker-arc').val());
	} else {
                // Create color scale
                var origColor = $('#color-picker-arc').val().replace(/[rgb\(\)]/gm, "").split(",");
                var newColor = origColor.map(c => { return Math.round((255-c)*0.9+parseInt(c))});
                var newRGB = `rgb(${newColor.join(",")})`;
            
                var color = d3.scaleLinear()
                  .domain([0, d3.max(nodeList, d => d[`${centrality}`])])
                  .range([newRGB,$('#color-picker-arc').val()])

		// Fill according to scale
		node.attr('fill', d => color(d[`${centrality}`]));
	}
    });

    d3.select('#order-arc-nodes').on('change', function () {
        let orderValue = this.value;
        let orderDirection = $('#reverse-arc-order').is(':checked');
        updateArc(orderValue, orderDirection);
    });

    d3.select('#reverse-arc-order').on('change', function () {
        let orderDirection = this.checked;
        let orderValue = $('#order-arc-nodes').val();
        updateArc(orderValue, orderDirection);
    });

    d3.selectAll("input[name='graphDirection']").on("change", function () {
        graphDirection = $("input[name='graphDirection']:checked").val();
        let orderDirection = $('#reverse-arc-order').is(':checked');
        let orderValue = $('#order-arc-nodes').val();
        updateArc(orderValue, orderDirection);
    });

    // Zooming function translates the size of the svg container.
    function zoomed() {
	  let transform = d3.event.transform;
	  if (graphDirection === 'vertical') {
		  transform.x = 0;
	  } else {
		  transform.y = Math.min(0, transform.y);
	  }
	  container.attr("transform", transform.toString());
    }

    // Restore to original zoom
    $('#restore-zoom').on('click', function () {
        if ($('#arc-diagram-viz').is(":visible")) {
            container.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        }
    });

    // When searching in table, filter visualization
    var table = $('#metrics-table').DataTable();
    table.on('search.dt', function() { 
	    let nodeIds = table.rows({filter: 'applied'}).data().map(d => d[0]); 
	    node.style('opacity', d => nodeIds.indexOf(d.id) == -1 ? '0': '1');
	    label.style('opacity', d => nodeIds.indexOf(d.id) == -1 ? '0': '1');
	    path.style('stroke-opacity', l => nodeIds.indexOf(l.target.id) !== -1 && nodeIds.indexOf(l.source.id) !== -1 ? '1': '0');
    });

};
