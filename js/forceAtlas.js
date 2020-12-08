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
    
    var radius = d3.scaleSqrt()
        .range([0, 6]);
    // var color = d3.scaleOrdinal(d3.schemeCategory20);
    var color = d3.scaleOrdinal()
        .domain(colorValues)
        .range(["#f7fbff", "#e3eef9", "#cfe1f2", "#b5d4e9", "#93c3df", "#6daed5", "#4b97c9", "#2f7ebc", "#1864aa", "#0a4a90", "#08306b"]);

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id).distance(100).strength(1))
        .force('charge', d3.forceManyBody().strength(-1000))
        .force('collide', d3.forceCollide(18).iterations(16))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force('y', d3.forceY(0))
        .force('x', d3.forceX(0));

    svg.append("svg:defs").selectAll("marker")
        .data([{
            id: 'end-arrow',
            opacity: 1
        }, {
            id: 'end-arrow-fade',
            opacity: 0.1
        }]) // Different link/path types can be defined here
        .enter().append("svg:marker") // This section adds in the arrows
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(edgeList)
        .enter().append("line")
        // .attr("stroke-width", d => (d.weight == 0 ? 1 : d.weight))
        .attr("stroke-width", 2)
        .attr("stroke", "#88A")
        .attr("marker-end", "url(#end)");

    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(nodeList)
        .enter().append("g");

    node.append("circle")
        .attr("r", d => d.degree + 20)
        .attr("fill", d => color(d.community))
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

};
