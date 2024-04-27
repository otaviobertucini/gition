# Stage 1: Build the application
FROM node:alpine AS builder

WORKDIR /app

COPY package.json .
COPY package-lock.json .
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Create the production image
FROM node:alpine

WORKDIR /

# Copy built files from the previous stage
COPY --from=builder /app .

ENTRYPOINT ["node", "./dist/index.js"]
