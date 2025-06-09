#!/bin/bash

# Web Archiver Setup Script
# Run this script to automatically set up the development environment

set -e

echo "Setting up Web Archiver..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18.17+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "Node.js version 18.17 or higher is required. Current version: $NODE_VERSION"
    echo "Please update Node.js using nvm or by downloading from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm first."
    exit 1
fi

echo "Node.js and npm found"

# Define the project root directory
PROJECT_ROOT="$(pwd)"

# Backend setup
echo "Setting up backend..."
cd "$PROJECT_ROOT/backend"

# Create package.json
cat > package.json << 'EOF'
{
  "name": "web-archiver-backend",
  "version": "1.0.0",
  "description": "Backend API for Web Archiving Tool",
  "main": "server.js",
  "engines": {
    "node": ">=18.17.0"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "axios": "^1.5.0",
    "cheerio": "^1.0.0-rc.12"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "keywords": [
    "web",
    "archiver",
    "wayback",
    "crawler"
  ],
  "author": "Tremael Arrington",
  "license": "MIT"
}
EOF

# Install backend dependencies
echo "Installing backend dependencies..."
npm install

echo "Backend setup complete"

# Create frontend directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/frontend"

# Frontend setup
echo "Setting up frontend..."
cd "$PROJECT_ROOT/frontend"

# Create React app
npx create-react-app . --template typescript

# Install additional dependencies
echo "Installing frontend dependencies..."
npm install axios lucide-react
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p

# Update Tailwind config
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# Update CSS
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
EOF

# Add proxy to package.json
npm pkg set proxy="http://localhost:3001"

echo "Frontend setup complete"

# Create start scripts
cd "$PROJECT_ROOT"
cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "Starting Web Archiver in development mode..."

# Start backend in background
cd "$(dirname "$0")/backend" && npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
cd "$(dirname "$0")/frontend" && npm start &
FRONTEND_PID=$!

echo "Application started!"
echo "Backend running on: http://localhost:3001"
echo "Frontend running on: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap 'kill $BACKEND_PID $FRONTEND_PID; exit' INT
wait
EOF

chmod +x start-dev.sh

# Create environment files
cat > backend/.env << 'EOF'
PORT=3001
MAX_CRAWL_DEPTH=2
REQUEST_TIMEOUT=10000
MAX_CONCURRENT_REQUESTS=5
EOF

cat > frontend/.env << 'EOF'
REACT_APP_API_URL=http://localhost:3001/api
EOF

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'source start-dev.sh' to start the development servers"
echo "2. Open your browser and navigate to http://localhost:3000"
echo "3. Start archiving websites by entering the URL and clicking 'Archive'"
echo "4. View archived pages in the 'Archives' directory"
echo "5. Stop the servers with Ctrl+C"
