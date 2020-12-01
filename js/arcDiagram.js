export function drawArcDiagram(edgeList, nodeList, colorValues) {
    const margin = {
        top: -200,
        right: 75,
        bottom: 75,
        left: 75
    };

    var svg = d3.select('#arc-viz')
        .append("div")
        .classed("svg-container", true)
        .append('svg')
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "-50 500 1600 1600")
        .classed("svg-content-responsive", true)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    const width = +svg.attr('width') + 1200 - margin.left;
    const height = +svg.attr('height') + 1200 - margin.top;

    var color = d3.scaleOrdinal(d3.schemeCategory20);

    var allNodes = nodeList.map(d => d.id);

    // List of groups
    var allGroups = nodeList.map(d => (d.community == 'undefined' ? 1 : d.community))
    allGroups = [...new Set(allGroups)]

    // // A color scale for groups:
    var color = d3.scaleOrdinal()
        .domain(colorValues)
        .range(["#f7fbff", "#e3eef9", "#cfe1f2", "#b5d4e9", "#93c3df", "#6daed5", "#4b97c9", "#2f7ebc", "#1864aa", "#0a4a90", "#08306b"]);

    // A linear scale for node size
    var size = d3.scaleLinear()
        .domain([1, 10])
        .range([10, 15]);

    var x = d3.scalePoint()
        .range([0, width])
        .domain(allNodes);

    var circles = svg
        .selectAll('circles')
        .data(nodeList)
        .enter()
        .append("circle")
            .attr("cx", d => x(d.id))
            .attr("cy", height - 30)
            .attr("r", d => (size(d.degree)))
            .style("fill", d => color(d.weight));
        // .attr("r", 8)
        // .style("fill", "#69b3a2");

    var labels = svg
        .selectAll("labels")
        .data(nodeList)
        .enter()
        .append("text")
            .attr("x", 0)
            .attr("y", 0)
            // .attr("x", d => x(d.id))
            // .attr("y", height - 30)
            .text(d => d.id)
            .style("text-anchor", "end")
            .attr("transform", d => "translate(" + (x(d.id)) + "," + (height - 15) + ")rotate(-45)")
            .style("font-size", 6)
            // .style("text-anchor", "middle");
        
    var links = svg
        .selectAll("links")
        .data(edgeList)
        .enter().append("path")
        .attr('d', function (d) {
            let start = x(d.source.id)
            let end = x(d.target.id) 
            return ['M', start, height - 30, 'A', (start - end) / 2, ',', (start - end) / 2, 0, 0, ',',start < end ? 1 : 0, end, ',', height - 30].join(' ');
        })
        .style("fill", "none")
        .attr("stroke", "black");

    circles.on('mouseover', function (d) {
            // Highlight the nodes: every node is green except of him
            circles
                .style('opacity', .2)
            d3.select(this)
                .style('opacity', 1)
            // Highlight the connections
            links
                .style('stroke', function (link_d) {
                    return link_d.source.id === d.id || link_d.target.id === d.id ? color(d.weight) : '#b8b8b8';
                })
                .style('stroke-opacity', function (link_d) {
                    return link_d.source.id === d.id || link_d.target.id === d.id ? 1 : .2;
                })
                .style('stroke-width', function (link_d) {
                    return link_d.source.id === d.id || link_d.target.id === d.id ? 4 : 1;
                })
            labels
                .style("font-size", function (label_d) {
                    console.log(label_d.id === d.id);
                    return label_d.id === d.id ? 16 : 2
                })
                .attr("y", function (label_d) {
                    return label_d.id === d.id ? 10 : 0
                })

        })
        .on('mouseout', function (d) {
            circles.style('opacity', 1)
            links
                .style('stroke', 'grey')
                .style('stroke-opacity', .8)
                .style('stroke-width', '1')
            labels
                .style("font-size", 6)

        })

};
