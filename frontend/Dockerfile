# ============================================================
# TROSV frontend - multi-stage build: node build -> nginx serve.
#
# VITE_* variables are baked into the bundle at BUILD time (import.meta.env
# is replaced by Vite, not read at runtime). Pass them as build args when
# the defaults do not match your deployment:
#   docker compose build --build-arg VITE_API_URL=https://api.example.com frontend
# ============================================================

# ---- Build stage ----------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Dependency layer first for cache between builds.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage: nginx serving the SPA ---------------------------------
FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
