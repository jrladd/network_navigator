export function drawForceAtlas(edgeList, nodeList, colorValues) {
    const margin = {
        top: 75,
        right: 200,
        bottom: 200,
        left: 75
    };

    var svg = d3.select('#force-atlas-viz')
        .append("div")
        .classed("svg-container", true)
        .append('svg')
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 1400 1000")
        .classed("svg-content-responsive", true)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    
    const width = +svg.attr('width') + 1400 - margin.left;
    const height = +svg.attr('height') + 1000 - margin.top;

    // var color = d3.scaleOrdinal(d3.schemeCategory20);
    var color = d3.scaleOrdinal()
        .domain(colorValues)
        .range(["#f7fbff", "#e3eef9", "#cfe1f2", "#b5d4e9", "#93c3df", "#6daed5", "#4b97c9", "#2f7ebc", "#1864aa", "#0a4a90", "#08306b"]);

    var centralitySize = d3.scaleLinear()
    	.domain([d3.min(nodeList, function(d) { return d.degree; }), d3.max(nodeList, function(d) { return d.degree; })])
	.range([15,50]);

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id))
        .force('charge', d3.forceManyBody().strength(-1000))
        .force('collide', d3.forceCollide(18).iterations(16))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force('y', d3.forceY(0))
        .force('x', d3.forceX(0));


    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(edgeList)
        .enter().append("line")
        .attr("stroke-width", d => (d.weight == 0 ? 1 : d.weight));

    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(nodeList)
        .enter().append("g");

    node.append("circle")
        .attr("r", d => centralitySize(d.degree))
        .attr("fill", d => color(d.weight)
        )
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("text")
        .text(d => d.id)
        .attr('x', 6)
        .attr('y', 3);

    node.append("title")
        .text(d => d.id);

    simulation
        .nodes(nodeList)
        .on("tick", ticked);

    simulation.force("link")
        .links(edgeList);

    function ticked() {
        link.attr("x1", d =>  d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
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
        d.fx = null;
        d.fy = null;
    }
        // A dropdown menu with three different centrality measures, calculated in NetworkX.
	// Accounts for node collision.
	var centralityDropdown = d3.select('#centrality')
		.on('change', function() { 
			var centrality = this.value;
		        var centralitySize = d3.scaleLinear()
		        	.domain([d3.min(nodeList, function(d) { return d[centrality]; }), d3.max(nodeList, function(d) { return d[centrality]; })])
   			    	.range([15,50]);
			node.select('circle').attr('r', function(d) { return centralitySize(d[centrality]); } );  
			// Recalculate collision detection based on selected centrality.
//			simulation.force("collide", d3.forceCollide().radius( function (d) { return centralitySize(d[centrality]); }));
//			simulation.alphaTarget(0.1).restart();
		});

};
