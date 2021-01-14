export function drawForceLayout(edgeList, nodeList, colorValues, graphType, graphWeight) {
    
    let lineType = $("input[name='lineType']:checked").val();
    let centrality = 'degree';
    const margin = {
        top: 75,
        right: 200,
        bottom: 200,
        left: 75
    };

    // Make object of all neighboring nodes.
    var linkedByIndex = {};
    edgeList.forEach(function(d) {
  	  linkedByIndex[d.source.id + ',' + d.target.id] = 1;
  	  linkedByIndex[d.target.id + ',' + d.source.id] = 1;
    });
  
    // A function to test if two nodes are neighboring.
    function neighboring(a, b) {
  	  return linkedByIndex[a.id + ',' + b.id];
    }

    var svg = d3.select('#force-layout-viz')
        .append("div")
        .classed("svg-container", true)
        .append('svg')
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 1400 1000")
        .classed("svg-content-responsive", true);

    // Call zoom for svg container.
    svg.call(d3.zoom().scaleExtent([0.75,4]).on('zoom', zoomed));

    svg.append('rect')
	.attr('width', '100%')
	.attr('height', '100%')
	.attr('fill', 'transparent')
	.on('click', function() {
                    // Restore nodes and links to normal opacity.
                    d3.selectAll('.edge').style('opacity', '1');
                    d3.selectAll('.node').style('opacity', '1');
                    d3.selectAll('.nodeLabel').style('opacity', '1');
	});

    var container = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    
    const width = +svg.attr('width') + 1400 - margin.left;
    const height = +svg.attr('height') + 1000 - margin.top;
    
    var color = d3.scaleOrdinal()
        .domain(colorValues)
        .range([ "#cfe1f2", "#b5d4e9", "#93c3df", "#6daed5", "#4b97c9", "#2f7ebc", "#1864aa", "#0a4a90", "#08306b"]);

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id).distance(100).strength(1))
        .force('charge', d3.forceManyBody().strength(-1000))
        .force('collide', d3.forceCollide().radius(d => d[`radius_${centrality}`]))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force('y', d3.forceY(0))
        .force('x', d3.forceX(0));

    container.append("defs").selectAll("marker")
        .data([{id: 'end-arrow', opacity: 1}, {id: 'end-arrow-fade',opacity: 0.1}]) // Different link/path types can be defined here
        .enter().append("marker") // This section adds in the arrows
            .attr("id", d => d.id)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", -0.5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
        .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .style("fill", "#555");

    var link = container.append("g")
        .attr("class", "links")
        .attr("fill", "none")
        .selectAll("path")
        .data(edgeList)
        .enter().append("path")
	    .classed("edge", true)
            .attr("stroke-width", d => graphWeight === 'weighted' ? d.scaled_weight : 3)
            .attr("stroke", "#88A")
            .attr("marker-end", graphType === 'directed' ? "url(#end-arrow)": "url()");

    var node = container.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodeList)
        .enter().append("circle")
	.classed("node", true)
        .attr("r", d => d[`radius_${centrality}`])
        .attr("fill", $('#color-picker').val())
	.attr("stroke", "white")
	.attr("stroke-width", 2)
        .on('click', function(d, i) {
                    // Ternary operator restyles links and nodes if they are adjacent.
                    d3.selectAll('.edge').style('opacity', function (l) {
              	      return l.target == d || l.source == d ? 1 : 0.1;
                    });
                    d3.selectAll('.node').style('opacity', function (n) {
              	      return neighboring(d, n) ? 1 : 0.1;
                    });
                    d3.selectAll('.nodeLabel').style('opacity', function (n) {
              	      return neighboring(d, n) ? 1 : 0.1;
                    });
                    d3.select(this).style('opacity', 1);
		    d3.select(`#node${nodeList.indexOf(d)}`).style('opacity', 1);
        })
        .on("dblclick", releasenode)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    var nodeLabel = container.append("g")
        .attr("class", "nodeLabels")
        .selectAll("text")
        .data(nodeList)
        .enter().append("text")
        .text(d => d.id)
	.classed("nodeLabel", true)
	.attr("id", d => `node${nodeList.indexOf(d)}`)
        .attr('dx', d => d[`radius_${centrality}`] + 5)
        .attr('dy', 3)
        .style('font-size', d => d[`fontSize_${centrality}`]);

    simulation
        .nodes(nodeList)
        .on("tick", ticked);

    simulation.force("link")
        .links(edgeList);

    function ticked() {
        link.attr("d", function (d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = lineType === 'curved' ? Math.sqrt(dx * dx + dy * dy) : 0;
            return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
        });

        // node.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
        node.attr("cx", function (d) {
                return d.x;
            })
            .attr("cy", function (d) {
                return d.y;
            });

        nodeLabel
            .attr('x', d => d.x)
            .attr('y', d => d.y);
    }
    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        // d.fx = null;
        // d.fy = null;
    }

    function releasenode(d) {
        d.fx = null;
        d.fy = null;
    }

    // Zooming function translates the size of the svg container.
    function zoomed() {
    	  container.attr("transform", "translate(" + d3.event.transform.x + ", " + d3.event.transform.y + ") scale(" + d3.event.transform.k + ")");
    }

        // A dropdown menu with three different centrality measures, calculated in NetworkX.
	// Accounts for node collision.
	d3.select('#centrality').on('change', function() { 
            centrality = this.value;
            node.attr('r', d => d[`radius_${centrality}`]);
            nodeLabel.attr('font-size', d => d[`fontSize_${centrality}`]);
			// Recalculate collision detection based on selected centrality.
			simulation.force("collide", d3.forceCollide().radius( function (d) { return d[`radius_${centrality}`]; }));
			simulation.alpha(1).restart();
	});
	d3.select('#edge-weight').on('change', function() {
        link.attr("stroke-width", d => this.checked ? d.scaled_weight : 3)
            .attr("stroke", "#88A")
            .attr("marker-end", graphType === 'directed' ? "url(#end-arrow)" : "url()");
    });
    
    d3.selectAll("input[name='lineType']").on("change", function () {
        lineType = $("input[name='lineType']:checked").val();
        simulation
            .nodes(nodeList)
            .on("tick", ticked);

        simulation.force("link")
            .links(edgeList);
        
        simulation.alpha(1).restart();
    });

};
