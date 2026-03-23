FROM node:20-alpine

WORKDIR /app

# Instalar curl para health checks
RUN apk add --no-cache curl

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm ci

# Copiar el resto del código
COPY . .

# Exponemos el puerto (por defecto 3001)
EXPOSE 3001

# Comando de inicio
CMD ["npm", "start"]
