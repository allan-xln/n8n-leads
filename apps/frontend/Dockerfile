FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN npm install

COPY . .

EXPOSE 4173

CMD ["npm", "--workspace", "apps/frontend", "run", "start"]
