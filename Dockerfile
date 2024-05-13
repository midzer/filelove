FROM alpine:latest

RUN apk update && \
    apk add --no-cache apache2 apache2-utils

WORKDIR /var/www/localhost/htdocs/
COPY . .

EXPOSE 80
EXPOSE 443

CMD ["httpd", "-D", "FOREGROUND"]