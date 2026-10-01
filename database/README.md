# PlaySphere — Database Guide

## Engine

**PostgreSQL 15 or newer** (local machine only)
Driver used by the application: `pg` (node-postgres) — no ORM, no query builder.

---

## Directory Layout

```
database/
├── schema/
│   ├── 001_initial_schema.sql     ← Base schema
│   └── 002–007_*.sql              ← Additive updates, apply in order
├── seeds/
│   ├── 001_roles_and_development_users.sql  ← Roles, sports, dev accounts
│   ├── 002_grounds_seed.sql       ← Optional local ground fixtures
│   ├── 003_demo_teams_and_tournaments.sql  ← Optional organizer demo data
│   ├── 004_demo_artwork_backfill.sql  ← Fill missing ground images safely
│   ├── 005_demo_players_teams_registrations.sql ← Player accounts and enrolled teams
│   ├── 006_demo_completed_tournaments.sql ← Historical fixtures, scorecards, and player events
│   └── 007_demo_tournament_expansion.sql ← Four-team records and sport statistic catalog
└── migrations/
    ├── 0001_tournament_fixture_engine.sql  ← Fixture metadata and automatic byes
    └── 0002_sport_specific_ground_slots.sql ← Per-sport slot identity
```

| Folder | Purpose |
|---|---|
| `schema/` | Base schema and the ordered additive updates needed by the current app. Apply once to a blank database. |
| `seeds/` | Reference and development data. Apply `001` first; `002` adds grounds; `003` adds tournaments; `004` backfills ground images; `005` adds demo players, team rosters, and approved tournament registrations. |
| `migrations/` | Ordered incremental changes. New changes belong here rather than in the locked base schema. |

---

## Prerequisites

- PostgreSQL 15 or newer installed and running locally.
- `psql` available on your PATH (or use full path to `psql.exe`).
- A PostgreSQL superuser or a user with CREATEDB privileges.

On Windows, `psql.exe` is usually under the `bin` folder for the installed PostgreSQL version, for example:
```
C:\Program Files\PostgreSQL\15\bin\psql.exe
```

Add that directory to your `PATH` for convenience, or invoke `psql` via its full path.

---

## Step 1 — Create the Database

Connect as your PostgreSQL superuser (e.g. `postgres`) and create the database:

```bash
psql -U postgres -c "CREATE DATABASE playsphere;"
```

Or interactively inside `psql`:

```sql
CREATE DATABASE playsphere;
```

---

## Step 2 — Apply the Schema

Run the base schema, then each additive schema update in numeric order. This creates the current tables, types, triggers, functions, and indexes.

```bash
psql -U postgres -d playsphere -f database/schema/001_initial_schema.sql
psql -U postgres -d playsphere -f database/schema/002_casual_games_schema_update.sql
psql -U postgres -d playsphere -f database/schema/003_eligibility_decoupling_update.sql
psql -U postgres -d playsphere -f database/schema/004_community_schema.sql
psql -U postgres -d playsphere -f database/schema/005_tournament_community.sql
psql -U postgres -d playsphere -f database/schema/006_tournament_community_unique.sql
psql -U postgres -d playsphere -f database/schema/007_post_reactions.sql
```

> Apply this sequence only once to a clean database. Some additive updates are
> not idempotent. Put future incremental changes in `database/migrations/`.

Apply the fixture engine migration after the schema updates:

```bash
psql -U postgres -d playsphere -f database/migrations/0001_tournament_fixture_engine.sql
psql -U postgres -d playsphere -f database/migrations/0002_sport_specific_ground_slots.sql
```

---

## Step 3 — Apply the Seed

Run the seed file to insert the four system roles, five initial sports,
and the two preset development accounts.

```bash
psql -U postgres -d playsphere -f database/seeds/001_roles_and_development_users.sql
```

The seed is wrapped in a transaction and uses `ON CONFLICT DO NOTHING`,
so it is safe to run again without duplicating data.

Optional local venue data can be added after the development accounts exist:

```bash
psql -U postgres -d playsphere -f database/seeds/002_grounds_seed.sql
```

To add sample teams and five public demo tournaments, apply:

```bash
psql -U postgres -d playsphere -f database/seeds/003_demo_teams_and_tournaments.sql
```

Alternatively, from `server/`, run `npm run seed:demo`. The script applies the
ground artwork backfill, demo player/team registrations, and five upcoming
demo tournaments with four approved teams each. It also seeds three completed
historical tournaments with four enrolled teams each, six round-robin matches,
scorecards, performance events, player/team statistics, and leaderboards. The
trackable stat catalog covers football, cricket, basketball, volleyball, and
badminton. It refuses to write to a database outside local `playsphere`.

The completed examples are available in
`database/seeds/006_demo_completed_tournaments.sql` and expanded by
`database/seeds/007_demo_tournament_expansion.sql`. Use `npm run seed:demo` to
apply them and rebuild their statistics and leaderboard entries through the
app's normal aggregation services.

To create the enrolled sample teams and player accounts manually, apply:

```bash
psql -U postgres -d playsphere -f database/seeds/005_demo_players_teams_registrations.sql
```

This seed creates 46 local player accounts and ten teams, with two approved
team registrations in each of the five upcoming demo tournaments. The
tournament expansion adds rostered teams and accounts so every upcoming and
historical demo tournament has four entries. All sample players use
`PlayerDev@123`; the accounts are for local development only.

To rebuild booking availability for the next 30 days, run from `server/`:

```bash
npm run refresh:ground-slots
```

This removes unbooked slot inventory before rebuilding it from active ground
and sport availability. Prices use the ground/sport rate, playing surface,
time of day, and weekend demand. Slots tied to bookings stay in place to
preserve booking and payment history. Expired casual games without match
history are removed as part of the refresh.

While the API server is running, its background cleanup service also removes
unbooked slots as soon as their end time passes and casual games when their
scheduled duration ends. It catches up on expired records at server startup.

If the grounds are already in your database, apply the artwork backfill without
rerunning the ground seed:

```bash
psql -U postgres -d playsphere -f database/seeds/004_demo_artwork_backfill.sql
```

The demo seeds expect the organizer development account and sports from seed
`001`. Seed `003` creates organizer-managed teams and tournaments; seed `005`
adds separate player-managed teams and approved registrations. Ground images
and tournament posters are stored under `client/public/images/demo/`; rerun
`node server/scripts/generate_demo_assets.js` to regenerate the SVG placeholders.

---

## Development Preset Accounts

> ⚠️ **These accounts exist for local development only.**  
> Never use these credentials in staging or production.  
> Change or delete them before exposing the service to any network.

| Role | Email | Password |
|---|---|---|
| Organizer | `organizer@playsphere.local` | `OrganizerDev@123` |
| Admin | `admin@playsphere.local` | `AdminDev@123` |

### Why these passwords are safe in source code

- Passwords are **bcrypt-hashed** (cost factor 12) using PostgreSQL's `pgcrypto`
  `crypt()` function **at seed-execution time**.  
  The SQL file contains only plaintext passwords for the seeding step;
  the database never stores plaintext.
- The resulting hash (e.g. `$2a$12$...`) is compatible with `bcryptjs.compare()`
  in the Node.js application.
- These are **clearly labelled development credentials** used exclusively on a
  local machine. No real secrets, no Razorpay keys, no JWT secrets are included.

---

## Required PostgreSQL Extension

The schema file enables the `pgcrypto` extension automatically:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

This provides:
- `gen_random_uuid()` — UUID generation (also built-in since PostgreSQL 13).
- `crypt()` / `gen_salt()` — bcrypt password hashing used in seeds.

If your PostgreSQL user lacks the `CREATE EXTENSION` privilege, run:

```bash
psql -U postgres -d playsphere -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

---

## Verifying the Installation

After running schema + seed, run these quick checks:

```bash
psql -U postgres -d playsphere
```

```sql
-- Table count (expect 46 tables after schema updates 002–007)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Roles (expect 4 rows)
SELECT name FROM roles ORDER BY name;

-- Sports (expect 5 rows)
SELECT name FROM sports ORDER BY name;

-- Dev accounts (expect 2 rows with hashed passwords)
SELECT email, is_active, is_email_verified,
       LEFT(password_hash, 7) AS hash_prefix
FROM users
ORDER BY email;

-- Role assignments (expect 2 rows)
SELECT u.email, r.name AS role
FROM user_roles ur
JOIN users u ON u.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
ORDER BY u.email;
```

---

## Database Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Table | `snake_case`, plural | `team_members` |
| Column | `snake_case` | `created_at` |
| FK column | `<singular_table>_id` | `user_id` |
| Primary key | always `id` (UUID) | `id UUID` |
| Enum type | `snake_case` + `_type` suffix | `tournament_status_type` |
| Index | `idx_<table>_<column(s)>` | `idx_users_email` |
| Partial unique index | `uq_<table>_<description>` | `uq_team_member_active` |
| Trigger | `trg_<table>_updated_at` | `trg_users_updated_at` |

---

## Migration / Seed Strategy

### Schema files (`schema/`)
- Run **once** against a blank database to establish the full baseline.
- File naming: `NNN_<description>.sql` (three-digit zero-padded).
- Never edit an already-applied schema file; write a migration instead.

### Migration files (`migrations/`)
- Each file represents an **incremental, ordered change** (ALTER TABLE, CREATE TABLE, etc.).
- File naming: `NNNN_<description>.sql` (four-digit zero-padded).
- A migration runner will be added in a later phase.
- For now, apply manually with `psql -f`.

### Seed files (`seeds/`)
- Reference data and development accounts.
- Always idempotent (`ON CONFLICT DO NOTHING` or `INSERT … WHERE NOT EXISTS`).
- File naming: `NNN_<description>.sql`.

---

## Connecting from the Application

The application reads connection details from environment variables.
Copy `.env.example` to `.env` and fill in the PostgreSQL section:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_NAME=playsphere
DB_USER=postgres
DB_PASSWORD=your_local_postgres_password
```

The server creates a connection pool via `pg.Pool` in `server/src/config/database.js`.
The application accepts either `DATABASE_URL` or the individual `DB_*` values.

---

## Resetting the Database (Development Only)

To start fresh:

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS playsphere;"
psql -U postgres -c "CREATE DATABASE playsphere;"
psql -U postgres -d playsphere -f database/schema/001_initial_schema.sql
psql -U postgres -d playsphere -f database/schema/002_casual_games_schema_update.sql
psql -U postgres -d playsphere -f database/schema/003_eligibility_decoupling_update.sql
psql -U postgres -d playsphere -f database/schema/004_community_schema.sql
psql -U postgres -d playsphere -f database/schema/005_tournament_community.sql
psql -U postgres -d playsphere -f database/schema/006_tournament_community_unique.sql
psql -U postgres -d playsphere -f database/schema/007_post_reactions.sql
psql -U postgres -d playsphere -f database/migrations/0001_tournament_fixture_engine.sql
psql -U postgres -d playsphere -f database/migrations/0002_sport_specific_ground_slots.sql
psql -U postgres -d playsphere -f database/seeds/001_roles_and_development_users.sql
psql -U postgres -d playsphere -f database/seeds/002_grounds_seed.sql
```
