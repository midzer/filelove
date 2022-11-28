FROM ubuntu 
RUN apt update 
RUN apt install -y apache2 
RUN apt install -y apache2-utils 
RUN apt clean 

WORKDIR /var/www/html/
COPY . .

EXPOSE 80
EXPOSE 443

CMD ["apache2ctl", "-D", "FOREGROUND"]