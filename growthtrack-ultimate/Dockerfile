FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN node scripts/generate-schema.mjs
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3001 DATABASE_URL=file:/data/ultimate.db FILE_STORAGE_ROOT=/data/files LOG_DIR=/data/logs BACKUP_DIR=/data/backups GROWTHTRACK_NOTES_V1=1
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/logger.js ./logger.js
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
# The server shares contracts with the clients.
COPY --from=build /app/src/lib/bodyMetricContract.js ./src/lib/bodyMetricContract.js
COPY --from=build /app/src/lib/agentActions.js /app/src/lib/agentPolicy.js /app/src/lib/aiContextTypes.js ./src/lib/
COPY --from=build /app/src/config/nativeEntries.js ./src/config/nativeEntries.js
COPY --from=build /app/src/config/products.js ./src/config/products.js
COPY --from=build /app/src/domains/workspace/contracts ./src/domains/workspace/contracts
COPY --from=build /app/src/components/calendar/calendarICS.js /app/src/components/calendar/calendarModel.js ./src/components/calendar/
RUN mkdir -p /data/files /data/logs /data/backups && chown -R node:node /data
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD ["node", "scripts/container-health.mjs"]
ENTRYPOINT ["node", "scripts/container-entry.mjs"]
