# Build from repo root: docker build -f apps/web/Dockerfile -t dembel-web .
FROM node:20-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/web --include-workspace-root=false
COPY apps/web apps/web
ENV NEXT_TELEMETRY_DISABLED=1
# Render passes these as build args (see render.yaml)
ARG API_HOST
ARG API_URL
ENV API_HOST=$API_HOST API_URL=$API_URL
RUN npm run build -w apps/web

FROM node:20-bookworm-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node","apps/web/server.js"]
