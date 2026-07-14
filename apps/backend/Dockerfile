FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY nx.json tsconfig.base.json ./
COPY apps/backend ./apps/backend
COPY apps/frontend ./apps/frontend
COPY libs ./libs
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "start:backend"]
