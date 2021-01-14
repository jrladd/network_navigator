export function drawArcDiagram(edgeList, nodeList, colorValues, graphType, graphWeight) {
    // Add properties to control showing and hiding elements
    nodeList = nodeList.map(node => ({...node, nodeClicked: false}));
    edgeList = edgeList.map(edge => ({...edge, edgeClicked: false}));
    let originalList = [...nodeList];
    let graphDirection = 'vertical';
    const margin = {
        top: -200,
        right: 75,
        bottom: 75,
        left: 100
    };

    var svg = d3.select('#arc-diagram-viz')
        .append("div")
        .classed("svg-container", true)
        .append('svg')
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "-50 -300 1600 1600")
        .classed("svg-content-responsive", true);
        // .append('g')
        // .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    const step = 16;
    const width = +svg.attr('width') + 1200 - margin.left;
    const height = +svg.attr('height') + 1200 - margin.left;
    const extent = [[margin.left, margin.top], [width - margin.right, height - margin.top]];

    // Call zoom for svg container.
    svg.call(d3.zoom().on('zoom', zoomed));

    var container = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var color = d3.scaleOrdinal(d3.schemeCategory20);

    // List of groups
    var allGroups = nodeList.map(d => (d.community == 'undefined' ? 1 : d.community))
    allGroups = [...new Set(allGroups)]

    // // A color scale for groups:
    var color = d3.scaleOrdinal()
        .domain(colorValues)
        .range(["#cfe1f2", "#b5d4e9", "#93c3df", "#6daed5", "#4b97c9", "#2f7ebc", "#1864aa", "#0a4a90", "#08306b"]);

    // A linear scale for node size
    var size = d3.scaleLinear()
        .domain([1, 10])
        .range([10, 15]);

    var x = d3.scalePoint()
        .domain(nodeList.map(d => d.id))
        .range([0, width]);

    var y = d3.scalePoint()
        .domain(nodeList.map(d => d.id))
        .range([0, height]);

    var labelsDiv = container.append("g")
        .style("font-family", "sans-serif")
        .style("font-size", 14)
        .attr("text-anchor", "end")
        .attr("id", "labels");

    var label = labelsDiv.selectAll("text")
        .data(nodeList)
        .enter().append("text")
            .attr("x", -16)
            .attr("fill", d => color(d.community))
            .text(d => d.id)
            .attr("transform", d => graphDirection === 'vertical' ? `translate(${margin.left},${d.y = y(d.id)})rotate(0)` : `translate(${d.x = x(d.id)}, ${height - margin.left})rotate(-45)`)
            .attr("y", graphDirection === 'vertical' ? "0.35em" : 10);

    var nodesDiv = container.append("g")
        .style("font-family", "sans-serif")
        .style("font-size", 14)
        .attr("text-anchor", "end")
        .attr("id", "nodes");

    var node = nodesDiv.selectAll("circle")
        .data(nodeList)
        .enter().append("circle")
	    .classed("node-arc", true)
            .attr("r", d => size(d.degree))
            .attr("fill", $('#color-picker-arc').val())//d => color(d.community))
	    .attr("stroke", "white")
	    .attr("stroke-width", 2)
            .attr("transform", d => graphDirection === 'vertical' ? `translate(${margin.left},${d.y = y(d.id)})` : `translate(${d.x = x(d.id)}, ${height - margin.left})`);

    var arcsDiv = container.insert("g", "*")
        .attr("fill", "none")
        .style("stroke-opacity", 0.6)
        .style("stroke-width", 1.5)
        .attr("id", "arcs");

    var path = arcsDiv.selectAll("path")
        .data(edgeList)
        .enter().append("path")
            .style("stroke", d => d.source.id === d.target.id ? color(d.source.community) : "#aaa")
            .attr("d", d => arc(d));


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
            .on("dblclick", releaseNode)
            .on("click", d => {
                if (!d.nodeClicked) {
                    d.nodeClicked = true;
                    label.filter(label => label.id === d.id).attr('nodeClicked', true);
                    path.filter(path => path.source.id === d.id || path.target.id === d.id)
                        .attr('edgeClicked', path => {
                            path.edgeClicked = true
                            return true
                        });
                    nodeEvent(d);
                }
            })
            .on("mouseover", d => {
                if (!d.nodeClicked) {
                    nodeEvent(d)
                }
            })
            .on("mouseout", d => {
                if (!d.nodeClicked) {
                    mouseOut()
                }
            });

    function releaseNode(){
        label.attr('nodeClicked', d => d.nodeClicked = false);
        path.attr('edgeClicked', d => d.edgeClicked = false);
        mouseOut();
    }

    function nodeEvent(d){
        var nodesToHighlight = edgeList.map(function (edge) {
            return edge.source.id === d.id ? edge.target : edge.target.id === d.id ? edge.source : 0
        }).filter(function (d) {
            return d
        });
        nodesToHighlight.push(d);

        nodeList.map(d => {if (d.nodeClicked){nodesToHighlight.push(d)}});

        nodesToHighlight = nodesToHighlight.reduce((unique, o) => {
            if (!unique.some(obj => obj.id === o.id)) {
                unique.push(o);
            }
            return unique;
        }, []);

        label.attr('fill', '#ccc');
        label.filter(label => label.id === d.id)
            .attr('fill', 'black')
            .style('font-weight', 'bold');
        label.filter(label => nodesToHighlight.some(node => label.id === node.id))
            .attr('nodeClicked', label => {
                label.nodeClicked = true;
                return true
            })
            .attr('fill', '#333');
        path.filter(path => path.source.id === d.id ||path.target.id === d.id)
            .style('stroke', '#333')
            .style('stroke-opacity', 1);
    }
    function mouseOut(){
        label.filter(label => !label.nodeClicked)
            .attr("fill", d => color(d.community))
            .style('font-weight', 'normal');
        path.filter(path => !path.edgeClicked)
            .style("stroke", d =>  d.source.id === d.target.id ? color(d.source.community) : "#aaa")
            .style("stroke-opacity", 0.6);
    }

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

    function updateArc(orderValue, orderDirection) {
        let sortOrder, updatedNodeList;
        if (orderValue === 'original') {
            updatedNodeList = orderDirection ? [...originalList].reverse() : originalList;
        } else {
            orderValue = orderValue === 'name' ? 'id' : orderValue;
            sortOrder = (orderValue === 'id' || orderValue === 'original') ? nodeList.map(node => node[orderValue]).sort() : nodeList.map(node => node[orderValue]).sort((a, b) => a - b);
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

	d3.select('#centrality-arc').on('change', function() { 
            centrality = this.value;
            node.attr('r', d => d[`radius_${centrality}`]);
/*            nodeLabel.attr('font-size', d => d[`fontSize_${centrality}`]);
			// Recalculate collision detection based on selected centrality.
			simulation.force("collide", d3.forceCollide().radius( function (d) { return d[`radius_${centrality}`]; }));
			simulation.alpha(1).restart();*/
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
    	  container.attr("transform", "translate(" + d3.event.transform.x + ", " + d3.event.transform.y + ") scale(" + d3.event.transform.k + ")");
    }


};
