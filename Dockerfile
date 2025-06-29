FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

ENV TZ=Europe/Istanbul

EXPOSE 3000

CMD ["npm", "start"]