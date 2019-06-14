docker rm -f waveform

docker build -t waveform .

docker run  -v vol:/src -p 8080:80 -d --name waveform waveform