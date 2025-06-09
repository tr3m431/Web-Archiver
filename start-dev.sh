#!/bin/bash
echo "Starting Web Archiver in development mode..."

# Get the absolute path of the project root
PROJECT_ROOT="$(pwd)"

# Start backend in background
cd "$PROJECT_ROOT/backend" && npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
cd "$PROJECT_ROOT/frontend" && npm start &
FRONTEND_PID=$!

echo "Application started!"
echo "Backend running on: http://localhost:3001"
echo "Frontend running on: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap 'kill $BACKEND_PID $FRONTEND_PID; exit' INT
wait
