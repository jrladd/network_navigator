export function drawArcDiagram(edgeList, nodeList, colorValues) {
    console.log(edgeList, nodeList);
    const margin = {
        top: 75,
        right: 200,
        bottom: 200,
        left: 75
    };

    var svg = d3.select('#arc-viz')
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

    var color = d3.scaleOrdinal(d3.schemeCategory20);

    var allNodes = nodeList.map(d => d.id);

    var x = d3.scalePoint()
        .range([0, width])
        .domain(allNodes);

    var circles = svg.append("g")
        .attr("class", "circles")
        .selectAll("g")
        .data(nodeList)
        .enter().append("g");

    circles.append("circle")
        .attr("cx", function (d) {
            return (x(d.id))
        })
        .attr("cy", height - 30)
        .attr("r", 8)
        .style("fill", "#69b3a2");

    var labels = svg.append("g")
        .attr("class", "texts")
        .selectAll("g")
        .data(nodeList)
        .enter().append("g");

    

    labels.append("text")
        .attr("x", function (d) {
            return (x(d.id))
        })
        .attr("y", height - 10)
        .text(function (d) {
            return (d.id)
        })
        .style("text-anchor", "middle");
        
    svg.append("g")
        .attr("class", "links")
        .selectAll("path")
        .data(edgeList)
        .enter().append("path")
        .attr('d', function (d) {
            let start = x(d.source.id)
            let end = x(d.target.id) 
            return ['M', start, height - 30, 'A', (start - end) / 2, ',', (start - end) / 2, 0, 0, ',',start < end ? 1 : 0, end, ',', height - 30].join(' ');
        })
        .style("fill", "none")
        .attr("stroke", "black");

};