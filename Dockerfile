FROM node:alpine

WORKDIR /home/app

COPY ./package.json ./
RUN npm install
COPY . .
RUN npm run build

# Copies your code file from your action repository to the filesystem path `/` of the container
COPY ./dist ./dist
COPY ./node_modules ./node_modules

# Code file to execute when the docker container starts up (`entrypoint.sh`)
ENTRYPOINT ["node", "/dist/index.js"]