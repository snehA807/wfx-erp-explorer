-- WFX ERP Explorer — roles.sql
-- Creates the runtime database role used by the deployed backend
-- (backend-spec.md §4). Applied once via the Supabase SQL editor, after
-- schema.sql (backend-spec.md §11).
--
-- Only one role is created here: app_readonly. DATABASE_URL_OWNER (local
-- seed/embedding scripts only, never present in Render) uses Supabase's
-- existing default "postgres" connection string — no role creation needed
-- for it (per review).
--
-- No password is set below: CREATE ROLE intentionally omits one. Set it
-- separately with `ALTER ROLE app_readonly WITH PASSWORD '...'`, run once,
-- uncommitted, in the Supabase SQL editor — then paste the resulting
-- connection string into DATABASE_URL. A password never belongs in a
-- committed file (CLAUDE.md invariant 4).

CREATE ROLE app_readonly WITH LOGIN;

-- Defense in depth (architecture.md §3: "even a guardrail bypass cannot
-- write, because the execution role has no write privileges at the database
-- level"). A freshly created role already has no privileges by default, but
-- these are explicit so the read-only boundary is visible in the schema
-- itself, not just implied by omission.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_readonly;
REVOKE CREATE ON SCHEMA public FROM app_readonly;

GRANT CONNECT ON DATABASE postgres TO app_readonly; -- Supabase's default database name
GRANT USAGE ON SCHEMA public TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;

-- Any table added after this script runs is SELECT-only too, by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_readonly;

-- backend-spec.md §4's two role-level settings.
ALTER ROLE app_readonly SET default_transaction_read_only = on;
ALTER ROLE app_readonly SET statement_timeout = '10s';
