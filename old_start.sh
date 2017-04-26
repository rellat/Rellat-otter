#!/bin/sh

google-chrome --headless --disable-gpu --remote-debugging-port=9222
node --inspect=9222 index.js