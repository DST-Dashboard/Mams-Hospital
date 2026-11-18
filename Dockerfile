FROM node:22-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "npm run db:migrate && npm run db:bootstrap && npx next start -p ${PORT}"]
