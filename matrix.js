export default function drawMatrix(edgeList, nodeList){
    console.log(edgeList, nodeList);
    var margin = {
    top: 75,
    right: 200,
    bottom: 200,
    left: 75
    };

    var width = $('#matrix-canvas').parent().width();
    var height = $('#matrix-canvas').parent().height();
    var color = d3.scaleOrdinal(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#bcbd22", "#17becf"]);
    var opacity = d3.scaleLinear()
        .range([0.5, 1])
        .clamp(true);

    var x = d3.scaleBand()
        .rangeRound([0, height-100])
        .paddingInner(0.2)
        .align(0);

    var svg = d3.select('#matrix-canvas').append('svg')
        .attr('width', width)
        .attr('height', height - 100)
        // .node();
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // console.log(canvas);
    // var context = canvas.getContext('2d');
    var idToNode = {};

    nodeList.forEach(function (n) {
        // n.degree = 0;
        idToNode[n.id] = n;
    }); 
    edgeList.forEach(function (e) {
        e.source = idToNode[e.source];
        e.target = idToNode[e.target];
    });

    nodeList.sort(function (a, b) {
        if (b.community != a.community)
        return b.community - a.community;
        else
        return b.degree - a.degree;
    });
    x.domain(d3.range(nodeList.length));

    opacity.domain([0, d3.max(edgeList, function (d) { return d.betweenness * 20; })]);
    console.log(nodeList);
    var matrix = nodeList.map(function (outer, i) {
        outer.index = i;
        return nodeList.map(function (inner, j) {
        return {i: i, j: j, val: i === j ? inner.degree : 0};
        });
    });
    window.matrix = matrix;
    // edgeList.forEach(function (l) {
    //   console.log(matrix[l.source.index][l.target.index], l, l.degree);
    //   matrix[l.source.index][l.target.index].val = l.degree;
    //   matrix[l.target.index][l.source.index].val = l.degree;
    // });
    // context.clearRect(0, 0, width, height);

    var row = svg.selectAll('g.row')
        .data(matrix)
        .enter().append('g')
        .attr('class', 'row')
        .attr('transform', function (d, i) { return 'translate(0,' + x(i) + ')'; })
        .each(makeRow);

    row.append('text')
        .attr('class', 'label')
        .attr('x', -4)
        .attr('y', x.bandwidth() / 2)
        .attr('dy', '0.32em')
        .text(function (d, i) { return nodeList[i].id; });

    var column = svg.selectAll('g.column')
        .data(matrix)
        .enter().append('g')
        .attr('class', 'column')
        .attr('transform', function(d, i) { return 'translate(' + x(i) + ', 0)rotate(-90)'; })
        .append('text')
        .attr('class', 'label')
        .attr('x', 4)
        .attr('y', x.bandwidth() / 2)
        .attr('dy', '0.32em')
        .text(function (d, i) { return nodeList[i].id; });


    function makeRow(rowData) {
        var cell = d3.select(this).selectAll('rect.cell')
        .data(rowData)
        .enter().append('rect')
        .attr('class', 'cell')
        .attr('x', function (d, i) { return x(i); })
        .attr('width', x.bandwidth())
        .attr('height', x.bandwidth())
        .style('fill-opacity', function (d) { return d.val > 0 ? opacity(d.val) : 1; })
        .style('fill', function (d) {
            console.log(d.val);
            if (d.val > 0)
            return color(nodeList[d.i].degree);
            // else if (d.val > 0)
            //   return '#555';
            return null;
        })
        .on('mouseover', function (d) {
            row.filter(function (_, i) { return d.i === i; })
            .selectAll('text')
            .style('fill', '#d62333')
            .style('font-weight', 'bold');
            column.filter(function (_, j) { return d.j === j; })
            .style('fill', '#d62333')
            .style('font-weight', 'bold');
        })
        .on('mouseout', function () {
            row.selectAll('text')
            .style('fill', null)
            .style('font-weight', null);
            column
            .style('fill', null)
            .style('font-weight', null);
        });

        cell.append('title')
        .text(function (d) {
            return nodeList[d.i].id + ' - ' + nodeList[d.j].id + ', degree: ' + d.val;
        });
    }
};