# 🌩️ Despliegue en Oracle Cloud

## Configuración de Seguridad (Security Lists)

### 1. Crear/Modificar la Security List

VIA OCI Console:
1. Ir a **Networking > Virtual Cloud Networks**
2. Seleccionar tu VCN
3. Ir a **Security Lists**
4. Seleccionar la security list de tu instancia
5. **Add Ingress Rule** con:

```
Stateless: ☑ Checked
Source Type: CIDR
Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Source Port Range: (leave empty)
Destination Port Range: 80,443,3001
Description: Pokemon Quiz ports
```

Si necesitas acceso SSH también:
```
Destination Port Range: 22,80,443,3001
```

## Instalación de Docker en Oracle Linux/Ubuntu

### Ubuntu 20.04+ (Recomendado)

```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias requeridas
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# 3. Agregar repositorio oficial de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# 5. Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 6. Iniciar Docker
sudo systemctl start docker
sudo systemctl enable docker

# 7. Agregar usuario actual al grupo docker
sudo usermod -aG docker $USER

# 8. Aplicar nuevo grupo (en sesión actual)
newgrp docker

# 9. Verificar instalación
docker --version
docker-compose --version
```

### Oracle Linux 8/9

```bash
# 1. Actualizar sistema
sudo dnf update -y

# 2. Instalar Docker
sudo dnf install -y docker-engine

# 3. Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Iniciar y habilitar Docker
sudo systemctl start docker
sudo systemctl enable docker

# 5. Agregar usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker

# 6. Verificar
docker --version
```

## Despliegue del Proyecto

### 1. Clonar el repositorio

```bash
# Navegar a carpeta deseada (ej: /opt, /home/usuario, etc)
cd /opt

# Clonar
git clone <tu-repositorio-url> quiz-pokemon
cd quiz-pokemon

# Si usas SSH:
# git clone git@github.com:usuario/quiz-pokemon.git
```

### 2. Configurar DNS DuckDNS (IMPORTANTE)

```bash
# 1. Ir a https://www.duckdns.org
# 2. Crear una cuenta o iniciar sesión
# 3. Agregar dominio "pokemontrivial"
# 4. Copiar el token

# 5. Actualizar tu IP en Duck DNS (requiere ejecutar periódicamente)
# Opción A: Manualmente (una sola vez si la IP es estática)
curl "https://www.duckdns.org/update?domains=pokemontrivial&token=<TU_TOKEN>&ip="

# Opción B: Con cron (auto cada 5 minutos)
crontab -e

# Agregar línea:
*/5 * * * * curl "https://www.duckdns.org/update?domains=pokemontrivial&token=<TU_TOKEN>&ip=" >> /home/usuario/duckdns.log 2>&1
```

### 3. Iniciar los servicios

```bash
# Opción A: Usando el script (Recomendado)
chmod +x deploy.sh
./deploy.sh start

# Ver logs
./deploy.sh logs

# Opción B: Directamente con docker-compose
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### 4. Verificar que está funcionando

```bash
# Salud del servidor
curl http://localhost:3001/api/health

# Salud del cliente
curl http://localhost/health

# Ver contenedores
docker-compose ps

# Ver recursos
docker stats
```

## ¡Ahora accede a tu aplicación!

- **En la red local de la VM**: `http://localhost`
- **Desde internet**: `http://pokemontrivial.duckdns.org`

## Solución de problemas comunes

### El dominio no resuelve

```bash
# Verificar que el DNS se actualizó correctamente
nslookup pokemontrivial.duckdns.org

# Si no funciona, ejecutar manualmente
curl "https://www.duckdns.org/update?domains=pokemontrivial&token=<TU_TOKEN>&ip="
```

### El cliente no puede conectarse al servidor

```bash
# Verificar que el servidor está en línea
docker-compose logs server | tail -20

# Verificar conectividad entre contenedores
docker exec pokemon-quiz-client ping server

# Reiniciar servicios
docker-compose restart
```

### Puerto 80 está ocupado

```bash
# Ver qué está usando el puerto 80
sudo lsof -i :80

# Si hay otro servicio, detenerlo o cambiar puerto en docker-compose.yml
```

### Permisos de Docker

```bash
# Si necesitas usar sudo para docker
sudo usermod -aG docker $USER
# Cerrar sesión SSH y volver a conectar
```

## Mantener actualizado

```bash
# Actualizar código del repositorio
git pull

# Reconstruir imágenes e iniciar
docker-compose up -d --build

# O usar el script
./deploy.sh update
```

## Monitoreo y Mantenimiento

### Ver logs en tiempo real

```bash
# Todos los servicios
docker-compose logs -f

# Solo servidor
docker-compose logs -f server

# Solo cliente
docker-compose logs -f client

# Últimas 50 líneas
docker-compose logs --tail=50 server
```

### Limpiar espacio en disco

```bash
# Eliminar imágenes no usadas
docker image prune -a

# Eliminar contenedores parados
docker container prune

# Eliminar volúmenes no usados
docker volume prune

# Limpieza completa (CUIDADO)
docker system prune -a
```

### Backups

```bash
# Hacer backup de datos (si hay volúmenes)
docker-compose exec server tar czf /tmp/backup.tar.gz /app/data

# Descargar locally
scp usuario@tu-ip:/tmp/backup.tar.gz ./
```

## HTTPS con Let's Encrypt (Opcional pero Recomendado)

```bash
# Crear estructura de directorios
mkdir -p certbot/{conf,logs,www}

# Generar certificado (IMPORTANTE: detener docker antes)
docker-compose down

docker run --rm \
  -v "$PWD/certbot/conf:/etc/letsencrypt" \
  -v "$PWD/certbot/logs:/var/log/letsencrypt" \
  -v "$PWD/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d pokemontrivial.duckdns.org \
  --email tu-email@example.com \
  --agree-tos \
  --non-interactive

# Los certificados ahora están en ./certbot/conf/live/pokemontrivial.duckdns.org/
```

Luego actualizar el `nginx.conf` para usar HTTPS y el `docker-compose.yml` para montar los certificados.

## Recursos útiles

- [Docker Documentation](https://docs.docker.com/)
- [Oracle Cloud Networking](https://docs.oracle.com/en-us/iaas/Content/Network/home.htm)
- [Duck DNS](https://www.duckdns.org/)
- [Let's Encrypt](https://letsencrypt.org/)

---

¿Problemas? Revisa los logs:
```bash
docker-compose logs -f
```
