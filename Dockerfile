FROM public.ecr.aws/docker/library/node:18-alpine3.19

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["npm", "start"]
