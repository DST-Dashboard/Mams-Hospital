# One image, one process, no external services. SQLite lives on the /data volume.
FROM node:22-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=3000 DB_PATH=/data/ohtms.db
VOLUME /data
EXPOSE 3000
# db:seed is a no-op when /data/ohtms.db already exists, so restarts keep alert acknowledgements and edits.
CMD ["sh", "-c", "npm run db:seed && npx next start -p ${PORT}"]
