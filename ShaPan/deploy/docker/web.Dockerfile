FROM nginx:1.27-alpine
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css app.js maps.js /usr/share/nginx/html/
COPY reference /usr/share/nginx/html/reference
EXPOSE 80
