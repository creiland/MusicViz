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

getBeat = () => {

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

    var secondsBetweenBeats = Math.round(1000*(1/(+BPMText/60)))/1000
    var currentTime = Math.round(1000*audioRef.currentTime)/1000

    //console.log(currentTime % secondsBetweenBeats)
    
    if(currentTime % secondsBetweenBeats < 0.01){
        
    }
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
        
        if(isPlaying){
            requestAnimationFrame(getBeat)
            renderArc();
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

    // bar.append('rect')
    //     .attr("width", width)
    //     .attr("height", height)
    //     .attr('color', "rgba(52,58,64, 1)")

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

    var node = d3.select('#viz-container')
        .append('svg')
        .attr("width", width)
        .attr("height", height)

    var g = node.append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var arc = d3.arc()
        .innerRadius(180)
        .outerRadius(240)
        .startAngle(0);

    var loadingArc = d3.arc()
        .innerRadius(90)
        .outerRadius(120)
        .startAngle(0);

    var background = g.append("path")
        .datum({ endAngle: tau })
        .style("fill", "#ddd")
        .attr("d", arc);

    // Add the foreground arc in orange, currently showing 12.7%.
    var foreground = g.append("path")
        .datum({ endAngle: 0 * tau })
        .style("fill", "orange")
        .attr("d", arc);

    g.append('text')
        .text(BPMText)
        .attr('font-size', 100)
        .attr('id', 'bpm-text')
        .style("text-anchor", "middle")
        .style('alignment-baseline', 'middle');

    var angle = 0;

    // d3.interval(function () {
    //     foreground.transition()
    //         .duration(BPMText / 60 * 1000 / 4)
    //         .attrTween("d", arcTween());
    // }, 1500);

    // Returns a tween for a transition’s "d" attribute, transitioning any selected
    // arcs from their current angle to the specified new angle.
    function arcTween(newAngle, loading) {

        angle += 0.25
        if (angle > 1) {
            angle = 0;
        }

        if (!newAngle) {
            var newAngle = angle * tau;
        }

        // The function passed to attrTween is invoked for each selected element when
        // the transition starts, and for each element returns the interpolator to use
        // over the course of transition. This function is thus responsible for
        // determining the starting angle of the transition (which is pulled from the
        // element’s bound datum, d.endAngle), and the ending angle (simply the
        // newAngle argument to the enclosing function).
        return function (d) {

            // To interpolate between the two angles, we use the default d3.interpolate.
            // (Internally, this maps to d3.interpolateNumber, since both of the
            // arguments to d3.interpolate are numbers.) The returned function takes a
            // single argument t and returns a number between the starting angle and the
            // ending angle. When t = 0, it returns d.endAngle; when t = 1, it returns
            // newAngle; and for 0 < t < 1 it returns an angle in-between.
            var interpolate = d3.interpolate(d.endAngle, newAngle);

            // The return value of the attrTween is also a function: the function that
            // we want to run for each tick of the transition. Because we used
            // attrTween("d"), the return value of this last function will be set to the
            // "d" attribute at every tick. (It’s also possible to use transition.tween
            // to run arbitrary code for every tick, say if you want to set multiple
            // attributes from a single function.) The argument t ranges from 0, at the
            // start of the transition, to 1, at the end.
            return function (t) {

                // Calculate the current arc angle based on the transition time, t. Since
                // the t for the transition and the t for the interpolate both range from
                // 0 to 1, we can pass t directly to the interpolator.
                //
                // Note that the interpolated angle is written into the element’s bound
                // data object! This is important: it means that if the transition were
                // interrupted, the data bound to the element would still be consistent
                // with its appearance. Whenever we start a new arc transition, the
                // correct starting angle can be inferred from the data.
                d.endAngle = interpolate(t);

                // Lastly, compute the arc path given the updated data! In effect, this
                // transition uses data-space interpolation: the data is interpolated
                // (that is, the end angle) rather than the path string itself.
                // Interpolating the angles in polar coordinates, rather than the raw path
                // string, produces valid intermediate arcs during the transition.
                if (loading) {
                    return loadingArc(d)
                }
                return arc(d);
            };
        };
    }
}

    audioRef = document.getElementById("audio")

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