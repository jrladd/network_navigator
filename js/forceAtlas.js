export function drawForceAtlas(edgeList, nodeList, colorValues) {
    console.log(edgeList, nodeList);
    const margin = {
        top: 75,
        right: 200,
        bottom: 200,
        left: 75
    };

    var svg = d3.select('#force-atlas-viz')
        .append("div")
        // Container class to make it responsive.
        .classed("svg-container", true)
        .append('svg')
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 1400 1000")
        .classed("svg-content-responsive", true)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    
    const width = +svg.attr('width') + 1400 - margin.left;
    const height = +svg.attr('height') + 1000 - margin.top;
    console.log('height', height, width);

    var color = d3.scaleOrdinal(d3.schemeCategory20);

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function (d) {
            return d.id;
        }))
        .force('charge',
            d3.forceManyBody().strength(-1000)
        )
        .force('collide', d3.forceCollide(18).iterations(16))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force('y', d3.forceY(0))
        .force('x', d3.forceX(0));


    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(edgeList)
        .enter().append("line")
        .attr("stroke-width", function (d) {
            return (d.weight == 0 ? d.val : d.weight)
        });

    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(nodeList)
        .enter().append("g")

    var circles = node.append("circle")
        .attr("r", function (d) {
            return d.degree + 20;
        })
        .attr("fill", function (d) {
            return '#000000';
            // color(d.community);
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    var labels = node.append("text")
        .text(function (d) {
            return d.id;
        })
        .attr('x', 6)
        .attr('y', 3);

    node.append("title")
        .text(function (d) {
            return d.id;
        });

    simulation
        .nodes(nodeList)
        .on("tick", ticked);

    simulation.force("link")
        .links(edgeList);

    function ticked() {
        link
        .attr("x1", function (d) {
            return d.source.x;
        })
        .attr("y1", function (d) {
            return d.source.y;
        })
        .attr("x2", function (d) {
            return d.target.x;
        })
        .attr("y2", function (d) {
            return d.target.y;
        });

        node
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
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