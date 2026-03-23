# 🐳 Despliegue con Docker - Quick Start

## En tu máquina local (Windows)

```powershell
# Construir y levantar los contenedores
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

## En tu VM (Ubuntu/Oracle Cloud)

```bash
# Opción 1: Usando el script de despliegue (Recomendado)
chmod +x deploy.sh
./deploy.sh start

# Ver logs
./deploy.sh logs

# Reiniciar
./deploy.sh restart

# Detener
./deploy.sh stop

# Opción 2: Usando docker-compose directamente
docker-compose up -d
docker-compose logs -f
docker-compose down
```

## Archivos creados

- **`client/Dockerfile`** - Imagen de React + Nginx
- **`client/nginx.conf`** - Configuración de Nginx para servir el cliente y hacer proxy al servidor
- **`client/.dockerignore`** - Archivos a ignorar en el build del cliente
- **`server/Dockerfile`** - Imagen de Node.js + Express
- **`server/.dockerignore`** - Archivos a ignorar en el build del servidor
- **`docker-compose.yml`** - Orquestación de servicios
- **`.env.example`** - Variables de entorno de ejemplo
- **`deploy.sh`** - Script de despliegue para Linux
- **`deploy.ps1`** - Script de despliegue para Windows
- **`DEPLOYMENT.md`** - Guía completa de despliegue

## Estructura de servicios

```
┌─────────────────────────────────────┐
│  pokemontrivial.duckdns.org (80)   │
└──────────────────┬──────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Nginx (cliente)    │
        │  puerto 80          │
        └──────────┬──────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼────┐      ┌────────▼────┐
   │ Static  │      │  /api,      │
   │ Files   │      │  /socket.io │
   │         │      └────────┬────┘
   └─────────┘               │
                   ┌────────▼────┐
                   │ Express API │
                   │ puerto 3001 │
                   └─────────────┘
```

## URLs de acceso

- **Cliente web**: 
  - Local: `http://localhost`
  - Remoto: `http://pokemontrivial.duckdns.org`

- **Servidor API**:
  - Health check: `http://localhost:3001/api/health`
  - Starters: `http://localhost:3001/api/starters`

## Variables de entorno

Las variables están en `docker-compose.yml`. Para personalizarlas en la VM:

```bash
# Crear un archivo .env en la raíz
cp .env.example .env

# Editar
nano .env

# Las variables se cargarán automáticamente
```

## Troubleshooting común

**¿Puerto 80 no disponible?**
```bash
# Cambiar puerto en docker-compose.yml
ports:
  - "8080:80"  # Usar puerto 8080
```

**¿El cliente no se conecta al servidor?**
```bash
# Verificar que el servidor está corriendo
docker-compose ps

# Ver logs del servidor
docker-compose logs server

# Probar conexión
curl http://localhost:3001/api/health
```

**¿Permisos de Docker?**
```bash
# Agregar tu usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

## Actualizar el proyecto

```bash
# Descargar cambios
git pull

# Reconstruir y reiniciar
docker-compose up -d --build

# O si usas el script
./deploy.sh update
```

---

Para más detalles, ver [DEPLOYMENT.md](./DEPLOYMENT.md)
