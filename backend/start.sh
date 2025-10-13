#!/bin/bash
# Start script for Render deployment

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
npm install

# Start the Python FastAPI server
echo "Starting GameHub FastAPI backend..."
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info &

# Start the Node.js Socket.IO server
echo "Starting Socket.IO server..."
node server.js &

# Wait for both processes
wait
