#!/bin/bash
# Post.Ink – one-time setup then run (MacBook)
set -e
cd "$(dirname "$0")"

echo "Checking Node.js..."
if ! command -v node &>/dev/null; then
  echo "Node.js not found. Install it with: brew install node"
  echo "Or download from https://nodejs.org"
  exit 1
fi
node -v
npm -v

echo ""
echo "Installing dependencies..."
npm install
cd backend
npm install
npx prisma generate
if [ ! -f prisma/dev.db ]; then
  npx prisma migrate dev --name init
else
  npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init
fi
cd ..
cd frontend
npm install
cd ..

echo ""
echo "Starting app and opening browser..."
npm run dev:open
