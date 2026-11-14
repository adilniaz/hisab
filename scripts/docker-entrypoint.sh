#!/bin/sh
set -e

: "${INFISICAL_CLIENT_ID:?INFISICAL_CLIENT_ID must be set}"
: "${INFISICAL_CLIENT_SECRET:?INFISICAL_CLIENT_SECRET must be set}"
INFISICAL_ENV="${INFISICAL_ENV:-dev}"

# Extract workspaceId from .infisical.json (safe — no secrets in this file)
WORKSPACE_ID=$(grep '"workspaceId"' .infisical.json | cut -d'"' -f4)

echo "Authenticating with Infisical ($INFISICAL_ENV environment)..."
export INFISICAL_TOKEN=$(infisical login \
  --method=universal-auth \
  --client-id="$INFISICAL_CLIENT_ID" \
  --client-secret="$INFISICAL_CLIENT_SECRET" \
  --silent --plain)

echo "Exporting secrets from Infisical..."
eval "$(infisical export \
  --env="$INFISICAL_ENV" \
  --path=/ \
  --projectId="$WORKSPACE_ID" \
  --format=dotenv-export)"

# Validate required secrets
if [ -z "$AUTH_SECRET" ] || [ "$AUTH_SECRET" = "change-me-in-production-must-be-32-bytes" ]; then
  echo "ERROR: AUTH_SECRET is not set or is using the default placeholder."
  echo "Generate a real secret: openssl rand -base64 32"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set in Infisical."
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

# Dev/staging environments seed the admin user automatically; prod stays a
# manual post-deploy step (npx tsx prisma/seed.ts) so a redeploy never
# silently resets admin credentials.
if [ "$INFISICAL_ENV" != "prod" ]; then
  echo "Seeding database..."
  npm run db:seed
fi

# Start the server
echo "Starting application..."
exec "$@"
