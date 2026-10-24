# Build from the repository root:  docker build -f ischoolv1-backend/Dockerfile .
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile \
 && pnpm --filter @ischool/backend... build \
 && pnpm --filter @ischool/backend deploy --legacy --prod /app

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app ./
COPY --from=build --chown=node:node /repo/ischoolv1-backend/dist ./dist
USER node
EXPOSE 3001
# Migrations run as a separate step before the new version starts:
#   docker run --rm --env-file school-a.env <image> node_modules/.bin/prisma migrate deploy
CMD ["node", "dist/main.js"]
