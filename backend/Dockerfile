FROM node:22-bookworm

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

RUN npx playwright install --with-deps chromium

COPY . .

ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "server.js"]