# Stage 1: Install dependencies (production only)
FROM node:24-alpine AS deps-prod
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Install all dependencies (for building)
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 3: Build the application
FROM deps AS builder
WORKDIR /app
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate
COPY . .
RUN npm run build

# Stage 4: Production runner
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
COPY scripts/docker-entrypoint.sh ./entrypoint.sh

RUN chmod +x entrypoint.sh
USER nextjs
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
