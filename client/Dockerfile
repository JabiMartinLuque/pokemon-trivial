# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

RUN apk add --no-cache curl

# Copiar archivos compilados
COPY --from=builder /app/dist /usr/share/nginx/html

# Crear nginx.conf con soporte HTTP y HTTPS
RUN cat > /etc/nginx/nginx.conf <<'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript application/json;

    upstream server {
        server server:3001;
    }

    # HTTP - redirige a HTTPS si el certificado existe
    server {
        listen 80;
        server_name _;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            # Si existen certificados, redirige a HTTPS
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS (si existen los certificados)
    server {
        listen 443 ssl;
        server_name _;
        
        ssl_certificate /etc/nginx/certs/live/pokemontrivial.duckdns.org/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/live/pokemontrivial.duckdns.org/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        root /usr/share/nginx/html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        location ~ ^/(api|socket.io) {
            proxy_pass http://server;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
