import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { one, run } from './database.ts';

const sessionDays = 30;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, saved: string) {
  const [salt, hash] = saved.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function issueSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000).toISOString();
  run(
    'INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)',
    tokenHash,
    userId,
    expiresAt,
    new Date().toISOString(),
  );
  return { token, expiresAt };
}

export function sessionUserId(token: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const row = one<{ user_id: string; expires_at: string }>(
    'SELECT user_id, expires_at FROM sessions WHERE token_hash = ?',
    tokenHash,
  );
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
    if (row) run('DELETE FROM sessions WHERE token_hash = ?', tokenHash);
    return undefined;
  }
  return row.user_id;
}

export function revokeSession(token: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  run('DELETE FROM sessions WHERE token_hash = ?', tokenHash);
}
