# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose Vite default port
EXPOSE 5173

# Start command (host 0.0.0.0 is required for Docker)
CMD ["npm", "run", "dev", "--", "--host"]
