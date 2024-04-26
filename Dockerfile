FROM node:alpine

WORKDIR /home/app

COPY ./package.json ./
RUN npm install
COPY . .
RUN npm run build

ENTRYPOINT ["node", "./dist/index.js"]