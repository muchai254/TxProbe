# Production image: Rust analyzer + built frontend + Express server.
# Used by Heroku's container stack (heroku.yml); runs anywhere Docker does.

FROM rust:1-slim-bookworm AS analyzer
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release --bin txprobe-analyzer

FROM node:22-bookworm-slim AS web
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web ./
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY server ./server
COPY --from=analyzer /app/target/release/txprobe-analyzer ./target/release/txprobe-analyzer
COPY --from=web /app/web/dist ./web/dist
# Heroku sets PORT at runtime; server.js reads it.
CMD ["node", "server.js"]
