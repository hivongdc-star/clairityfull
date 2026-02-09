FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "dist/index.js"]
