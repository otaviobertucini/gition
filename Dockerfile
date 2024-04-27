FROM node:20

COPY ./package.json ./
COPY ./yarn.lock ./
RUN yarn
COPY . .
RUN yarn build

ENTRYPOINT ["node", "dist/index.js"]