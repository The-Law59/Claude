# Version web de Keep Pushing : export Expo + server.mjs (veille actualités, traduction).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx expo export --platform web

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
# Le serveur n'a besoin que du SDK Anthropic, pas des dépendances de l'app.
RUN npm init -y >/dev/null && npm install --omit=dev @anthropic-ai/sdk@0.133.0 && mkdir data && chown node data
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY server.mjs ./
COPY scripts ./scripts
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
