// Code to create and draw a histogram of a node metric
//   data: {nodeId: value}
//   options.log: use a log scale for the count axis
//   options.integer: the metric only takes whole-number values (e.g. degree)
export function drawHist(data, { log = false, integer = false } = {}) {
	// Reconfigure data object
	data = Object.entries(data).map(d => { return {name: d[0], metric:d[1]}; });

	// Create SVG and containers
	var svg = d3.select("svg#hist")
		.attr("preserveAspectRatio", "xMinYMin meet")
		.attr("viewBox", "0 0 1400 500");

	var margin = {top: 10, right: 30, bottom: 50, left: 90},
		width = 1400 - margin.left - margin.right,
		height = 500 - margin.top - margin.bottom;

	svg.selectAll('*').remove();

	var container = svg.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var x = d3.scaleLinear()
		.domain([0, d3.max(data, function(d) { return d.metric; }) || 1])
		.range([0, width]);

	// Set the parameters for the histogram
	var histogram = d3.bin()
		.value(function(d) { return d.metric; })
		.domain(x.domain());

	var bins = histogram(data);
	var maxCount = d3.max(bins, function(d) { return d.length; }) || 1;

	// Count axis: linear by default, log on request
	var y, yAxis;
	if (log) {
		y = d3.scaleLog().range([height, 0]).clamp(true).domain([0.5, maxCount]);
		var tickValues = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].filter(function(v) { return v <= maxCount; });
		yAxis = d3.axisLeft(y).tickValues(tickValues).tickFormat(d3.format('d'));
	} else {
		y = d3.scaleLinear().range([height, 0]).domain([0, maxCount]).nice();
		yAxis = d3.axisLeft(y).ticks(Math.min(maxCount, 8)).tickFormat(d3.format('d'));
	}

	// Append the bar rectangles to the svg element
	container.selectAll("rect")
		.data(bins)
		.enter().append("rect")
		.attr("class", "bar")
		.attr("x", 1)
		.attr("transform", function(d) {
			return "translate(" + x(d.x0) + "," + y(d.length) + ")"; })
		.attr("width", function(d) { return Math.max(0, x(d.x1) - x(d.x0) - 1); })
		.attr("height", function(d) { return height - y(d.length); })
		.style('fill', '#08B3E5')
		.style('stroke', '#0B1B2B')
		.style('stroke-width', 2);

	// Add the x Axis (whole numbers only for whole-number metrics)
	var xAxis = d3.axisBottom(x);
	if (integer) {
		xAxis.ticks(Math.min(x.domain()[1], 10)).tickFormat(d3.format('d'));
	}
	container.append("g")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis);

	// Add the y Axis
	container.append("g")
		.call(yAxis);

	container.append("text")
		.attr("class", "x label")
		.attr("text-anchor", "end")
		.attr("x", width)
		.attr("y", height + (margin.bottom - 5))
		.attr("font-size", "1.5em")
		.text("value range for selected metric");

	svg.append("text")
		.attr("class", "y label")
		.attr("text-anchor", "end")
		.attr("x", -margin.top)
		.attr("dy", ".75em")
		.attr("font-size", "1.5em")
		.attr("transform", "rotate(-90)")
		.text(log ? "number of nodes in range (log scale)" : "number of nodes in range");
}
