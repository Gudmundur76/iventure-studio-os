FROM node:22-slim
WORKDIR /app
# Copy everything first (patches dir must exist before pnpm install)
COPY . .
RUN npm install -g corepack@latest && corepack pnpm install && corepack pnpm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
