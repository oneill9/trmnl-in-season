#!/usr/bin/env bash

set -euo pipefail

readonly PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly PREVIEW_URL="http://localhost:4567"
readonly MAX_READY_ATTEMPTS=240
server_pid=""

cleanup() {
  if [[ -n "$server_pid" ]] && kill -0 "$server_pid" 2>/dev/null; then
    kill "$server_pid"
    wait "$server_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

cd "$PROJECT_ROOT"

if ! command -v bundle >/dev/null 2>&1; then
  echo "Bundler is required. Install Ruby and Bundler, then run this script again." >&2
  exit 1
fi

if ! bundle check >/dev/null 2>&1; then
  echo "Installing locked Ruby dependencies..."
  bundle install
fi

echo "Starting the TRMNL preview server..."
bundle exec trmnlp serve &
server_pid=$!

ready_attempts=0
until curl --silent --fail --output /dev/null "$PREVIEW_URL"; do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    server_status=0
    wait "$server_pid" || server_status=$?
    server_pid=""
    echo "The preview server stopped before it became ready." >&2
    if [[ "$server_status" -eq 0 ]]; then
      exit 1
    fi
    exit "$server_status"
  fi

  ready_attempts=$((ready_attempts + 1))
  if [[ "$ready_attempts" -ge "$MAX_READY_ATTEMPTS" ]]; then
    echo "The preview server did not become ready at $PREVIEW_URL within 60 seconds." >&2
    exit 1
  fi
  sleep 0.25
done

echo "Opening $PREVIEW_URL"
open "$PREVIEW_URL"

wait "$server_pid"
server_pid=""
