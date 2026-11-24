# syntax=docker/dockerfile:1
# Build:  docker build --build-arg APP=web -t doyuyo-web .   (APP = web | admin)
# Tools:  docker build --target tools -t doyuyo-tools .      (migrate + seed)
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS tools
CMD ["pnpm", "db:migrate"]

FROM deps AS build
ARG APP=web
ARG NEXT_PUBLIC_SITE_URL=https://doyuyo.com
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @doyuyo/$APP build

FROM node:24-alpine AS run
ARG APP=web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 APP=$APP
WORKDIR /srv
COPY --from=build /repo/apps/$APP/.next/standalone ./
COPY --from=build /repo/apps/$APP/.next/static ./apps/$APP/.next/static
COPY --from=build /repo/apps/$APP/public ./apps/$APP/public
USER node
EXPOSE 3000
CMD ["sh", "-c", "node apps/$APP/server.js"]
