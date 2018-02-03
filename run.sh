#!/usr/bin/env bash
# Script to load environment variables from a file and start the server
#
# Changelog
#
# Version 1.0
#   Initial release

# Load env
if [ -f .env ]; then
    set -o allexport
    source .env
    set +o allexport
else
    echo "Missing .env file"
    exit 1
fi

# Run server
node src/index.js
