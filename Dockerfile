FROM node:15.8.0

WORKDIR /app

COPY package.json /app/package.json


RUN npm install

ADD . /app

RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["node", "./dist/app.js"]
