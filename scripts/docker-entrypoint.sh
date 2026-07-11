#!/bin/sh
set -e

# Validate required secrets
if [ -z "$AUTH_SECRET" ] || [ "$AUTH_SECRET" = "change-me-in-production-must-be-32-bytes" ]; then
  echo "ERROR: AUTH_SECRET is not set or is using the default placeholder."
  echo "Generate a real secret: openssl rand -base64 32"
  exit 1
fi

# Run database migrations (with retries)
echo "Running database migrations..."
for i in $(seq 1 5); do
  if npx prisma migrate deploy; then
    echo "Migrations completed."
    break
  fi
  if [ $i -eq 5 ]; then
    echo "Migration failed after 5 attempts. Exiting."
    exit 1
  fi
  echo "Migration attempt $i failed. Retrying in 3 seconds..."
  sleep 3
done

# Start the server
echo "Starting application..."
exec "$@"
