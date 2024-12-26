FROM node:18-alpine

# Crear directorio de la aplicación
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY . ./

# Compilar TypeScript
RUN npm run build

# Exponemos el puerto para el servidor HTTP
EXPOSE 3005

# Comando para ejecutar el bot
CMD ["npm", "run", "start"]
