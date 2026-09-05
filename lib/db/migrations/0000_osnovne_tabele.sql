-- Основне табеле. Постојале су и пре увођења фолдера са миграцијама (правио их
-- је `drizzle-kit push`), па је све писано тако да прође и на бази у којој већ
-- стоје.

CREATE TABLE IF NOT EXISTS quiz_users (
  id serial PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  password_plain text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'student',
  active boolean NOT NULL DEFAULT true,
  never_expires boolean NOT NULL DEFAULT true,
  quiz_once boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES quiz_users (id) ON DELETE CASCADE,
  score integer NOT NULL,
  total integer NOT NULL,
  percentage integer NOT NULL,
  passed boolean NOT NULL,
  answers jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
