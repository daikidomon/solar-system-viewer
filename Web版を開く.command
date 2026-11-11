#!/bin/zsh
# ダブルクリックで Web 版を起動する(Node.js が必要)。終了はこのウインドウで Ctrl+C。
cd "$(dirname "$0")"
( sleep 1; open "http://localhost:5173" ) &
exec node server.mjs
