freezeViz() {
    if (!GlobalStore.isResizing) {
        document.getElementById("analyzer").style.display = "none";
        GlobalStore.isResizing = true;
        window.setTimeout(function() {
            if (document.getElementById("analyzer")) {
                document.getElementById("analyzer").style.display = "block";
            }
            GlobalStore.isResizing = false;
        }, 1000);
    }
}

createVisualization(){
    if(AuthStore.isAuthenticated){
        GlobalStore.setAudioNode();
    } else {
        GlobalStore.setLPAudioNode();
    }
    
    var canvas = this.refs.analyzerCanvas;
    this.helper = this.refs.helperCanvas;
    var ctx = canvas.getContext('2d');
    GlobalStore.vizAudio = GlobalStore.audioRef
    GlobalStore.vizAudio.crossOrigin = "anonymous";
    GlobalStore.setVizAudioSrc();
    if(AuthStore.isAuthenticated){
        GlobalStore.connectAudioNodes(GlobalStore.context);
    } else {
        GlobalStore.connectAudioNodes(GlobalStore.lpContext);
    }
    var mousePosX = null;

    var filterX = {press: null, release: null};

    this.helper.addEventListener('mousemove', event => {
        let bound = canvas.getBoundingClientRect();

        mousePosX = (event.clientX - bound.left) * ((canvas.width + 12) / canvas.width);
    });

    this.helper.addEventListener('mouseout', event => {
        mousePosX = null;
        GlobalStore.dragging = false;
    });

    this.helper.addEventListener('mousedown', event => {
        let bound = canvas.getBoundingClientRect();

        GlobalStore.dragging = true;
        filterX.press = (event.clientX - bound.left - canvas.clientLeft) * ((canvas.width + 12) / canvas.width);
        filterX.release = filterX.press + 10;
    });

    this.helper.addEventListener('mouseup', event => {
        let bound = canvas.getBoundingClientRect();
        filterX.release = (event.clientX - bound.left - canvas.clientLeft) * ((canvas.width + 12) / canvas.width);
        if (Math.abs(filterX.release - filterX.press) > 10) {
            GlobalStore.filtered = true;
            GlobalStore.filterAudio(filterX, canvas.width)
            setTimeout(function(){ GlobalStore.dragging = false; }, 10);
        } else {
            GlobalStore.filtered = false;
            GlobalStore.dragging = false;
        }
    });

    // RENDER LINES LOGARITHMICALLY

    // function renderFrame(){
    //     var freqData = new Uint8Array(GlobalStore.analyser.frequencyBinCount)
    //     requestAnimationFrame(renderFrame)
    //     GlobalStore.analyser.getByteFrequencyData(freqData)
    //     ctx.clearRect(0, 0, canvas.width, canvas.height)

    //     let logBase = 1.072;
    //     var logIndex = 1;
    //     let segments = 100;

    //     // start at origin
    //     var originX = 0;
    //     var originY = canvas.height;

    //     for (var i = 1; i < segments; i++) {
    //         ctx.beginPath();
    //         originX = (i - 1) * 3;
    //         ctx.moveTo(originX, originY);
    //         var destX = originX + 3;
    //         var destY = canvas.height - (freqData[Math.floor(logIndex)] / 2);
    //         ctx.lineTo(destX, destY);
    //         ctx.strokeStyle = "#000";
    //         ctx.stroke();
    //         ctx.moveTo(destX, destY);
    //         originY = destY;
    //         logIndex = logIndex * logBase;
    //     }
    // };

    // RENDER BOXES LOGARITHMICALLY

    // function renderFrame(){
    //     var freqData = new Uint8Array(GlobalStore.analyser.frequencyBinCount)
    //     requestAnimationFrame(renderFrame)
    //     GlobalStore.analyser.getByteFrequencyData(freqData)
    //     ctx.clearRect(0, 0, canvas.width, canvas.height)

    //     let logBase = 1.072;
    //     var logIndex = 1;
    //     let bars = 100;

    //     for (var i = 1; i < bars + 1; i++) {
    //         var bar_x = (i - 1) * 3;
    //         var bar_width = 2;
    //         if (i < 30) {

    //         }
    //         var bar_height = -(freqData[Math.floor(logIndex)] / 2);

    //         // hover to select first bar
    //         if (bar_x * 2 >= mousePosX - 3 && bar_x * 2 <= mousePosX + 3 && mousePosX && !GlobalStore.dragging) {
    //             ctx.fillStyle = "rgba(140, 198, 109, 1)";
            
    //         // drag to select last bar
    //         } else if (GlobalStore.dragging) {
    //             let filterL = Math.min(filterX.press, mousePosX);
    //             let filterR = Math.max(filterX.press, mousePosX);

    //             GlobalStore.filterL = filterL;
    //             GlobalStore.filterR = filterR;

    //             if (bar_x * 2 >= filterL && bar_x * 2 <= filterR) {
    //                 ctx.fillStyle = "rgba(140, 198, 109, 1)";
    //             } else {
    //                 ctx.fillStyle = "rgba(140, 198, 109, .3)"
    //             }

    //         // audio content filtered
    //         } else if (GlobalStore.filtered) {

    //             if (bar_x * 2 >= GlobalStore.filterL && bar_x * 2 <= GlobalStore.filterR) {
    //                 ctx.fillStyle = "rgba(140, 198, 109, 1)";
    //             } else {
    //                 ctx.fillStyle = "#EEE"
    //             }

    //         // no current interaction
    //         } else {
    //             ctx.fillStyle = "rgba(140, 198, 109, .3)";
    //         }
    //         ctx.fillRect(bar_x, canvas.height, bar_width, bar_height)
    //         logIndex = logIndex * logBase;
    //         console.log(logIndex);
    //     }
    // };

    // RENDER POLYGONS LOGARITHMICALLY

    function renderFrame(){
        var freqData = new Uint8Array(GlobalStore.analyser.frequencyBinCount)
        requestAnimationFrame(renderFrame)
        GlobalStore.analyser.getByteFrequencyData(freqData)
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
            if (bar_x * 2 >= mousePosX - 2 && bar_x * 2 <= mousePosX + 2 && mousePosX && !GlobalStore.dragging) {
                ctx.fillStyle = "rgba(140, 198, 109, 1)";
            
            // drag to select last bar
            } else if (GlobalStore.dragging) {
                let filterL = Math.min(filterX.press, mousePosX);
                let filterR = Math.max(filterX.press, mousePosX);

                GlobalStore.filterL = filterL;
                GlobalStore.filterR = filterR;

                if (bar_x * 2 >= filterL && bar_x * 2 <= filterR) {
                    ctx.fillStyle = "rgba(140, 198, 109, 1)";
                } else {
                    ctx.fillStyle = "rgba(140, 198, 109, .5)"
                }

            // audio content filtered
            } else if (GlobalStore.filtered) {

                if (bar_x * 2 >= GlobalStore.filterL && bar_x * 2 <= GlobalStore.filterR) {
                    ctx.fillStyle = "rgba(140, 198, 109, 1)";
                } else {
                    ctx.fillStyle = "rgba(0,0,0,.05)"
                }

            // no current interaction
            } else {
                ctx.fillStyle = "rgba(140, 198, 109, .5)";
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
            ctx.strokeStyle = "#8CC66D";
            ctx.fill();
            ctx.moveTo(destX, destY);
            originY = destY;

            logIndex = logIndex * logBase;
        }
    };
    if (!GlobalStore.isResizing) {
        renderFrame();
    }
}

render() {
    return (
        <div>
            <div id="mp3_player">
                <div id="audio_box"></div>
                <canvas
                    ref="helperCanvas"
                    id="hover-helper">
                </canvas>
                <canvas
                    ref="analyzerCanvas"
                    id="analyzer"
                    className="waveform-viz">
                </canvas>
            </div>
        </div>
    );
}
}

export default observer(FrequencyAnalyser);