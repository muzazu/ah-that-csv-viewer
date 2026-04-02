#!/bin/sh
set -eu

./node_modules/.bin/drizzle-kit migrate --config=drizzle.config.ts

exec node .output/server/index.mjs "$@"