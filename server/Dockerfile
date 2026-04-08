# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev deps if we want to run dev scripts, or just --production if not)
# For this setup, we'll install everything to be safe
RUN npm install

# Copy source code
COPY . .

# Expose port (must match index.js)
EXPOSE 5000

# Start command
CMD ["npm", "start"]
