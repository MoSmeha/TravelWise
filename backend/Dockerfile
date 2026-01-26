FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"

RUN npx prisma generate

RUN npm run build

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"

RUN npx prisma generate

COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/index.js"]
