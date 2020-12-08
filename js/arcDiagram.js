export function drawArcDiagram(edgeList, nodeList, colorValues) {
    nodeList = nodeList.map(node => ({...node, nodeClicked: false}));
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
            .attr('nodeClicked', d => d.nodeClicked)
            .attr("cx", d => x(d.id))
            .attr("cy", height - 30)
            .attr("r", d => (size(d.degree)))
            .style("fill", d => color(d.weight));

    var labels = svg
        .selectAll("labels")
        .data(nodeList)
        .enter()
        .append("text")
            .attr("x", 0)
            .attr("y", 10)
            .text(d => d.id)
            .style("text-anchor", "end")
            .attr("transform", d => "translate(" + (x(d.id)) + "," + (height - 15) + ")rotate(-45)")
            .style("font-size", 12);
        
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

    links.on('mouseover', d => linkEvent(d))
        .on('click', d => {
            console.log(d);
            linkEvent(d)})
        .on('mouseout', mouseOut);

    circles.on('mouseover', d => {if (!d.nodeClicked){nodeEvent(d)}})
        .on('click', d => {
            if (!d.nodeClicked) {
                d.nodeClicked = true;
                d3.select(this).select('circle').enter().attr('nodeClicked', true);
                nodeEvent(d);
            }
        })
        .on('mouseout', d => {if (!d.nodeClicked){mouseOut()}});

    labels.on('mouseover', d => {if (!d.nodeClicked) {nodeEvent(d)}})
        .on('click', d => {
            if (!d.nodeClicked) {
                d.nodeClicked = true;
                d3.select(this).select('circle').enter().attr('nodeClicked', true);
                nodeEvent(d);
            }
        })
        .on('mouseout', d => {if (!d.nodeClicked) {mouseOut()}});


    d3.select('#arc-viz').on('click', () => {
        if (d3.event.target.classList.contains('svg-content-responsive')){
            circles.enter().attr('nodeClicked', d => d.nodeClicked = false)
            console.log(circles);
            mouseOut();
        }
    });

    function linkEvent(d){
        links.style('stroke', '#b8b8b8')
            .style('stroke-opacity', .2)
            .style('stroke-width', 1);
        d3.select(this).style('stroke', color(d.community))
            .style('stroke-opacity', 1)
            .style('stroke-width', 4);

        circles.style('opacity', function (node_d) {
            return node_d.id === d.source.id || node_d.id === d.target.id ? 1 : 0.2;
        });
        labels.style("font-size", function (node_d) {
            return node_d.id === d.source.id || node_d.id === d.target.id ? 20 : 12;
        });
    }

    function nodeEvent(d){
        // Highlight the nodes: every node is green except of him
        circles
            .style('opacity', .2)
        // Highlight the connections
        var nodesToHighlight = edgeList.map(function (e) {
            return e.source.id === d.id ? e.target : e.target.id === d.id ? e.source : 0
        }).filter(function (d) {
            return d
        });
        nodesToHighlight.push(d);

        circles.filter(circle => nodesToHighlight.some(node => circle.id === node.id))
            .style('opacity', 1)
        links
            .style('stroke', function (link_d) {
                return link_d.source.id === d.id || link_d.target.id === d.id ? color(d.community) : '#b8b8b8';
            })
            .style('stroke-opacity', function (link_d) {
                return link_d.source.id === d.id || link_d.target.id === d.id ? 1 : .2;
            })
            .style('stroke-width', function (link_d) {
                return link_d.source.id === d.id || link_d.target.id === d.id ? 4 : 1;
            })
        labels.filter(label => nodesToHighlight.some(node => label.id === node.id))
            .style("font-size", 20)

    }
    function mouseOut(){
        circles.style('opacity', 1)
        links
            .style('stroke', 'grey')
            .style('stroke-opacity', .8)
            .style('stroke-width', '1')
        labels
            .style("font-size", 12)
    }
};
