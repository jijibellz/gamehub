#!/bin/bash
# Start script for Render deployment

# Install dependencies
pip install -r requirements.txt

# Start the server with Socket.IO support
# IMPORTANT: Use socket_app instead of app
uvicorn main:socket_app --host 0.0.0.0 --port ${PORT:-8000}
