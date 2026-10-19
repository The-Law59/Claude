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
# package.json de l'app (version affichée par /api/health) ; celui du dossier
# vient de npm init.
COPY --from=build /app/package.json ./package.app.json
COPY scripts ./scripts
USER node
EXPOSE 3000
# Santé : `docker ps` affiche healthy / unhealthy.
HEALTHCHECK --interval=1m --timeout=10s --start-period=2m \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
