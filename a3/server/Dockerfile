FROM nimmis/apache

RUN add-apt-repository ppa:chris-needham/ppa
RUN apt-get update
RUN apt-get install audiowaveform -y

WORKDIR /var/www/html
ADD /src src