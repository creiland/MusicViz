let isResizing = false;
let vizAudio = document.getElementById("audio");
vizAudio.crossOrigin = 'anonymous';

let dragging = false;
let filtered = false;

let analyser;

//TODO: change all globalstore to global
let filterLGlobal;
let filterRGlobal;

let vizAudioSrc = undefined ;
let context;

//filters
let lp;
let hp;

let gain;


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

createVisualization = () => {
    
    
    var canvas = document.getElementById('analyzer')
    var helper = document.getElementById('hover-helper');
    var ctx = canvas.getContext('2d');
    setAudioNode();
    setVizAudioSrc();
    
    //TODO
    connectAudioNodes(context);
  
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


releaseAudioContext = () => {
    if(analyser && vizAudioSrc && lpContext){
        analyser.disconnect(lpContext);
        vizAudioSrc.disconnect(lpContext);
        vizAudioSrc = undefined;
        lpContext = undefined;
    }
}

resetVizAudioSrc = () => {
    vizAudioSrc = undefined;
}

setVizAudioSrc = () => {
    console.log("setting src")
    if (vizAudioSrc === undefined) {
        console.log("src is undefined")
        // Build element
        // Checks if user is on landing page
        vizAudioSrc = context.createMediaElementSource(vizAudio);
      }
}

setAudioNode = () =>{
    if(context === undefined){
        context = new AudioContext();
    }
    analyser = context.createAnalyser();
}

disconnectAudioNodes = () =>{
    tanalyser.disconnect(this.context);
    if (vizAudioSrc != null) {
        vizAudioSrc.disconnect();
    }
    //this.releaseAudioContext();
}

connectAudioNodes = (context) => {
    if(context){
        context.resume();
    }
    console.log(vizAudioSrc)
    vizAudioSrc.connect(analyser);

    //lowpass filter
    lp = context.createBiquadFilter();
    lp.type = "lowpass"
    lp.frequency.value = 20000;
    //highpass filter
    hp = context.createBiquadFilter();
    hp.type = "highpass"
    hp.frequency.value = 1;
    //gain
    gain = context.createGain();

    vizAudioSrc.connect(lp);
    lp.connect(hp);
    hp.connect(gain);
    gain.connect(context.destination)
}

filterAudio = (coords) => {

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

resetFilter = () => {
    hp.frequency.value = 20;
    lp.frequency.value = 20000;
    filtered = false;
}

isPlaying = false;

handleButton = (event) =>{
    if(!context){
        context = new AudioContext;
    }

    if(!isPlaying){
        vizAudio.play();
    }
    event.preventDefault();
    createVisualization();
}