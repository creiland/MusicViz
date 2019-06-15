// inspired by and built on top of https://roadtolarissa.com/synth/ and https://bl.ocks.org/alexmacy/cbe531e57c59071c4d702bcf79c43436


//Frequency nodes
var canvas = document.getElementById('analyzer')
var helper = document.getElementById('hover-helper');
var ctx = canvas.getContext('2d');

//check for audio connections
let connected = false

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
var svg = d3.select('#composer-container')
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

let masterGain;
let ac;

//Frequency Analyser set up
let analyser;
let isResizing = false;

let dragging = false;
let filtered = false;

//TODO: change all globalstore to global
let filterLGlobal;
let filterRGlobal;

let vizAudioSrc = undefined ;

//filters
let lp;
let hp;

let gain;
// dumb hack, thx chrome https://www.dailydot.com/debug/chrome-autoplay-block-games/

//Stereo Analyser set up
let analyserL = undefined;
let analyserR = undefined;

let splitter;

function initAudio(){
  ac = new AudioContext() || new webkitAudioContext();
  analyser = ac.createAnalyser();
  masterGain = ac.createGain();
  //masterGain.connect(ac.destination)

  masterGain.connect(analyser);

    //lowpass filter
    lp = ac.createBiquadFilter();
    lp.type = "lowpass"
    lp.frequency.value = 20000;
    //highpass filter
    hp = ac.createBiquadFilter();
    hp.type = "highpass"
    hp.frequency.value = 1;
    //gain

    masterGain.connect(lp);
    lp.connect(hp);

    splitter = ac.createChannelSplitter(2);

  // create gain nodes
  gainL = ac.createGain();
  gainR = ac.createGain();

  // create analyser nodes
  analyserL = ac.createAnalyser();
  analyserR = ac.createAnalyser();

  // create merger and general
  merger = ac.createChannelMerger(2);
  gainGeneral = ac.createGain();

    //node.connect(splitter)
    hp.connect(splitter);

  // left and right to gain
  splitter.connect(gainL, 0);
  splitter.connect(gainR, 1);

  //connect left and right analyzers
  splitter.connect(analyserL, 0, 0)
  splitter.connect(analyserR, 1, 0)

  // gain to merger
  gainL.connect(merger, 0, 0);
  gainR.connect(merger, 0, 1)

  // merged signal to common gain node
  merger.connect(gainGeneral);

  // gain to output
  gainGeneral.connect(ac.destination);

  analyserR.fftSize = 4096;
  analyserL.fftSize = 4096;

//   setAudio(ac, masterGain);
//   connectAudioNodes(ac, splitter);
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
var sliders = d3.selectAll('div#synthSliders').selectAll('input')
    .data(['Pitch', 'BPM', 'Duration']).enter()

//     sliders
//   .append('div')
//     .style({display: 'inline-block', 'margin-left': '89.5px', 'text-align': 'center'})

// sliders.append('p').text(f());

// sliders.append('p').append('input')
//     .attr({type: 'range', min: '0', max: '1', step: '0.0001', value: '.5'})
//     .attr('id', f())
//     .style('width', '127px');

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

//loadAudio();

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

freezeViz = () => {
    if (isResizing) {
        document.getElementById("analyzer").style.display = "none";
        isResizing = true;
        window.setTimeout(function() {
            if (document.getElementById("analyzer")) {
                document.getElementById("analyzer").style.display = "block";
            }
            isResizing = false;
        }, 1000);
    }
}

function connectAudioNodes(context, splitterNode){
    if(context){
        context.resume();
    }
    masterGain.connect(analyser);

    //lowpass filter
    lp = context.createBiquadFilter();
    lp.type = "lowpass"
    lp.frequency.value = 20000;
    //highpass filter
    hp = context.createBiquadFilter();
    hp.type = "highpass"
    hp.frequency.value = 1;
    //gain
    intermediate = context.createGain();

    masterGain.connect(lp);
    lp.connect(hp);
    hp.connect(splitterNode);
}

function filterAudio(coords){

    // sort out left/right values
    var filterL = Math.min(coords.press, coords.release);
    filterL = Math.max(filterL, 1);
    var filterR = Math.max(coords.press, coords.release);
    filterR = Math.min(filterR, 600)


    // linear math
    // var filterL = 20000 * (filterL / 600);
    // var filterR = 20000 * (filterR / 600);

    // log math
    let min = 1;
    let max = 20000;
    let b = Math.log(max/min)/(max/min);
    let a = 20000 / Math.exp(b*20000);
    filterL = a * Math.exp(b*filterL);
    filterR = a * Math.exp(b*filterR);
    filterL = (filterL - 1) * 20000;
    filterR = (filterR - 1) * 20000;

    hp.frequency.value = filterL;
    lp.frequency.value = filterR;

    let freqText = Math.round(hp.frequency.value) + "Hz - " + Math.round(lp.frequency.value) + "Hz"
    document.getElementById("freq-text").innerText = freqText;
}

function resetFilter(){
    hp.frequency.value = 20;
    lp.frequency.value = 20000;
    filtered = false;
}

function createVisualization(context){
    if(!analyser){
  
    var mousePosX = null;

    var filterX = {press: null, release: null};

    helper.addEventListener('mousemove', event => {
        let bound = canvas.getBoundingClientRect();

        mousePosX = (event.clientX - bound.left) * ((canvas.width) / canvas.width);
    });

    helper.addEventListener('mouseout', event => {
        mousePosX = null;
        dragging = false;
    });

    helper.addEventListener('mousedown', event => {
        let bound = canvas.getBoundingClientRect();

        dragging = true;
        filterX.press = (event.clientX - bound.left - canvas.clientLeft) * ((canvas.width) / canvas.width);
        filterX.release = filterX.press;
    });

    helper.addEventListener('mouseup', event => {
        let bound = canvas.getBoundingClientRect();
        filterX.release = (event.clientX - bound.left - canvas.clientLeft) * ((canvas.width) / canvas.width);
        if (Math.abs(filterX.release - filterX.press) > 10) {
            filtered = true;
            filterAudio(filterX, canvas.width)
            setTimeout(function(){ dragging = false; }, 10);
        } else {
            filtered = false;
            dragging = false;
        }
        });
    }

    function renderFrame(){
        var freqData = new Uint8Array(analyser.frequencyBinCount)
        requestAnimationFrame(renderFrame)
        analyser.getByteFrequencyData(freqData)
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // 1.072 for 100 bars
        // 1.0235 for 300 bars 
        let logBase = 1.0475;

        var logIndex = 1;
        let bars = 150;

        // start at origin
        var originX = 0;
        var originY = canvas.height - (freqData[Math.floor(1)] / 2);

        for (var i = 1; i < bars + 1; i++) {
            var bar_x = (i - 1) * 2;
            // Bar width not being used right now
            // var bar_width = 1;
            var bar_height;
            // bass smoothing
            if (i < 16) {
                bar_height = freqData[Math.floor(logIndex)] + ((freqData[Math.floor(logIndex) + 1] - freqData[Math.floor(logIndex)]) * (i / 10));
            } else if (i < 24) {
                bar_height = freqData[Math.floor(logIndex)] + ((freqData[Math.floor(logIndex) + 1] - freqData[Math.floor(logIndex)]) * ((i - 15) / 8));
            } else {
                bar_height = freqData[Math.floor(logIndex)];
            }
            bar_height = (bar_height / 2)

            // hover to select first bar
            if (bar_x * 2 >= mousePosX - 2 && bar_x * 2 <= mousePosX + 2 && mousePosX && !dragging) {
                //ctx.fillStyle = "rgba(140, 198, 109, 1)";
                ctx.fillStyle = 'rgba(173,255,60, 1)'
            
            // drag to select last bar
            } else if (dragging) {
                let filterL = Math.min(filterX.press, mousePosX);
                let filterR = Math.max(filterX.press, mousePosX);

                filterLGlobal = filterL;
                filterRGlobal = filterR;

                if (bar_x * 2 >= filterL && bar_x * 2 <= filterR) {
                    //ctx.fillStyle = "rgba(140, 198, 109, 1)";
                    ctx.fillStyle = 'rgba(173,255,60, 1)'
                } else {
                    //ctx.fillStyle = "rgba(140, 198, 109, .5)"
                    ctx.fillStyle = 'rgba(173,255,60, .5)'
                }

            // audio content filtered
            } else if (filtered) {

                if (bar_x * 2 >= filterLGlobal && bar_x * 2 <= filterRGlobal) {
                    //ctx.fillStyle = "rgba(140, 198, 109, 1)";
                    ctx.fillStyle = 'rgba(173,255,60, 1)'
                } else {
                    ctx.fillStyle = "rgba(0,0,0,.05)"
                }

            // no current interaction
            } else {
                //ctx.fillStyle = "rgba(140, 198, 109, .5)";
                ctx.fillStyle = 'rgba(173,255,60, .5)'
            }

            ctx.beginPath();
            originX = (i - 1) * 2;
            ctx.moveTo(originX, originY);
            var destX = originX + 1;
            var destY = canvas.height - bar_height;
            ctx.lineTo(destX, destY);
            ctx.lineTo(destX, canvas.height);
            ctx.lineTo(originX, canvas.height);
            ctx.lineTo(originX, originY);
            ctx.strokeStyle = "#ADFF3C"//"#8CC66D";
            ctx.fill();
            ctx.moveTo(destX, destY);
            originY = destY;

            logIndex = logIndex * logBase;
        }
    };
    if (!isResizing) {
        renderFrame();
    }
}

function setAudio(context, node) {

    // setting up source
  splitter = context.createChannelSplitter(2);

  // create gain nodes
  gainL = context.createGain();
  gainR = context.createGain();

  // create analyser nodes
  analyserL = context.createAnalyser();
  analyserR = context.createAnalyser();

  // create merger and general
  merger = context.createChannelMerger(2);
  gainGeneral = context.createGain();

    //node.connect(splitter)

  // left and right to gain
  splitter.connect(gainL, 0);
  splitter.connect(gainR, 1);

  //connect left and right analyzers
  splitter.connect(analyserL, 0, 0)
  splitter.connect(analyserR, 1, 0)

  // gain to merger
  gainL.connect(merger, 0, 0);
  gainR.connect(merger, 0, 1)

  // merged signal to common gain node
  merger.connect(gainGeneral);

  // gain to output
  gainGeneral.connect(context.destination);

  analyserR.fftSize = 4096;
  analyserL.fftSize = 4096;
  //renderDots();
}

var selectionTopLeftX;
var selectionTopLeftY;
var selectionBottomRightX;
var selectionTBottomRightY;

var node = d3.selectAll('#stereo-cont')
  .append('svg')
  .attr("width", 500)
  .attr("height", 500)

  node
  .on("mousedown", mousedown)
    .on("mouseup", mouseup);

node
  .append('g')
  .attr("id", "chart")
  .attr("width", 500)
  .attr("height", 500)

node.append('line')
  .attr("x1", 0)
  .attr("y1", 250)
  .attr("x2", 500)
  .attr("y2", 250)
  .style('stroke', 'black')
  .attr('stroke-opacity', .5)

node.append('line')
  .attr("x1", 250)
  .attr("y1", 0)
  .attr("x2", 250)
  .attr("y2", 500)
  .style('stroke', 'black')
  .attr('stroke-opacity', .5)

node.append('circle')
  .attr("cx", 250)
  .attr("cy", 250)
  .attr('r', 125)
  .style('fill', 'none')
  .style('stroke', 'black')
  .attr('stroke-opacity', .5)

node.append('circle')
  .attr("cx", 250)
  .attr("cy", 250)
  .attr('r', 250)
  .style('fill', 'none')
  .style('stroke', 'black')
  .attr('stroke-opacity', .5)

node.append('circle')
  .attr("cx", 250)
  .attr("cy", 250)
  .attr('r', 125 / 2)
  .style('fill', 'none')
  .style('stroke', 'black')
  .attr('stroke-opacity', .5)

node.append('text')
  .text("Left")
  .attr("transform", function (d, i) {
    return "translate(" + (250) + ", " + 15 + ")"
  })

node.append('text')
  .text("Right")
  .attr("transform", function (d, i) {
    return "translate(" + 460 + ", " + 250 + ")"
  })

function renderDots(){
  window.requestAnimationFrame(renderDots)
  var binCount = analyserR.fftSize;
  var leftData = new Uint8Array(binCount);
  var rightData = new Uint8Array(binCount);

  analyserR.getByteTimeDomainData(leftData);
  analyserL.getByteTimeDomainData(rightData);

  let width = 500;
  let height = 500;

  var y = d3.scaleLinear()
    .range([height, -height])

  var max = d3.max(leftData, function (d) { return d })
  y.domain([-max, max])

  var maxX = d3.max(rightData, function (d) { return d })
  var x = d3.scaleLinear()
    .domain([-maxX, maxX]);

  var color = d3.scaleSequential(d3.interpolateInferno)
    .domain([0, 50])

  var chart = d3.select('#chart')


  var dot = chart
    .selectAll("circle")
    .data(leftData)

  dot
    .attr("cx", function (d, i) {
      return rightData[i] - 128;
    })
    .attr("cy", function (d, i) { return y(d - 128); })
    .attr('r', 1.7)
    .attr("id", 'dot')
    .attr("transform", function (d, i) {
      return "translate(" + (width / 2) + ", " + (height / 2) + ")"
    })
    .style('fill', function (d, i) {
      var colorData = Math.abs(rightData[i] - d)
      if(pointIsWithinSelection(rightData[i]-128 + width/2, y(d - 128) + height/2)){
        return 'blue'
      } else {
        return color(colorData)
      }
    })

  dot
    .enter()
    .append("circle")
    .attr("id", 'dot')
    .attr("cx", function (d, i) {
      return rightData[i] - 128;
    })
    .attr("cy", function (d, i) {
      return y(d - 128);
    })
    .attr('r', 1.7)
    .attr("transform", function (d, i) {
      return "translate(" + (width / 2) + ", " + (height / 2) + ")"
    })
    .style('fill', function (d, i) {
      var colorData = Math.abs(rightData[i] - d)
      if(pointIsWithinSelection(rightData[i]-128 + width/2, y(d - 128) + height/2)){
        return 'blue'
      } else {
        return color(colorData)
      }
    })

  dot.exit()
    .style("background", "red")
    .transition()
    .duration(function () {
      return 750
    })
    .style("opacity", 0)
    .remove();


  dot.attr("width", 10)
    .attr("height", 10)
}


function mousedown() {
  var m = d3.mouse(this);

  resetCurrentSelection();

  node.selectAll('rect').remove();
  node.selectAll('g.textCont').remove();
  node.selectAll('text.freqText').remove();

  setSelectionTopLeft(m);

  rect = node.append("rect")
      .attr("x", m[0])
      .attr("y", m[1])
      .attr("height", 0)
      .attr("width", 0)
      .style("fill", 'rgb(83,83,83, .7)')
      .style("stroke", 'black')

    textContainer = node.append("g")
    .attr('class', 'textCont')
    .attr("x", m[0])
    .attr("y", m[1])
    .attr("height", 0)
    .attr("width", 0)
    .attr("transform", function (d, i) {
      return "translate(" + (m[0]) + ", " + m[1] + ")"
    })

  node.on("mousemove", mousemove);
}

function mousemove(d) {
  var m = d3.mouse(this);

  setSelectionBottomRight(m);

  rect.attr("width", Math.max(0, m[0] - +rect.attr("x")))
      .attr("height", Math.max(0, m[1] - +rect.attr("y")))

      node.selectAll('text.freqText').remove();

  textContainer.attr("width", Math.max(0, m[0] - +textContainer.attr("x")))
                .attr("height", Math.max(0, m[1] - +textContainer.attr("y")))
                .append("text")
                .attr('class', 'freqText')
                .text(getSelectionText())
                .attr("transform", function (d, i) {
                  return "translate(" + (0) + ", " + -10 + ")"
                })
}

function mouseup() {
  node.on("mousemove", null);
}

function setSelectionTopLeft(m){
  selectionTopLeftX = m[0];
  selectionTopLeftY = m[1]
}

function setSelectionBottomRight(m){
  selectionBottomRightX = m[0];
  selectionTBottomRightY = m[1]
}

function getSelectionText(){
  return "(" + Math.round(selectionTopLeftX) + ", " + Math.round(selectionTopLeftY) +") (" + Math.round(selectionBottomRightX )+ ", " + Math.round(selectionTBottomRightY) + ")"
}

pointIsWithinSelection = (x, y) => {
  if(x < selectionBottomRightX && x > selectionTopLeftX && y < selectionTBottomRightY && y > selectionTopLeftY){
    return true;
  } else {
    return false
  }
}

resetCurrentSelection = () => {
  selectionBottomRightX = 1
  selectionTBottomRightY = 1
  selectionTopLeftX = 1
  selectionTopLeftY = 1
}

function playSound(frequency, panning){
        samples = frequency/waveCycles
        buffer = ac.createBuffer(1, samples * waveCycles, 44100);
        source = ac.createBufferSource();
        source.buffer = buffer;
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
        panNode.connect(masterGain)
        createVisualization(ac, masterGain)
        renderDots();
        // if(!connected){
        //     setAudio(ac, masterGain);
        //     connected = true;
        // }
        update();
        source.loop = true;
        return source;
}