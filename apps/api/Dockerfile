FROM node:26-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json

RUN npm ci --omit=dev --workspace=@huddle/api --include-workspace-root=false

COPY apps/api/src ./apps/api/src

RUN mkdir -p /var/lib/huddle && chown node:node /var/lib/huddle

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000
ENV DATABASE_PATH=/var/lib/huddle/huddle.sqlite

USER node

EXPOSE 4000

CMD ["npm", "run", "start", "--workspace=@huddle/api"]
