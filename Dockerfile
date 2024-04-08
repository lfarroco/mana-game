FROM node:latest

WORKDIR /app

COPY app /app

RUN npm install

RUN npm install -g react-scripts

RUN npm install -g typescript

CMD npm run start
