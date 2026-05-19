#!/bin/bash

echo ""
echo "============================================================"
echo "  PARSHWA CAPITAL - Bill of Exchange Document Generator"
echo "============================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is NOT installed on this computer!"
    echo ""
    echo "  Please install Node.js:"
    echo ""
    echo "  Mac:   https://nodejs.org  (click the big green LTS button)"
    echo "         OR run: brew install node"
    echo ""
    echo "  Linux: sudo apt install nodejs npm   (Ubuntu/Debian)"
    echo "         sudo dnf install nodejs       (Fedora)"
    echo ""
    echo "  After installing, run this file again."
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

echo "[OK] Node.js $(node --version) found."

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
    echo "[INFO] First time setup - installing packages..."
    echo "       (this only happens once, takes ~30 seconds)"
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "[ERROR] Failed to install packages. Check your internet connection."
        read -p "Press Enter to close..."
        exit 1
    fi
    echo ""
    echo "[OK] Packages installed!"
fi

echo ""
echo "============================================================"
echo "  Starting server..."
echo "  The app will open in your browser automatically."
echo "  Keep this window OPEN while using the app."
echo "  Press Ctrl+C to STOP the app."
echo "============================================================"
echo ""

# Open browser after 2 seconds (works on Mac and Linux)
(sleep 2 && \
  if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000"      # Linux
  elif command -v open &> /dev/null; then
    open "http://localhost:3000"          # Mac
  fi
) &

# Start the server
node server.js

echo ""
echo "[INFO] Server stopped."
