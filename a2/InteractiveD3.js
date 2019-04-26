// Interactive barchart with animations
function renderInteractiveBars(newData){

  if(d3.selectAll("g")){
    d3.selectAll("g").remove()
  }

  var margin = {top: 60, right: 30, bottom: 30, left: 40},
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var color = d3.scaleSequential(d3.interpolateInferno)
              .domain([0, width])

  var x = d3.scaleBand()
      .rangeRound([0, width])
      .padding(.1)

  var y = d3.scaleLinear()
      .range([height, 0]);

  var chartVert = d3.select(".svg-chart")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      
      x.domain(newData.map(function(d) { return d; }));
      y.domain([0, d3.max(newData, function(d) { return d; })]);
  
  var bars = chartVert.selectAll(".bar")
      .data(newData)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d); })
      .attr("y", height)
      .transition()
      .attr("y", function(d) { return y(d); })
      .delay(function (data, i) {
                return i * 20;
            })
            .duration(2000)
            .ease(d3.easeElastic)
      .attr("height", function(d) { return height - y(d); })
      .attr("width", x.bandwidth())
      .style("stroke", "343d46")
      .style("stroke-width", "2")
      .style("fill", function(d){return color(d)})

  chartVert.selectAll(".bar").on('mouseover', onMouseOver)
                            .on('mouseout', onMouseOut)

  function onMouseOver(d, i){
    dynamicColor = this.style.fill;
    var bar = d3.select(this)
      .style('fill', 'white')
      .attr("transform", "translate(0, -10)")

    //coordinates to center box above bar
    var xc = x(d)
    var yc = y(d) - 45

    var g = d3.select('g')
                  .append('g')
                  .attr("transform", function(){ return "translate(" + xc + "," + yc + ")" })
                  .attr("id", "t" + xc + "-" + d)
      
      //append box
      var rect = g.append('rect')
        .style('fill', function(){
          return color(d)})
        .attr('height', 20)
        .attr('width', x.bandwidth());

        var txtColor = 'white'
        if(d > 650){
          txtColor = 'black'
        }
      
      //append data text
      g.append('text')
        .style('fill', txtColor)
        .style('font-size', '15px')
        .attr('text-anchor', 'middle')
        .attr('transform', 'translate(' + x.bandwidth()/2 + ', 15)')
        .text(function(){
          return d
      });

      function bounce(){
        var time = 500;

        //bounce data value box up and down
        g.attr("transform", function(){ return "translate(" + xc + "," + yc + ")" })
          .transition()
          .ease(d3.easeLinear)
          .duration(time)
          .attr("transform", function(){ return "translate(" + xc + "," + (yc-5) + ")" })
          .ease(d3.easeLinear)
          .duration(time)
          .transition()
          .attr("transform", function(){ return "translate(" + xc + "," + yc + ")" })
          .duration(time)

          //shadow animation
          shadow.attr('rx', x.bandwidth()/2)
                .attr('ry', 1.5)
                .transition()
                .ease(d3.easeLinear)
                .duration(time)
                .attr('rx', (x.bandwidth()/2)-5)
                .attr('ry', 1)
                .transition()
                .ease(d3.easeLinear)
                .duration(time)
                .attr('rx', x.bandwidth()/2)
                .attr('ry', 1.5)
                .on("end", bounce)
                .duration(time)
      }
      
      //create bounce shadow
      var defs = chartVert.append("defs");

      // create filter with id #drop-shadow
      // height=130% so that the shadow is not clipped
      var filter = defs.append("filter")
          .attr("id", "drop-shadow")
          .attr("height", "130%");

      // SourceAlpha refers to opacity of graphic that this filter will be applied to
      // convolve that with a Gaussian with standard deviation 3 and store result
      // in blur
      filter.append("feGaussianBlur")
          .attr("in", "SourceAlpha")
          .attr("stdDeviation", 5)
          .attr("result", "blur");
        
      var feMerge = filter.append("feMerge");

      feMerge.append("feMergeNode")
          .attr("in", "offsetBlur")
      feMerge.append("feMergeNode")
          .attr("in", "SourceGraphic");
      
      //create elipse and apply gaussian filter
      var shadow = chartVert.append('ellipse')
        .style('fill', 'black')
        .style('opacity', .5)
        .attr('rx', x.bandwidth()/2)
        .attr('ry', 1.5)
        .attr('cx', xc+(x.bandwidth()/2))
        .attr('cy', yc+28)
        .attr('filter', 'url(#drop-shadow')
        .attr("id", "elipse" + xc + "-" + d)

      bounce()
    }

    function onMouseOut(d) {
      d3.select(this)
          .style('fill', dynamicColor)
          .attr("transform", "translate(0, 0)")

      var xc = x(d)
      d3.select("#t" + xc + "-" + d).remove();
      d3.select("#elipse" + xc + "-" + d).remove();
    }

    //add axes
    var vAxis = d3.axisLeft()
      .scale(y)
      .ticks(10)
    
    var verticalGuide = d3.select('svg').append('g')
    vAxis(verticalGuide)
    verticalGuide.attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')')
    verticalGuide.selectAll('path')
        .style({fill: 'none', stroke: "#3c763d"})
    verticalGuide.selectAll('line')
        .style({stroke: "#3c763d"})
    
    //TODO: make axis array indices
    var xScale = d3.scaleBand()
      .rangeRound([0, width])
      .padding(.1)
      .domain(Object.keys(newData))

    var hAxis = d3.axisBottom()
        .scale(xScale)
        .ticks(xScale.domain.count)
    
    var horizontalGuide = d3.select('svg').append('g')
    hAxis(horizontalGuide)
    horizontalGuide.attr('transform', 'translate(' + margin.left + ', ' + (height + margin.top) + ')')
    horizontalGuide.selectAll('path')
        .style({fill: 'none', stroke: "#3c763d"})
    horizontalGuide.selectAll('line')
        .style({stroke: "#3c763d"});
}
var dataOne = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120,
  135, 150, 165, 180, 200, 220, 240, 270, 300, 330, 370, 410];

var dataTwo = [1, 20, 45, 22, 13, 150, 165, 14, 15, 50, 60, 70, 80, 10, 20, 30, 11, 25, 
  55, 44, 33, 135, 180, 200, 220, 240, 270,]

var dataThree = [1000, 200, 500, 330, 100, 560, 450, 333, 444, 556, 234, 645, 344, 111, 234, 999, 909]

var dataFour = [100, 200, 500, 330, 100, 560, 22, 13, 150, 165, 645, 344, 111, 234, 999, 909, 300, 330, 370, 410,
  1000, 200, 500, 330, 100, 560, 450, 333, 225, 180, 200, 220, 240, 270,]

renderInteractiveBars(dataOne);

getRadioVal = (form, name) => {
  var val;
  // get list of radio buttons with specified name
  var radios = form.elements[name];
  
  // loop through list of radio buttons
  for (var i=0, len=radios.length; i<len; i++) {
      if ( radios[i].checked ) { // radio checked?
          val = radios[i].value; // if so, hold its value in val
          break; // and break out of for loop
      }
  }
  return val; // return value of checked radio or undefined if none checked
}

document.getElementById("input").onsubmit = function(event){
  event.preventDefault();
  var dat = dataOne
  var selection = getRadioVal(this, 'data')
  if(selection === 'one'){
    dat = dataOne
  } else if(selection === 'two'){
    dat = dataTwo
  } else if(selection === 'three'){
    dat = dataThree
  } else {
    dat = dataFour
  }
  renderInteractiveBars(dat);
}