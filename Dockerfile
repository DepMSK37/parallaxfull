FROM node:20-slim

# Set working directory
WORKDIR /usr/src/app

# Copy root package.json and install dependencies
COPY package*.json ./
# This will also trigger the postinstall script to install smeta dependencies
RUN npm install

# Copy all files
COPY . .

# Create directory for SQLite databases
RUN mkdir -p data

# Run the bot
CMD ["npm", "start"]
