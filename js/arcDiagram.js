export function drawArcDiagram(edgeList, nodeList, colorValues, graphType, graphWeight) {
    // Add properties to control showing and hiding elements
    nodeList = nodeList.map(node => ({...node, nodeClicked: false})).sort();
    edgeList = edgeList.map(edge => ({...edge, edgeClicked: false}));
    // let label, overlay, path, node;
    let graphDirection = 'vertical';
    const margin = {
        top: -200,
        right: 75,
        bottom: 75,
        left: 100
    };

    var svg = d3.select('#arc-viz')
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

    var labelsDiv = svg.append("g")
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

    var nodesDiv = svg.append("g")
        .style("font-family", "sans-serif")
        .style("font-size", 14)
        .attr("text-anchor", "end")
        .attr("id", "nodes");

    var node = nodesDiv.selectAll("circle")
        .data(nodeList)
        .enter().append("circle")
        .attr("r", d => size(d.degree))
        .attr("fill", d => color(d.community))
        .attr("transform", d => graphDirection === 'vertical' ? `translate(${margin.left},${d.y = y(d.id)})` : `translate(${d.x = x(d.id)}, ${height - margin.left})`);

    var arcsDiv = svg.insert("g", "*")
        .attr("fill", "none")
        .style("stroke-opacity", 0.6)
        .style("stroke-width", 1.5)
        .attr("id", "arcs");

    var path = arcsDiv.selectAll("path")
        .data(edgeList)
        .enter().append("path")
        .style("stroke", d => d.source.id === d.target.id ? color(d.source.community) : "#aaa")
        .attr("d", d => arc(d));


    var overlaysDiv = svg.append("g")
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
                d3.select(this).attr('nodeClicked', true);
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
    

    function buildDiagram(graphDirection, nodeList) {
        console.log(nodeList);

        y.domain(nodeList.map(d => d.id));
        x.domain(nodeList.map(d => d.id));
        let t = svg.transition()
            .duration(750);

        label = labelsDiv.selectAll("text")
            .data(nodeList);

        label.exit().remove();

        label.enter().append("text")
            .attr("x", -16)
            .attr("fill", d => color(d.community))
            .text(d => d.id)
            .merge(label)
            .transition(t)
                .delay((d, i) => i * 20)
                .attr("transform", d => {
                    console.log('transform', d);
                    return graphDirection === 'vertical' ? `translate(${margin.left},${d.y = y(d.id)})rotate(0)` : `translate(${d.x = x(d.id)}, ${height - margin.left})rotate(-45)`})
                .attr("y", graphDirection === 'vertical' ? "0.35em" : 10);
        
        node = nodesDiv.selectAll("circle")
            .data(nodeList);

        node.exit().remove();
        
        node.enter().append("circle")
            .attr("r", d => size(d.degree))
            .attr("fill", d => color(d.community))
            .merge(node)
            .transition(t)
                .delay((d, i) => i * 20)
                .attr("transform", d => graphDirection === 'vertical' ? `translate(${margin.left},${d.y = y(d.id)})` : `translate(${d.x = x(d.id)}, ${height - margin.left})`);
        
        path = arcsDiv.selectAll("path")
            .data(edgeList);

        path.exit().remove();

        path.enter().append("path")
            .style("stroke", d => d.source.id === d.target.id ? color(d.source.community) : "#aaa")
            .merge(path)
            .transition(t)
                .duration(1750 + nodeList.length * 20)
                .attrTween("d", d => () => arc(d));

        overlay = overlaysDiv.selectAll("rect")
            .data(nodeList);

        overlay.exit().remove();

        overlay.enter().append("rect")
            .attr("height", step)
            .on("dblclick", releaseNode)
            .on("click", d => {
                if (!d.nodeClicked) {
                    d.nodeClicked = true;
                    d3.select(this).attr('nodeClicked', true);
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
            })
            // .merge(overlay)
            .transition(t)
                .delay((d, i) => i * 20)
                .attr("width", graphDirection === 'vertical' ? margin.left + 40 : margin.left + 50)
                .attr("transform", d => graphDirection === 'vertical' ? `translate(${margin.left-90},${d.y = y(d.id) - 8})rotate(0)` : `translate(${d.x = x(d.id)- 90}, ${height - margin.left + 80})rotate(-45)`);
        
    }
    // buildDiagram(graphDirection, nodeList);

    function releaseNode(){
        d3.select(this).attr('nodeClicked', d => d.nodeClicked = false)
        mouseOut();
    }

    function nodeEvent(d){
        var nodesToHighlight = edgeList.map(function (edge) {
            return edge.source.id === d.id ? edge.target : edge.target.id === d.id ? edge.source : 0
        }).filter(function (d) {
            return d
        });
        nodesToHighlight.push(d);

        label.attr('fill', '#ccc');
        label.filter(label => label.id === d.id)
            .attr('fill', 'black')
            .style('font-weight', 'bold');
        label.filter(label => nodesToHighlight.some(node => label.id === node.id))
            .attr('fill', '#333');
        path.filter(l => l.source.id === d.id || l.target === d.id)
            .style('stroke', '#333')
            .style('stroke-opacity', 1);
    }
    function mouseOut(){
        label
            .style("fill", d => color(d.community))
            .style('font-weight', 'normal');;
        path
            .style("stroke", d => d.source.id === d.target.id ? color(d.source.community) : "#aaa")
            .style("stroke-opacity", 0.6)
    }

    function arc(d) {
        if (graphDirection === 'vertical') {
            const y1 = y(d.source.id);
            const y2 = y(d.target.id);
            const r = Math.abs(y2 - y1) / 2;
            return `M${margin.left},${y1}A${r},${r} 0,0,${y1 < y2 ? 1 : 0} ${margin.left},${y2}`;
        } else {
            // let start = y(d.source.id)
            // let end = y(d.target.id) 
            // return ['M', start, height - 30, 'A', (start - end) / 2, ',', (start - end) / 2, 0, 0, ',',start < end ? 1 : 0, end, ',', height - 30].join(' ');
            const x1 = x(d.source.id)
            const x2 = x(d.target.id)
            const r = Math.abs(x2 - x1) / 2;
            // return ['M', start, height - 30, 'A', (start - end) / 2, ',', (start - end) / 2, 0, 0, ',', start < end ? 1 : 0, end, ',', height - 30].join(' ');
            return `M${x1} ${height - margin.left} A ${r},${r} 0 0,${x1 < x2 ? 1 : 0} ${x2},${height - margin.left}`;

        }
        
    }

    function updateArc(orderValue, orderDirection) {
        orderValue = orderValue === 'name' ? 'id' : orderValue;
        let sortOrder = nodeList.map( node => node[orderValue]).sort();
        sortOrder = orderDirection ? [...sortOrder].reverse() : sortOrder;
        let updatedNodeList = nodeList.sort((a, b) => sortOrder.indexOf(a[orderValue]) - sortOrder.indexOf(b[orderValue]));
        
        // buildDiagram(graphDirection, updatedNodeList);
        y.domain(updatedNodeList.map(d => d.id));
        x.domain(updatedNodeList.map(d => d.id));

        const t = svg.transition()
            .duration(750);

        label.transition(t)
            .delay((d, i) =>  i * 20)
            .attr("transform", d => graphDirection === 'vertical' ? `translate(${margin.left},${d.y = y(d.id)})rotate(0)` : `translate(${d.x = x(d.id)}, ${height - margin.left})rotate(-45)`)
            .attr("y", graphDirection === 'vertical' ? "0.35em" : 10);

        node.transition(t)
            .delay((d, i) => i * 20)
            .attr("transform", d => graphDirection === 'vertical' ? `translate(${margin.left},${d.y = y(d.id)})` : `translate(${d.x = x(d.id)}, ${height - margin.left})`);

        console.log(750 + updatedNodeList.length * 120);
        path.transition(t)
            .delay((d, i) => i * 40)
            // .duration(750 + updatedNodeList.length * 20)
            .attrTween("d", d => () => arc(d));

        overlay.transition(t)
            .delay((d, i) => i * 20)
            .attr("width", graphDirection === 'vertical' ? margin.left + 40 : margin.left + 50)
            .attr("transform", d => graphDirection === 'vertical' ? `translate(${margin.left-90},${d.y = y(d.id) - 8})rotate(0)` : `translate(${d.x = x(d.id)- 90}, ${height - margin.left + 80})rotate(-45)`)
            // .attr("y", d => graphDirection === 'vertical' ? y(d.id) - step / 2 : null);
            // .attr("x", d => graphDirection === 'horizontal' ? x(d.id) - step / 2 : null)

    }

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
        console.log(graphDirection);
        let orderDirection = $('#reverse-arc-order').is(':checked');
        let orderValue = $('#order-arc-nodes').val();
        updateArc(orderValue, orderDirection);
    });
};
