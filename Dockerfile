FROM node:alpine

COPY ./package.json ./
COPY ./yarn.lock ./
RUN yarn
COPY . .
RUN yarn build

ENTRYPOINT ["node", "./dist/index.js"]