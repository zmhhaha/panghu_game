FROM nginx:1.27-alpine

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY index.html app.js styles.css /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/

EXPOSE 80
