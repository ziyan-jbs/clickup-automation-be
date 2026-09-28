FROM node:20-alpine AS builder

WORKDIR /home/field-sales-be

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /home/field-sales-be

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /home/field-sales-be/dist ./dist

EXPOSE ${PORT}

CMD ["npm", "run", "start:prod"]
