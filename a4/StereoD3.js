
// Necessary math for vectorscope
var Vectorscope = function (w, h, options, analyserL, analyserR) {



  var audio = setAudio();

  /*
  audio.analyserR.fftSize = 4096;
  audio.analyserL.fftSize = 4096; 

  var binCount = analyser1.frequencyBinCount;
  var wave1 = new Uint8Array(binCount);
  var wave2 = new Uint8Array(binCount);

  var WIDTH = w || 200,
    HEIGHT = h || 200;

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // set the origin to the center of the canvas
  canvasCtx.translate(canvas.width * 0.5, canvas.height * 0.5);

  // rotate 45 degrees
  canvasCtx.rotate(45 * Math.PI / 180);

  if (!options) options = {};

  var opts = {
    scale: options.scale || 0.33,
    style: options.style || 'lines',
    thickness: options.thickness || 1.0,
    color: options.color || "#000000",
    bgColor: options.bgColor || 'rgba(255,255,255,0.33)',
    trail: options.trail || 1
  }

  this.setChannels = function (ch1, ch2) {
    ch1.connect(splitter);
    ch2.connect(splitter);
  };

  this.draw = function () {

    // canvasCtx.clearRect(-WIDTH,-HEIGHT,WIDTH*2,HEIGHT*2);
    canvasCtx.lineWidth = opts.thickness;
    canvasCtx.strokeStyle = opts.color;
    canvasCtx.fillStyle = opts.bgColor;

    canvasCtx.fillRect(-WIDTH, -HEIGHT, WIDTH * 2, HEIGHT * 2);

    analyser1.getByteTimeDomainData(wave1);
    analyser2.getByteTimeDomainData(wave2);

    canvasCtx.beginPath();

    for (var i = 0; i < binCount; i++) {
      var a = wave1[i] - 128;
      var b = wave2[i] - 128;

      var x = a * opts.scale;
      var y = b * opts.scale;


      if (opts.style == 'lines') {
        canvasCtx.lineTo(x, y);
      }
      if (opts.style == 'dots') {
        canvasCtx.arc(x, y, 1, 0, 2 * Math.PI, true);
      }
    }
    
    canvasCtx.stroke();

    window.requestAnimationFrame(this.draw.bind(this));
  };*/

  this.draw = function () {
    console.log(audio)
    return (audio);
  }
}

let analyserL;
let analyserR;
let context;

function setAudio() {

  // setting up source
  context = new AudioContext();
  var audioRef = document.getElementById("audio")
  var source = context.createMediaElementSource(audioRef)
  var splitter = context.createChannelSplitter(2);

  // create gain nodes
  gainL = context.createGain();
  gainR = context.createGain();

  // create analyser nodes
  analyserL = context.createAnalyser();
  analyserR = context.createAnalyser();

  // create merger and general
  merger = context.createChannelMerger(2);
  gainGeneral = context.createGain();

  source.connect(splitter)

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

  var binCount = analyserR.frequencyBinCount;
  var wave1 = new Uint8Array(binCount);

  console.log(analyserR.getByteTimeDomainData(wave1))

  return source;
  //vectorscope = new Vectorscope(500, 500, null, analyserL, analyserR);
}

let vectorscope = {};

handleButton = (event) => {
  event.preventDefault()
  vectorscope = new Vectorscope();
  //vectorscope.draw()
}

let playing = false;

play = (event) => {
  var audioRef = document.getElementById("audio")
  if (!playing) {
    audioRef.play();
    renderDots();
    //draw();
  } else {
    audioRef.pause();
  }
}

draw = () => {
  var binCount = analyserR.frequencyBinCount;
  var waveR = new Uint8Array(binCount);
  var waveL = new Uint8Array(binCount);

  var opts = { style: 'dots', scale: 10 }

  analyserR.getByteTimeDomainData(waveR);
  analyserL.getByteTimeDomainData(waveL);

  var canvas = document.getElementById("analyzerCanvas");
  canvas.width = 500;
  canvas.height = 500;
  var canvasCtx = canvas.getContext("2d");
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height)

  canvasCtx.beginPath();
  middleX = canvas.width / 2;
  canvasCtx.moveTo(middleX, canvas.height);
  canvasCtx.lineTo(middleX, 0);
  canvasCtx.moveTo(0, canvas.height / 2);
  canvasCtx.lineTo(canvas.width, canvas.height / 2);
  canvasCtx.stroke();

  canvasCtx.beginPath();

  binWidth = (canvas.width / 2) / waveR.length

  stereoData = { right: waveR, left: waveL };

  //requestAnimationFrame(renderDots);
  renderDots();

  canvasCtx.fill();
}

var node = d3.select('#viz-container')
  .append('svg')
  .attr("width", 500)
  .attr("height", 500)

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



renderDots = () => {
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
    .attr("transform", function (d, i) {
      return "translate(" + (width / 2) + ", " + (height / 2) + ")"
    })
    .style('fill', function (d, i) {
      var colorData = Math.abs(rightData[i] - d)
      return color(colorData)
    })

  dot
    .enter()
    .append("circle")
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
      return color(colorData)
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

renderSVGDots = () => {
  for (var i = 0; i < binCount; i++) {
    var a = waveR[i] - 128;
    var b = waveL[i] - 128;

    var R = a * -opts.scale;
    var L = b * opts.scale;

    if (opts.style == 'lines') {
      canvasCtx.moveTo(middleX, canvas.height / 2);
      canvasCtx.lineTo(R + middleX, L + canvas.height / 2);
    }
    if (opts.style == 'dots') {
      canvasCtx.moveTo(middleX, canvas.height / 2);
      canvasCtx.arc(R + middleX, L + canvas.height / 2, 2, 0, 2 * Math.PI, true);
    }
  }
}