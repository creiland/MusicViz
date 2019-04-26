// following the tutorial at https://bost.ocks.org/mike/bar/3/

// basic bar chart

var data = [30, 86, 168, 281, 303, 365];

function renderBasicDivChart(){
  var x = d3.scale.linear()
    .domain([0, d3.max(data)])
    .range([0, 420]);

  d3.select(".chart")
  .selectAll("div")
    .data(data)
  .enter().append("div")
    .style("width", function(d) { return x(d) + "px"; })
    .text(function(d) { return d; });
}


// svg chart
function renderBasicSVGChart(){
  var width = 420,
    barHeight = 20;

var x = d3.scaleLinear()
    .domain([0, d3.max(data)])
    .range([0, width]);

var chart = d3.select(".svg-chart")
    .attr("width", width)
    .attr("height", barHeight * data.length);

var bars = chart.selectAll("g")
    .data(data)
  .enter().append("g")
    .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; });

bars.append("rect")
    .attr("width", x)
    .attr("height", barHeight - 1);

bars.append("text")
    .attr("x", function(d) { return x(d) - 3; })
    .attr("y", barHeight / 2)
    .attr("dy", ".35em")
    .text(function(d) { return d; });
}


// rotate chart
function renderVerticalChart(){
  var newData = [{name:"A", val:1}, {name:"B", val:2}, {name:"C", val: 3},]

  var margin = {top: 20, right: 30, bottom: 30, left: 40},
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var x = d3.scaleBand()
      .domain(["A", "B", "C", "D", "E", "F"])
      .rangeRound([0, width])
      .padding(.1)

  var y = d3.scaleLinear()
      .range([height, 0]);

  var xAxis = d3.axisBottom()
      .scale(x)

  var yAxis = d3.axisLeft()
      .scale(y)
      .ticks(10, "%");

  var chartVert = d3.select(".svg-chart")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      x.domain(newData.map(function(d) { return d.name; }));
      y.domain([0, d3.max(newData, function(d) { return d.val; })]);

      chartVert.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    chartVert.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    chartVert.selectAll(".bar")
        .data(newData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return x(d.name); })
        .attr("y", function(d) { return y(d.val); })
        .attr("height", function(d) { return height - y(d.val); })
        .attr("width", x.bandwidth());

      chartVert.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Frequency");
}

// renderBasicDivChart();
// renderBasicSVGChart();
// renderVerticalChart();

// sunburst (from the tutorial https://bl.ocks.org/denjn5/e1cdbbe586ac31747b4a304f8f86efa5)
function renderSunburst(){
    var nodeData = {
      "name": "TOPICS", "children": [{
          "name": "Topic A",
          "children": [{"name": "Sub A1", "size": 4}, {"name": "Sub A2", "size": 4}]
      }, {
          "name": "Topic B",
          "children": [{"name": "Sub B1", "size": 3}, {"name": "Sub B2", "size": 3}, {
              "name": "Sub B3", "size": 3}]
      }, {
          "name": "Topic C",
          "children": [{"name": "Sub A1", "size": 4}, {"name": "Sub A2", "size": 4}]
      },
      {
        "name": "Topic D",
        "children": [{"name": "Sub A1", "size": 3}, {"name": "Sub A2", "size": 4}, {"name": "Sub A3", "size": 2}]
      }]
  };

  var width = 500;
  var height = 500;
  var radius = Math.min(width, height) / 2;
  var color = d3.scaleOrdinal(d3.schemeCategory20b);

  var g = d3.select('.svg-chart')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

  var partition = d3.partition()
    .size([2 * Math.PI, radius]);

  var root = d3.hierarchy(nodeData)
    .sum(function (d) { return d.size});

    partition(root);
    var arc = d3.arc()
        .startAngle(function (d) { return d.x0 })
        .endAngle(function (d) { return d.x1 })
        .innerRadius(function (d) { return d.y0 })
        .outerRadius(function (d) { return d.y1 });
    
    g.selectAll('g')
      .data(root.descendants())
      .enter()
      .append('g').attr("class", "node")
      .append('path')
      .attr("display", function (d) { return d.depth ? null : "none"; })
      .attr("d", arc)
      .style('stroke', '#fff')
      .style("fill", function (d) { return color((d.children ? d : d.parent).data.name); });

      g.selectAll(".node")
      .append("text")
      .attr("transform", function(d) {
          return "translate(" + arc.centroid(d) + ")rotate(" + computeTextRotation(d) + ")"; })
      .attr("dx", "-20") // radius margin
      .attr("dy", ".5em") // rotation align
      .text(function(d) { return d.parent ? d.data.name : "" });
}

function computeTextRotation(d) {
  var angle = (d.x0 + d.x1) / Math.PI * 90;
  console.log("test")
  // Avoid upside-down labels
  return (angle < 120 || angle > 270) ? angle : angle + 180;  // labels as rims
  //return (angle < 180) ? angle - 90 : angle + 90;  // labels as spokes
}

renderSunburst();