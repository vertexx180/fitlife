FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
VOLUME ["/app/data"]
EXPOSE 3001
CMD ["node", "server.js"]
