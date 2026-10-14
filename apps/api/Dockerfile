# Multi-arch (amd64 + arm64 for Oracle Ampere). Build from repo root:
#   docker build -f apps/api/Dockerfile -t dembel-api .
FROM node:20-bookworm-slim AS build

WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api --include-workspace-root=false
COPY apps/api apps/api
RUN npm run build -w apps/api

FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/apps/api apps/api
WORKDIR /repo/apps/api
RUN mkdir -p /data/files && chown node:node /data/files
USER node
EXPOSE 4000
ENTRYPOINT ["/usr/bin/tini","--"]
# Apply pending migrations, then start
CMD ["sh","-c","node dist/db/migrate.js && node dist/main.js"]
