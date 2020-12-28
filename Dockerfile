FROM node:12-alpine
# Create the service directories
RUN mkdir -p mexico-db-processor/data/downloads mexico-db-processor/data/processed
WORKDIR /usr/mexico-db-processor
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
RUN npm i
# Bundle service files
COPY . .
EXPOSE 8080
CMD npm start