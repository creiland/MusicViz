// Inspired by http://joesul.li/van/beat-detection-using-web-audio/ and https://github.com/JMPerez/beats-audio-api/

let context;
let audioRef = document.getElementById('audio')
let source;
let analyser;
let filter;
let gain;

let BPM;

let audioFile = 'short.mp3'


function setAudio(event) {
    event.preventDefault();

    // setting up source
    context = new AudioContext();
    source = context.createMediaElementSource(audioRef)

    // create analyser node
    analyser = context.createAnalyser();

    // create filter
    filter = context.createBiquadFilter();
    filter.type = "lowpass"
    filter.frequency.value = 400;
    filter.Q.value = 0;
    filter.gain.value = 0;

    // connect
    source.connect(filter)
    filter.connect(analyser)

    // filter to output
    filter.connect(context.destination);

    //analyser.fftSize = 4096;
}

var isPlaying = false;

play = () => {
    if(!isPlaying){
        audioRef.play();
        isPlaying = true;
    }
    event.preventDefault()
    //getBPM();
    fetch(audioFile)
        .then(resp => resp.arrayBuffer())
        .then(buf => offlineContext(buf))

        // audioRef.onloadedmetadata = function() {
        //     fetch(audioFile)
        //         .then(resp => resp.arrayBuffer())
        //         .then(buf => offlineContext(buf))
        //   };
}

let kickPattern = []
let currentKickIndex = 0;

let currentAngle = 0;

function updateArc(updatedAngle){

    var tau = Math.PI * 2

    var color = d3.scaleSequential(d3.interpolateInferno)

    var arc = d3.arc()
        .innerRadius(180)
        .outerRadius(240)
        .startAngle(0);

    var svg = d3.selectAll('svg.arc')

    var g = svg.selectAll('g.arc-cont')

    var toChange = g.selectAll('path.new-arc')


    if(updatedAngle > .25){
        toChange.transition()
            .duration(100)
            .ease(d3.easeCircleIn)
            .attrTween("d", arcTween(updatedAngle * tau));
    } else {
        g.selectAll('path.old-arc').remove();
        toChange.attr('class', 'old-arc');
        g.append("path")
        .datum({ endAngle: 0 * tau })
        .attr('class', 'new-arc')
        .style("fill", color(Math.random()))
        .transition()
            .duration(100)
            .ease(d3.easeCircleIn)
            .attrTween("d", arcTween(updatedAngle * tau));
    }
    

            function arcTween(newAngle) {
                return function (d) {
                    var interpolate = d3.interpolate(d.endAngle, newAngle);
                    return function (t) {
                        d.endAngle = interpolate(t);
                        return arc(d);
                    };
                };
            }
}

getBeat = () => {
    //console.log(kickPattern[currentKickIndex] % audioRef.currentTime)
    if(kickPattern[currentKickIndex] - audioRef.currentTime < .001){
        currentAngle += 0.25;
        if(currentAngle>1){
            currentAngle = .25;
        }
        d3.selectAll('svg.arc').selectAll('g').selectAll('text')
        .transition()
        .duration(5)
        .style('opacity', .7)
        .transition()
        .duration(100)
        .ease(d3.easeCircleIn)
        .style('opacity', 1)

        updateArc(currentAngle);
        currentKickIndex++;
    }
    var time = audioRef.currentTime / audioRef.duration

    var test = d3.selectAll('svg').selectAll('g.bar')

    test.selectAll('rect.cur-time').remove()
    test.
    append('rect')
    .attr('class', 'cur-time')
    .attr('x', time * 700)
        .attr('y', 0)
    .attr('height', 50)
    .attr('width', 2)
    .attr('fill', 'red')

    requestAnimationFrame(getBeat)
}

print = () => {
    event.preventDefault()
    audioRef.pause();
    // var intervals = countIntervalsBetweenNearbyPeaks(peaks)
    // var tempoCount = groupNeighborsByTempo(intervals)
    // console.log(tempoCount)

}

function getPeaks(data) {

    var partSize = 22050,
        parts = data[0].length / partSize,
        peaks = [];

    for (var i = 0; i < parts; i++) {
        var max = 0;
        for (var j = i * partSize; j < (i + 1) * partSize; j++) {
            var volume = Math.max(Math.abs(data[0][j]), Math.abs(data[1][j]));
            if (!max || (volume > max.volume)) {
                max = {
                    position: j,
                    volume: volume
                };
            }
        }
        peaks.push(max);
    }

    peaks.sort(function (a, b) {
        return b.volume - a.volume;
    });

    peaks = peaks.splice(0, peaks.length * 0.5);

    peaks.sort(function (a, b) {
        return a.position - b.position;
    });

    return peaks;
}

function getIntervals(peaks) {

    var groups = [];

    peaks.forEach(function (peak, index) {
        for (var i = 1; (index + i) < peaks.length && i < 10; i++) {
            var group = {
                tempo: (60 * 44100) / (peaks[index + i].position - peak.position),
                count: 1
            };

            while (group.tempo < 90) {
                group.tempo *= 2;
            }

            while (group.tempo > 180) {
                group.tempo /= 2;
            }

            group.tempo = Math.round(group.tempo);

            if (!(groups.some(function (interval) {
                return (interval.tempo === group.tempo ? interval.count++ : 0);
            }))) {
                groups.push(group);
            }
        }
    });
    return groups;
}

var BPMText;

let audioSource = document.getElementById('audio-src')

function offlineContext(buffer) {
    var OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var offlineContext = new OfflineContext(2, audioRef.duration * 44100, 44100);

    offlineContext.decodeAudioData(buffer, function (buffer) {

        // Create buffer source
        var source = offlineContext.createBufferSource();
        source.buffer = buffer;

        var lowpass = offlineContext.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = 150;
        lowpass.Q.value = 1;

        source.connect(lowpass);

        var highpass = offlineContext.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 100;
        highpass.Q.value = 1;

        lowpass.connect(highpass);

        highpass.connect(offlineContext.destination);

        source.start(0);
        offlineContext.startRendering();
    });

    offlineContext.oncomplete = function (e) {
        var buffer = e.renderedBuffer;
        var peaks = getPeaks([buffer.getChannelData(0), buffer.getChannelData(1)]);
        var groups = getIntervals(peaks);

        var bufferLength = buffer.length

        audioSource.src = URL.createObjectURL(new Blob([buffer]));

        renderPeaks(peaks, bufferLength);

        var top = groups.sort(function (intA, intB) {
            return intB.count - intA.count;
        }).splice(0, 5);

        BPMText = top[0].tempo;

        let kickInterval = 1 / (+BPMText / 60)
            let newTime = 0;
            while(newTime < audioRef.duration){
                newTime += kickInterval;
                kickPattern.push(newTime)
            }
        
        if(isPlaying){
            requestAnimationFrame(getBeat)
            document.getElementById('bpm-text').textContent = BPMText;
        }
    }
}

renderPeaks = (data, bufferLength) => {
    height = 50;
    width = 700;

    console.log(bufferLength / 44100)
    
    var x = d3.scaleLinear()
        .domain([0, bufferLength]);


    var svg = d3.select('#peaks-viz')
        .append('svg')
        .attr("width", width)
        .attr("height", height)

    var bar = svg.append('g')
        .attr('class', 'bar')
        .attr("width", width)
        .attr("height", height)

    bar.append('rect')
        .attr("width", width)
        .attr("height", height)
        .attr('color', "rgba(52,58,64, 1)")
        .style('z-index', '0')

    var g = bar.selectAll('rect')
        .data(data)
        .enter()
        // .append("g")
        // .attr("transform", function(d, i){ 
        //     return "translate(" + x(d.position) * width + ",0)"})
        .append('rect')
        .attr('fill', 'blue')
        .attr('height', height)
        .attr('width', 1)
        .attr('x', function(d) {return x(d.position) * width})
        .attr('y', 0)
        .style('background-color', 'red')
        .style('z-index', '1000')
}

renderArc = () => {
    height = 500;
    width = 500;

    var tau = Math.PI * 2

    var color = d3.scaleSequential(d3.interpolateInferno)

    var node = d3.select('#viz-container')
        .append('svg')
        .attr('class', "arc")
        .attr("width", width)
        .attr("height", height)

    var g = node.append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
    .attr('class', 'arc-cont')

    var arc = d3.arc()
        .innerRadius(180)
        .outerRadius(240)
        .startAngle(0);

    var background = g.append("path")
        .datum({ endAngle: tau })
        .style("fill", "#ddd")
        .attr("d", arc);

    // Add the foreground arc in orange, currently showing 12.7%.
    var foreground = g.append("path")
        .datum({ endAngle: 0 * tau })
        .attr('class', 'new-arc')
        .attr('id', 'new-arc')
        .style("fill", color(Math.random()))
        .attr("d", arc);

    g.append('text')
        .text(BPMText)
        .attr('font-size', 100)
        .attr('id', 'bpm-text')
        .style("text-anchor", "middle")
        .style('alignment-baseline', 'middle');

    // d3.interval(function () {
    //     foreground.transition()
    //         .duration(BPMText / 60 * 1000 / 4)
    //         .attrTween("d", arcTween());
    // }, 1500);

    // Returns a tween for a transition’s "d" attribute, transitioning any selected
    // arcs from their current angle to the specified new angle.
}

    audioRef = document.getElementById("audio")
    renderArc();

    // audioRef.onloadedmetadata = function() {
    //     fetch(audioFile)
    //         .then(resp => resp.arrayBuffer())
    //         .then(buf => offlineContext(buf))
    //     renderArc();
    //   };

  //need to figure out how to sync
  // need to detect sync
    // then speed up/slow down until the rotation is synced to the thing

    //SOLUTION: just use current time and the BPM to figure it out boi