FROM node:22-alpine AS web-build
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web .
RUN npm run build

FROM node:22-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy server
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/package*.json ./server/

# Copy built web app
COPY --from=web-build /app/web/dist ./web/dist

WORKDIR /app/server
RUN npm ci --omit=dev

EXPOSE 4000
CMD ["node", "dist/index.js"]


