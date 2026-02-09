# Build client
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY client/package.json client/tsconfig.json client/vite.config.ts client/index.html ./client/
COPY client/src ./client/src

WORKDIR /app/client
RUN npm install
RUN npm run build

# Serve with Nginx
FROM nginx:alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 4000
CMD ["nginx", "-g", "daemon off;"]
