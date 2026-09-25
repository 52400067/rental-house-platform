#!/usr/bin/env bash
# Restart dev server vite (dung boi cac check script khi can module moi).
pkill -f "vit[e]" 2>/dev/null || true
sleep 1
setsid nohup npx vite --port 5173 --host 0.0.0.0 > /tmp/trosv-dev.log 2>&1 < /dev/null &
sleep 6
curl -s -o /dev/null -w "dev:%{http_code}\n" --max-time 5 http://localhost:5173/
