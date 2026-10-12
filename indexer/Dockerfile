FROM node:24.14.1-bookworm-slim@sha256:b506e7321f176aae77317f99d67a24b272c1f09f1d10f1761f2773447d8da26c
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --ignore-workspace --frozen-lockfile
COPY config.yaml schema.graphql tsconfig.json ./
COPY abis ./abis
COPY src ./src
RUN pnpm codegen && pnpm typecheck && groupadd --gid 10001 spoke && useradd --uid 10001 --gid 10001 --create-home spoke && chown -R 10001:10001 /app
ENV NODE_ENV=production ENVIO_HASURA=false ENVIO_TUI=false ENVIO_PG_SCHEMA=envio ENVIO_PG_MAX_CONNECTIONS=2 ENVIO_INDEXER_PORT=9898 ENVIO_THROTTLE_CHAIN_METADATA_INTERVAL_MILLIS=500 ENVIO_THROTTLE_PRUNE_STALE_DATA_INTERVAL_MILLIS=30000
USER 10001:10001
EXPOSE 9898
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:9898/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["./node_modules/.bin/envio", "start"]
