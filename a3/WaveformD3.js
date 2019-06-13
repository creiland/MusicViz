var wave_uri = "http://public.jm3.net/d3/geiger.json";

var max_points = 1024;
var width = 880,
height    = 140;

//simulated track length of 4 minutes 15 seconds
let trackLength = 255

let color = "#ce243d"

d3.json( wave_uri, function(error, json) {
    if(error){
      console.log(error)
    }
    waveJson = json.data.slice(1, max_points);
    var lessPoints = []
    for (i = 0; i < waveJson.length; i=i+10) {
      lessPoints.push(waveJson[i]);
      lessPoints.push(waveJson[i+1])
      lessPoints.push(waveJson[i+2])
    }

    renderWaveform(lessPoints)
  });

  function renderWaveform(data){
    var node = d3.select('#viz-container')
                .append('svg')
                .attr("width", width)
                .attr("height", height + 30)
                .append('g')

    var y = d3.scaleLinear()
              .range([height, -height])

    var max = d3.max(data, function(d){return d})
    y.domain([-max, max])

    var x = d3.scaleLinear()
              .domain([0, data.length]);

    var barWidth = width / data.length;

    var chart = node.attr("width", width)
                    .attr("height", height);

    var bar = chart.selectAll("g")
                  .data(data)
                  .enter()
                  .append("g")
                  .attr("transform", function(d, i){ return "translate(" + (i*barWidth) + ",0)"})
                  .style("fill", color)

    var waves = bar.append("rect")
        // .attr("y", function(d){
        //   var yvalue = height - Math.abs(y(d)/2) - height/2 + 2
        //   return yvalue
        // })
        .attr("y", function(d){
          var yvalue = height/2
          return yvalue
        })
        .attr("width", barWidth)

        //.attr("height", function(d){return y(d)})
        waves.transition()
        .attr("height", function(d) { return Math.abs(y(d)); })
        .delay(function (data, i) {
                return i*1.5;
            })
            //.duration(500)
            .ease(d3.easeElastic)
        //.attr("height", function(d) { return Math.abs(y(d)); })
        .attr("y", function(d){
          var yvalue = height - Math.abs(y(d)/2) - height/2 + 2
          return yvalue
        })

        waves.on('mouseover', onMouseOver)
        // .on('mouseover', function() {
        //   onMouseOver(data, d, i)
        // })
        .on('mousemove', onMouseMove)
        .on('mouseleave', onMouseLeave)
        .on('click', onMouseClick)

      var Tooltip = d3.select('#viz-container')
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "black")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("color", "white")
        .style("position", "absolute")
      
      //keep track of the mouse position
      var trackSrubTime;
      var waveFormPosition;

      //get set when the user clicks a bar
      var onCommentTrackSrubTime;
      var onCommentWaveFormPosition;

      function onMouseOver(d, i){
        mousePositionInTrack = secondsToMinutes(i/data.length*trackLength)
        trackSrubTime = mousePositionInTrack
        waveFormPosition = d3.event.pageX

        d3.select(this).style("fill", 'rgb(140,198,109')

        Tooltip
          .html("Leave a comment at " + mousePositionInTrack)
          .style("left", (d3.event.pageX+20) + "px")
          .style("top", (d3.event.pageY - 5) + "px")
          .style("opacity", 1)
        }

      function onMouseMove(d, i){
        mousePositionInTrack = secondsToMinutes(i/data.length*trackLength)
        trackSrubTime = mousePositionInTrack
        waveFormPosition = d3.event.pageX

        Tooltip
          .html("Leave a comment at " + mousePositionInTrack)
          .style("left", (d3.event.pageX + 20) + "px")
          .style("top", (d3.event.pageY - 5) + "px")
      }

      function onMouseLeave(d){
        d3.select(this).style("fill", color)
        Tooltip
          .style("opacity", 0)
      }

      var CommentForm = d3.select('#viz-container')
        .append("form")
        .style('display', 'none')
        .attr("class", "comment-form")
        .style("background-color", "black")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("color", "white")
        .style("position", "absolute")

      CommentForm
        .append('textarea')
        .style('height', "50px")
        .attr('id', 'comment-input')
        .attr('rows', 1)
        .style('outline', 'none')
        .style('resize', 'none')
        .style('margin-right', '5px')
        .attr('placeholder', 'Type your comment here')
        .on('change', handleCommentChange)

      CommentForm
        .append('button')
        .attr('type', 'submit')
        .text('Post')
        .style('border-radius', '20px')
        .on('click', postComment)
        .on('mouseover', function(){
          d3.select(this)
            .style('background-color', 'white')
            .style('color', 'black')
        })
        .on('mouseleave', function(){
          d3.select(this)
            .style('background-color', 'black')
            .style('color', 'white')
        })


      var commentText;

      function handleCommentChange(){
        commentText = this.value
        this.value = ""
      }

      function postComment(){
        d3.event.preventDefault();
        console.log(commentText)

        //reset text field
        d3.selectAll('#comment-input')
          .value = ""
        
        CommentForm
          .style('display', 'none')

        appendCommentToChart(commentText, onCommentTrackSrubTime, onCommentWaveFormPosition)
        commentText = ""
      }

      function onMouseClick(d){
        onCommentTrackSrubTime = trackSrubTime;
        onCommentWaveFormPosition = waveFormPosition;

        CommentForm
          .style('display', 'flex')
          .style('flex-direction', 'row')
          .style('align-items', 'center')
          .style("left", (d3.event.pageX + 20) + "px")
          .style("top", (d3.event.pageY - 5) + "px")
      }

      function appendCommentToChart(text, sTime, w){

        lineData = [{"x": w-9, 'y': 0}, {"x": w-9, 'y': height+1000}]

        var lineFunction = d3.line()
                      .x(function(d) { return d.x; })
                      .y(function(d) { return d.y; })

        d3.select('svg').append('path')
                        .attr("d", lineFunction(lineData))
                        .attr('stroke', 'rgb(140,198,109)')
                        .attr('stroke-width', barWidth)
                        .attr('fill', 'none')

        var newComment = d3.select('#viz-container').append('div')
          .style('left', w - 3 + "px")
          .style('top', height+25 + "px")
          .style("background-color", "black")
          .style("padding", "5px")
          .style("color", "white")
          .style('position', "absolute")
          .style('width', '200px')
          .style('height', '100px')
          .style('display', 'flex')
          .style('flex-direction', "column")

          newComment.append('div')
          .text("@"+sTime)
          .style('color', 'rgb(140,198,109)')
          
          newComment.append('div')
          .text(text)
          .style('color', 'white')
      }
  }

  function secondsToMinutes(seconds){
    minutes = Math.floor(seconds / 60)
    seconds = Math.floor(seconds % 60)
    if(seconds < 10){
      seconds = "0"+seconds
    }
    return minutes + ":" + seconds
  }