FROM node:20-slim

# Set working directory
WORKDIR /usr/src/app

# Copy root package.json and install dependencies
COPY package*.json ./
# Ignore scripts to prevent postinstall from failing before modules are copied
RUN npm install --ignore-scripts

# Copy all files
COPY . .

# Run postinstall manually now that the modules folder exists
RUN npm run postinstall

# Create directory for SQLite databases
RUN mkdir -p data

# Run the bot
CMD ["npm", "start"]
