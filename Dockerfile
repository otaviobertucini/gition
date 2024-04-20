FROM alpine:3.10

COPY ./package.json ./
RUN npm install
COPY . .
RUN npm run build

# Copies your code file from your action repository to the filesystem path `/` of the container
COPY dist /dist

# Code file to execute when the docker container starts up (`entrypoint.sh`)
ENTRYPOINT ["/dist/index.js"]