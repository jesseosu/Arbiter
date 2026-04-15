FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --production

FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p data
EXPOSE 4000
CMD ["node", "server.js"]
