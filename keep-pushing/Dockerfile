# Version web de Keep Pushing : export Expo + server.mjs (actualités relayées).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx expo export --platform web

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY server.mjs package.json ./
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
