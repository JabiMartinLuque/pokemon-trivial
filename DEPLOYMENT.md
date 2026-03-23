# 🚀 Guía de Despliegue - Pokemon Quiz

Esta guía te ayudará a desplegar el proyecto en tu máquina virtual de Oracle Cloud con Docker.

## 📋 Requisitos Previos

- Ubuntu 20.04+ en Oracle Cloud
- Docker instalado
- Docker Compose instalado
- Git
- Un dominio configurado con Duck DNS (pokemontrivial.duckdns.org)

## 🔧 Instalación de Docker en Ubuntu

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar tu usuario al grupo docker (opcional, evita usar sudo)
sudo usermod -aG docker $USER
newgrp docker

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar versiones
docker --version
docker-compose --version
```

## 📦 Despliegue del Proyecto

### 1. Clonar el repositorio
```bash
cd /home/usuario  # o la ruta donde desees guardarlo
git clone <tu-repo>
cd quiz-pokemon
```

### 2. Configurar variables de entorno (Opcional)
```bash
# El docker-compose.yml ya tiene valores por defecto
# Si deseas personalizarlos, crea un .env.production
cp .env.example .env.production

# Editar si es necesario
nano .env.production
```

### 3. Compilar e iniciar los contenedores
```bash
# Construir las imágenes y levantar los servicios
docker-compose up -d

# Ver logs de los servicios
docker-compose logs -f

# Ver estado de los contenedores
docker-compose ps
```

### 4. Verificar que todo funciona
```bash
# Verificar health del servidor
curl http://localhost:3001/api/health

# Verificar que el cliente está sirviendo
curl http://localhost/health
```

## 🌐 Configurar el Dominio DuckDNS

### Opción 1: Actualización manual de DuckDNS (Una vez)

1. Ir a https://www.duckdns.org
2. Iniciar sesión
3. Ir a "Installer"
4. Ejecutar los comandos para actualizar tu IP

### Opción 2: Actualización automática (Recomendado)

Crea un contenedor adicional para actualizar DuckDNS periódicamente:

```yaml
# Agregar a docker-compose.yml
duckdns:
  image: lscr.io/linuxserver/duckdns:latest
  container_name: pokemon-duckdns
  environment:
    PUID: 1000
    PGID: 1000
    TZ: America/Bogota  # Cambia según tu zona horaria
    SUBDOMAINS: pokemontrivial
    TOKEN: <tu-token-duckdns>
    LOG_FILE: true
  volumes:
    - ./duckdns/config:/config
  restart: unless-stopped
```

## 🔐 Configurar HTTPS con Let's Encrypt (Opcional pero Recomendado)

### Usando Certbot con docker-compose

```bash
# Crear directorio para certificados
mkdir -p ./certbot/conf ./certbot/www ./certbot/logs

# Generar certificado
docker run -it --rm --name certbot \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/logs:/var/log/letsencrypt" \
  certbot/certbot certonly \
  --standalone \
  -d pokemontrivial.duckdns.org \
  --email tu-email@example.com \
  --agree-tos \
  --non-interactive
```

Luego actualiza el `nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    ssl_certificate /cert/fullchain.pem;
    ssl_certificate_key /cert/privkey.pem;
    # ... resto de configuración
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name pokemontrivial.duckdns.org;
    return 301 https://$server_name$request_uri;
}
```

## 📦 Actualizar el Proyecto

```bash
# Descargar cambios
git pull

# Reconstruir las imágenes y reiniciar
docker-compose down
docker-compose up -d --build

# O simplemente reiniciar sin reconstruir
docker-compose restart
```

## 🛑 Detener los Servicios

```bash
# Detener sin eliminar contenedores
docker-compose stop

# Detener y eliminar contenedores
docker-compose down

# Eliminar volúmenes también
docker-compose down -v
```

## 📊 Monitoreo

```bash
# Ver recursos usados
docker stats

# Ver logs de un servicio específico
docker-compose logs server
docker-compose logs client

# Ver logs en tiempo real
docker-compose logs -f server

# Entrar a un contenedor
docker exec -it pokemon-quiz-server sh
```

## 🔧 Troubleshooting

### El cliente no puede comunicarse con el servidor
```bash
# Verificar que el servidor está corriendo
docker-compose ps
curl http://localhost:3001/api/health

# Revisar logs del cliente
docker-compose logs client

# Verificar conectividad entre contenedores
docker exec pokemon-quiz-client ping server
```

### Puerto 80 en uso
```bash
# Cambiar puerto en docker-compose.yml
# "8080:80" en lugar de "80:80"
# Luego actualizar dominio a http://pokemontrivial.duckdns.org:8080
```

### Permisos de Docker
```bash
# Si tienes problemas de permisos sin sudo
sudo usermod -aG docker $USER
# Cerrar sesión y volver a iniciarla
```

## 📝 Notas de Seguridad

- No commits `.env` con datos sensibles, usa `.env.example`
- Considera usar HTTPS en producción
- Configura un firewall en Oracle Cloud (solo puertos 80, 443)
- Mantén las imágenes de Docker actualizadas: `docker-compose pull`

## 🆘 Soporte

Si encuentras problemas, revisa:
1. Los logs: `docker-compose logs -f`
2. Conectividad de red: `docker network inspect quiz-pokemon_pokemon-network`
3. Estado de los contenedores: `docker-compose ps`
