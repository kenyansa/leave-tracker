#!/usr/bin/env bash
set -euo pipefail

API=${API:-http://localhost:3000}

register() {
  curl -fsS -X POST "$API/auth/register" -H 'Content-Type: application/json' \
    -d "{\"name\":\"$1\",\"email\":\"$2\",\"password\":\"password123\"}" >/dev/null || true
}

register Ann ann@demo.com
register Bob bob@demo.com

docker compose exec -T db psql -U leave -d leave_tracker <<'SQL'
UPDATE users SET role = 'manager' WHERE email = 'ann@demo.com';
UPDATE users SET "managerId" = (SELECT id FROM users WHERE email = 'ann@demo.com') WHERE email = 'bob@demo.com';
SQL
