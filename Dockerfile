FROM node:20

COPY ./package.json ./
COPY ./yarn.lock ./
RUN yarn
COPY . .
RUN yarn build

RUN ["chmod", "+x", "/dist/index.js"]

ENTRYPOINT ["node", "/dist/index.js"]