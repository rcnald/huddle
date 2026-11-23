import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const defaultPath = fileURLToPath(new URL('../data/huddle.sqlite', import.meta.url));
export const databasePath = resolve(process.env.DATABASE_PATH || defaultPath);
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);

const migrationsDir = new URL('./migrations/', import.meta.url);

/**
 * 001_init.sql é a base (idempotente) e roda sempre.
 * As migrations seguintes (002_..., 003_...) rodam uma única vez e ficam
 * registradas em schema_migrations, preservando os bancos que já existem.
 */
function migrate() {
  db.exec(readFileSync(new URL('001_init.sql', migrationsDir), 'utf8'));
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
  );
  const applied = new Set(
    (db.prepare('SELECT name FROM schema_migrations').all() as { name: string }[]).map(
      (row) => row.name,
    ),
  );
  const pending = readdirSync(migrationsDir)
    .filter((file) => /^\d{3}_.+\.sql$/.test(file) && file !== '001_init.sql')
    .sort()
    .filter((file) => !applied.has(file));
  for (const file of pending) {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(readFileSync(new URL(file, migrationsDir), 'utf8'));
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(
        file,
        new Date().toISOString(),
      );
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    } finally {
      db.exec('PRAGMA foreign_keys = ON');
    }
  }
}

migrate();

export type DbRow = Record<string, unknown>;

export function one<T extends DbRow>(sql: string, ...params: SQLInputValue[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function many<T extends DbRow>(sql: string, ...params: SQLInputValue[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function run(sql: string, ...params: SQLInputValue[]) {
  return db.prepare(sql).run(...params);
}

export function transaction<T>(work: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
