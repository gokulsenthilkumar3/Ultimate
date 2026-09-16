FROM node:20-alpine
WORKDIR /app
# Copy root package.json and tsconfig for monorepo structure
COPY package*.json ./
COPY tsconfig.base.json ./
# Copy the specific service directory
COPY services/api-gateway ./services/api-gateway
# Install dependencies
RUN npm install --workspace=services/api-gateway
# Expose the service port
EXPOSE 3000
# Start the service
CMD ["npm", "run", "dev:api-gateway"]