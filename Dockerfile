FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
COPY hero.mp4 /usr/share/nginx/html/
COPY new /usr/share/nginx/html/new
COPY *.md /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
