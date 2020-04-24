FROM node:12-alpine AS builder
WORKDIR /app
COPY package* ./
RUN npm install
COPY src/ ./src/
COPY tsconfig* ./
RUN npm run build

FROM node:12-alpine
WORKDIR /app
COPY package.json package.json
RUN npm install --only=prod
COPY --from=builder /app/build ./build
RUN chmod +x ./build/bin/cli.js
