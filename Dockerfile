FROM node:18-alpine

# Agregar dependencias necesarias
RUN apk add --no-cache curl

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar todas las dependencias incluyendo devDependencies
RUN npm install

# Instalar TypeScript globalmente
RUN npm install -g typescript

# Copiar el código fuente
COPY . ./

# Compilar TypeScript
RUN npm run build

# Limpiar devDependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3005/health || exit 1

# Exponemos el puerto para el servidor HTTP
EXPOSE 3005

# Comando para ejecutar el bot
CMD ["node", "--max-old-space-size=512", "dist/index.js"]
