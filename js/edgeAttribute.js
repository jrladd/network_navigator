var graphType, attr, edgeList;

export function addEdgeAttributeDropdown(currentEdgeList, type) {
	graphType = type;
	d3.select('#attribute-section').remove();
	edgeList = currentEdgeList;
	let keys = Object.keys(edgeList[0]);
	keys = keys.filter(k => ['source','target','weight'].indexOf(k) === -1);
	keys.unshift('none');
	if (keys.length > 0) {
		var optionDiv = d3.select(`#customize-form #${graphType}`).append('div').classed("fl w-100 f6 mid-gray pv2", true).attr('id', 'attribute-section'),
		    label = optionDiv.append("label").attr("for", "edge-attributes").text("Filter by edge attribute: "),
		    select = optionDiv.append("select").attr("name", "edge-attributes").attr("id", "edge-attributes").on("change", edgeAttrChange),
		    options = select.selectAll('option').data(keys); // Data join

		options.enter().append("option").text(function(d) { return d; });
	}
}

function edgeAttrChange() {
	attr = this.value;
	resetOpacity();
	if (attr === 'none') {
		d3.select('#edge-attr-container').remove();
	} else {
		d3.select('#edge-attr-container').remove();
		var containerDiv= d3.select(`#customize-form #${graphType}`).append('div').attr("id", 'edge-attr-container').classed("fl w-100 f6 mid-gray pv2", true),
		    optionDiv = containerDiv.append("div").classed("fl w-50 f6 mid-gray pv2", true),
		    label = optionDiv.append("label").attr("for", "edge-attr-type").text("This attribute is..."),
		    select = optionDiv.append("select").attr("name", "edge-attr-type").attr("id", "edge-attr-type").on("change", function() {
			    if (this.value === 'categorical') { createCategoryDropdown(); }
			    else { createContinuousGraph(); }
		    }),
		    options = select.selectAll('option').data(['categorical', 'continuous']); // Data join

		options.enter().append("option").text(function(d) { return d; });
		createCategoryDropdown();
	}
}

function createCategoryDropdown() {
	d3.select('#category-container').remove();
	d3.select('#continuous-container').remove();
	var categories = edgeList.map(e => e[attr]);
	categories = [...new Set(categories)]
	categories.unshift('');
	var optionDiv = d3.select(`#edge-attr-container`).append('div').attr("id", 'category-container').classed("fl w-50 f6 mid-gray pv2", true),
	    label = optionDiv.append("label").attr("for", "category-filter").text("Filter by: "),
	    select = optionDiv.append("select").attr("name", "category-filter").attr("id", "category-filter").on("change", function() {
		    let nodes = [];
		    edgeList.forEach(e => {
			    if (e[attr].toString() === this.value) {
				    nodes.push(e.source.id);
				    nodes.push(e.target.id);
			    }
		    });
		    if (graphType === 'force-layout') {
			    d3.selectAll('.edge').style('opacity', l => { return l[attr].toString() === this.value ? 1 : 0.1});
			    d3.selectAll('.node').style('opacity', n => { return nodes.indexOf(n.id) !== -1 ? 1 : 0.1});
		    } else if (graphType === 'arc-diagram') {
			    d3.selectAll('.arc').style('opacity', l => { return l[attr].toString() === this.value ? 1 : 0.1});
			    d3.selectAll('.node-arc').style('opacity', n => { return nodes.indexOf(n.id) !== -1 ? 1 : 0.1});
		    }
	    }),
	    options = select.selectAll('option').data(categories); // Data join

	options.enter().append("option").text(function(d) { return d; });
}

function createContinuousGraph() {
	d3.select('#category-container').remove();
	d3.select('#continous-container').remove();
	var data = edgeList.map(e => {return {'metric': e[attr]} });
	var containerDiv = d3.select(`#edge-attr-container`).append('div').attr("id", 'continuous-container').classed("fl w-50 f6 mid-gray pv2", true);
	// Create SVG and containers
	var svg = containerDiv.append('svg')
         .attr("preserveAspectRatio", "xMinYMin meet")
         .attr("viewBox", "0 0 1400 500");

        var margin = {top: 10, right: 30, bottom: 50, left: 90},
	  width = +svg.attr('width')+1400 - margin.left - margin.right,
          height = +svg.attr('height')+500 - margin.top - margin.bottom;

	svg.selectAll('*').remove();

	var container = svg.append("g")
          .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

	var x = d3.scaleLinear()
	  .domain([d3.min(data, d => d.metric), d3.max(data, d => d.metric)])
          .range([0, width]);
	var y = d3.scaleLog()
          .range([height, 0])
	  .clamp(true)
	  .nice();

	// Set the parameters for the histogram
	var histogram = d3.histogram()
	    .value(function(d) { return d.metric; })
	    .domain(x.domain());

	var bins = histogram(data);

	// Scale the range of the data in the y domain
	y.domain([0.1, d3.max(bins, function(d) { return d.length; })]);

	// Append the bar rectangles to the svg element
	container.selectAll("rect")
	    .data(bins)
	  .enter().append("rect")
	    .attr("class", "bar")
	    .attr("x", 1)
	    .attr("transform", function(d) {
	      	  return "translate(" + x(d.x0) + "," + y(d.length) + ")"; })
	    .attr("width", function(d) { return x(d.x1) - x(d.x0) -1 ; })
	    .attr("height", function(d) { return height - y(d.length);
		})
		.style('fill', '#08B3E5');

	// Text labels for histogram x axis
	container.append("text")
            .attr("class", "x label right")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height + (margin.bottom - 5))
	    .attr("font-size", "2.5em")
            .text(d3.max(data, d => d.metric));

	container.append("text")
            .attr("class", "x label left")
            .attr("text-anchor", "start")
            .attr("x", 0)
            .attr("y", height + (margin.bottom - 5))
	    .attr("font-size", "2.5em")
            .text(d3.min(data, d => d.metric));

	// Create brush to select part of histogram
        var brush = d3.brushX()
	    .extent([[0,0],[width,height]])
            .handleSize(0)
            .on("brush", updateBrush)
            .on("end", brushed);

        var brushSelection = container.append("g")
            .attr("class", "brush")
            .call(brush);

	// Custom brush handles (code adapted from Six Degrees of Francis Bacon)
        brushSelection.selectAll(".handle-custom")
          .data([{
            type: "w"
          }, {
            type: "e"
          }])
          .enter().append("rect")
          .attr("class", function(d) {
            if (d.type === "e") {
              return "handle-custom handle-e";
            } else {
              return "handle-custom handle-w";
            }
          })
          .attr("width", 20)
          .attr("height", function(d) {
            return height / 2;
          })
	  .attr("fill", 'black')
          .attr("rx", 2)
          .attr("ry", 2)
          .attr("cursor", "ew-resize")
          .attr("x", function(d) {
            if (d.type === "e") {
              return width - 20;
            } else {
              return 2;
            }
          })
          .attr("y", function(d) {
            return height / 4 + 5;
          });

	function updateBrush() { 
	    var brushPositionX = d3.select(".selection").node().getBBox().x,
              brushPositionWidth = d3.select(".selection").node().getBBox().width;
            d3.select(".handle-custom.handle-w").attr("x", function(d) {
              return brushPositionX - 2;
            });
            d3.select(".handle-custom.handle-e").attr("x", function(d) {
              return brushPositionX + brushPositionWidth - 2;
            });
	}
	function brushed() { 
            var s = d3.event.selection;
	    console.log(s);
	    var xConvert = d3.scaleLinear()
              .domain([0, width])
	      .range([d3.min(data, d => d.metric), d3.max(data, d => d.metric)]);
            var min = xConvert(s[0]);
            var max = xConvert(s[1]);
	    console.log(min,max);
	    let nodes = [];
	    edgeList.forEach(e => {
		    if (min <= e[attr] && e[attr] <= max) {
			    nodes.push(e.source.id);
			    nodes.push(e.target.id);
		    }
	    });
	    console.log(nodes);
	    if (graphType === 'force-layout') {
		    d3.selectAll('.edge').style('opacity', l => { return min <= l[attr] && l[attr] <= max ? 1 : 0.1});
		    d3.selectAll('.node').style('opacity', n => { return nodes.indexOf(n.id) !== -1 ? 1 : 0.1});
	    } else if (graphType === 'arc-diagram') {
		    d3.selectAll('.arc').style('opacity', l => { return min <= l[attr] && l[attr] <= max ? 1 : 0.1});
		    d3.selectAll('.node-arc').style('opacity', n => { return nodes.indexOf(n.id) !== -1 ? 1 : 0.1});
	    }
	}

	brushSelection.call(brush.move, [0,width]);
}

function resetOpacity() {
	d3.selectAll('.edge').style('opacity', 1);
	d3.selectAll('.node').style('opacity', 1);
	d3.selectAll('.arc').style('opacity', 1);
	d3.selectAll('.node-arc').style('opacity', 1);
}
