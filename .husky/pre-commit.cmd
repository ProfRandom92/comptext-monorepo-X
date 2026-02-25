#!/bin/sh
if [ "$LEFTHOOK" = "0" ]; then
    exit 0
fi

if [ -t 1 ]; then
    exec < /dev/tty > /dev/tty 2>&1
fi

if command -v npx > /dev/null 2>&1; then
    npx --no -- lint-staged
fi
