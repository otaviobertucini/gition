FROM node:alpine

WORKDIR /github/workspace/

COPY ./package.json ./
COPY ./package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

ENTRYPOINT ["node", "./dist/index.js"]