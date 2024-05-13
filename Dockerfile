FROM ubuntu:latest

RUN apt-get update && \
    apt-get install -y --no-install-recommends apache2 apache2-utils && \
    apt-get clean

WORKDIR /var/www/html/
COPY . .

EXPOSE 80
EXPOSE 443

CMD ["apache2ctl", "-D", "FOREGROUND"]