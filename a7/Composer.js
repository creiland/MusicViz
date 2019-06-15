// inspired by and built on top of https://roadtolarissa.com/synth/ and https://bl.ocks.org/alexmacy/cbe531e57c59071c4d702bcf79c43436

//helper functions
var f = function(str){ return function(obj){ return str ? obj[str] : obj; }}
var compose = function(g, h){ return function(d){ return g(h(d)); }}

var sampleRate = 44100,
        frequency = 220,
        waveCycles = 4,
        samples = sampleRate/frequency;

var buffer;

var width = 600,
    height = 600,
    numBeats = 16,
    pitches = [130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63, 146.83*2, 164.81*2, 174.61*2, 196.00*2, 220.00*2, 246.94*2, 261.63*2].reverse();

let toneScaleX = d3.scaleLinear().range([0,1]).domain([-width/8,width/8]).clamp(true);
let toneScaleY = d3.scaleLinear().range([0,1]).domain([-height/8,height/8]).clamp(true);

//beat number to angle
var rotationScale = d3.scaleLinear()
    .domain([0, numBeats - 1])
    .range([360/numBeats, 360]);

//pitch index to distance from center of circle
var heightScale = d3.scaleLinear()
    .domain([0, pitches.length])
    .range([100, height/2 - 1]);

//member of pitchs to arc path
var arc = d3.arc()
    .innerRadius(function(d, i){ return heightScale(i); })
    .outerRadius(function(d, i){ return heightScale(i + 1) - 0; })
    .startAngle(0)
    .endAngle(2*Math.PI/numBeats)

//waveform number to color
var color = d3.scaleOrdinal()
    .domain(d3.range(4))
    .range(['white', '#338AE5', '#FFB800', '#BA5FD6']);

//translate (0, 0) to center of svg to make circle math easier
var svg = d3.select('#viz-container')
    .append('svg')
    .attr('height', height)
    .attr('width', width)
  .append('g')
    .attr('transform', 'translate(' + [width/2, height/2] +')');

    svg
    .append('circle')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', width/8)
    .style('fill', 'lightgrey')

var circleLocation = [{x: 0, y: 0}]

var controller = svg.selectAll('circle.controller')
    .data(circleLocation)
    .enter()
    .append('circle')
    .attr('class', 'controller')
    .attr('cx', function(d){return d.x})
    .attr('cy', function(d){return d.y})
    .attr('r', 10)
    .style('fill', '#338AE5')
    .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));


function dragstarted(d) {
  d3.select(this).raise().classed("active", true);
}

function dragged(d) {
  var theta = angle(width/2, height/2, d3.event.x, d3.event.y)
  var rightLimit = -width/8 * Math.sin(theta)
  var leftLimit = -width/8 * Math.sin(theta)
  var upperLimit = width/8 * Math.cos(theta)
  var lowerLimit = -width/8 * Math.cos(theta)

  var newX = d3.event.x;
  var newY = d3.event.y;


    var dx = newX > rightLimit ? rightLimit : newX < leftLimit ? leftLimit : newX;
    var dy = newY > lowerLimit ? lowerLimit : newY < upperLimit ? upperLimit : newY;

  d3.select(this).attr("cx", d.x = dx).attr("cy", d.y = dy);
}

function dragended(d) {
  d3.select(this).classed("active", false);
}

function angle(cx, cy, ex, ey) {
  var dy = ey - cy;
  var dx = ex - cx;
  var theta = Math.atan2(dy, dx); // range (-PI, PI]
  theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
  //if (theta < 0) theta = 360 + theta; // range [0, 360)
  return theta;
}

//create a g element for each beat
//rotated so we only have to worry about circular math 
var beats = svg.selectAll('g.ray')
    .data(d3.range(numBeats)).enter()
  .append('g')
    .attr('class','ray')
    .attr('transform', function(d){ return 'rotate(' + rotationScale(d) + ')'; })

//add array of notes to each beat
var notes = beats.selectAll('path')
    .data(function(){ return pitches.map(function(d, i){ return {pitch: d, lockon: 0}; }); }).enter()
  .append('path')
    .attr('d', arc)
    .on('click', function(d){
      d.lockon = (d.lockon + 1) % 4;
      d.on = d.lockon;
      d3.select(this)
          .call(colorNote)
          .style('stroke', 'black');

      if (!window.ac) initAudio()
    })
    .on('mouseover', function(d){
      d.on = (d.lockon + 1) % 4;
      d3.select(this)
        .transition().duration(100)
          .style('fill', color(d.on));
    })
    .on('mouseout', function(d){
      d.on = d.lockon;
      d3.select(this)
        .transition().duration(1000)
          .call(colorNote);
    })
    .style('stroke-width', 1.4)
    .style('stroke', 'lightgrey')
    .style('fill', 'white')

function colorNote(selection){ selection.style('fill', compose(color, f('on'))); }


// dumb hack, thx chrome https://www.dailydot.com/debug/chrome-autoplay-block-games/
function initAudio(){
  ac = new AudioContext() || new webkitAudioContext();
  ac.createGain();
  var nextBeat = 0;
  var nextBeatTime = ac.currentTime;
    buffer = ac.createBuffer(1, samples * waveCycles, sampleRate);
  setInterval(function(){
    //ac time is more accurate than setInterval, look ahead 100 ms to schedule notes
    while (nextBeatTime < ac.currentTime + .1){    
      //grab the active beat column 
      beats.filter(function(d, i){ return i == nextBeat; })
        .selectAll('path')
          .each(function(d){
            //if the note is selected, play pitch at scheduled nextBeat
            if (d.on){
            //   var o = osc(d.pitch, d.on);
            //   o.osc.start(nextBeatTime);
            //   o.osc.stop(nextBeatTime + getDuration())
                var o = playSound(d.pitch, d.on)
                o.start(nextBeatTime)
                var duration = getDuration()
                o.stop(nextBeatTime + getDuration() + duration + duration/2)
            }
            //highlight and unhighlight selected column
            //visually exact timing doesn't matter as much
            //easier to hear something off by a few ms
            var selection = d3.select(this).style('stroke', 'grey')
            //use timeout instead of transition so mouseovers transitions don't cancel)
            setTimeout(function(){
              selection.style('stroke', 'lightgrey');
            }, getBPM()*1000)
          })

      //update time and index of nextBeat 
      nextBeatTime += getBPM();
      nextBeat = (nextBeat + 1) % numBeats; 
    }
  }, 25)
}

//add sliders to the page
var sliders = d3.select('#synthSliders').selectAll('input')
    .data(['Pitch', 'BPM', 'Duration']).enter()

    sliders
  .append('div')
    .style({display: 'inline-block', 'margin-left': '89.5px', 'text-align': 'center'})

sliders.append('p').text(f());

sliders.append('p').append('input')
    .attr({type: 'range', min: '0', max: '1', step: '0.0001', value: '.5'})
    .attr('id', f())
    .style('width', '127px');

//use inverse log scales for finer control over high and low values 
function getPitch(){
  var scale = d3.scaleLog().base(2).domain([.1, 10]);
  return scale.invert((d3.select('#Pitch').node().valueAsNumber));
}
function getBPM(){
  var scale = d3.scaleLog().base(2).domain([40, 1200]);
  var rv = 60/scale.invert((d3.select('#BPM').node().valueAsNumber));
  return rv;
}
function getDuration(){
  var scale = d3.scaleLog().base(2).domain([.05, 1]);
  return scale.invert((d3.select('#Duration').node().valueAsNumber));
}

loadAudio();

var elasticLabel = svg.append("text")
        .attr("x", 0)
        .attr("y", middle/8)
        .attr("text-anchor", "start")
        .text("Elastic: 25%" )

    var sineLabel = svg.append("text")
        .attr("x", width - 15)
        .attr("y", 20)
        .attr("text-anchor", "end")
        .text("Sine: 25%")

    var squareLabel = svg.append("text")
        .attr("x", 15)
        .attr("y", height - 20)
        .attr("text-anchor", "start")
        .text("Square: 25%")

    var triangleLabel = svg.append("text")
        .attr("x", width - 15)
        .attr("y", height - 20)
        .attr("text-anchor", "end")
        .text("Triangle: 25%")

function update() {
        var xTone = toneScaleX(circleLocation[0].x),
            yTone = toneScaleY(circleLocation[0].y);

        loadAudio(xTone, yTone)
    }

    function loadAudio(xTone = .5, yTone = .5) {
        for (i=0; i<buffer.length; i++) {
            var thisVal = (Math.abs(((i+samples/4) % samples)/(samples/2)-1))

            var eased = (((d3.easeSinInOut(thisVal) - .5) * yTone) + 
                        ((d3.easeLinear(thisVal) - .5) * (1 - yTone))) * xTone + 
                        
                        (((d3.easeElasticIn(thisVal) - .5) * (yTone)) +
                        ((Math.round(thisVal) - .5) * (1 - yTone))) * (1-xTone)
            
            buffer.getChannelData(0)[i] = eased;
        }
    }

function playSound(frequency, panning){
        samples = frequency/waveCycles
        buffer = ac.createBuffer(1, samples * waveCycles, 44100);
        source = ac.createBufferSource();
        source.buffer = buffer;
        console.log(panning)
        var panNode = ac.createStereoPanner();
        var gainNode = ac.createGain();
        gainNode.gain.setValueAtTime(0, ac.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(1.0, ac.currentTime + getDuration()/2);
        gainNode.gain.exponentialRampToValueAtTime(.8, ac.currentTime + getDuration()/1.1)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + getDuration() + getDuration()/2)
        source.connect(gainNode);
        if(panning > 1){
            if(panning == 2){
                //pan left
                panNode.pan.setValueAtTime(-1, ac.currentTime);
            } else if(panning == 3){
                panNode.pan.setValueAtTime(1, ac.currentTime);
            }
        } else {
            panNode.pan.setValueAtTime(0, ac.currentTime);
        }
        gainNode.connect(panNode)
        panNode.connect(ac.destination)
        update();
        source.loop = true;
        return source;
}