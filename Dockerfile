FROM node:18-slim

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Exponemos el puerto para el servidor HTTP
EXPOSE 3005

# Comando para ejecutar el bot
CMD [ "node", "index.js" ]
