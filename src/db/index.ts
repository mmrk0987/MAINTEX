import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { Pool as PoolType } from 'pg';
import * as schema from './schema.ts';
import fs from 'fs';

const { Pool } = pg;

declare global {
  var _postgresPool: PoolType | undefined;
}

let dbAvailable = true;
let host = process.env.SQL_HOST || '';
if (!host) {
  const possiblePaths = ['/app/cloudsql/ai-studio-7ccedddb', '/app/cloudsql', '/cloudsql'];
  for (const p of possiblePaths) {
    const socketFile = `${p}/.s.PGSQL.5432`;
    const subSocketFile = `${p}/ai-studio-7ccedddb/.s.PGSQL.5432`;
    if (fs.existsSync(subSocketFile)) {
      host = `${p}/ai-studio-7ccedddb`;
      break;
    } else if (fs.existsSync(socketFile)) {
      host = p;
      break;
    } else if (fs.existsSync(p) && p.includes('ai-studio-7ccedddb')) {
      host = p;
      break;
    }
  }
}

if (host.startsWith('/')) {
  const socketFile = `${host}/.s.PGSQL.5432`;
  if (!fs.existsSync(host) || !fs.existsSync(socketFile)) {
    console.warn(`[DB] Cloud SQL Unix socket ${socketFile} not found for instance 'ai-studio-7ccedddb'. Running in resilient fallback mode.`);
    dbAvailable = false;
  } else {
    console.log(`[DB] Cloud SQL Auth Proxy socket connected successfully at ${socketFile}`);
  }
} else if (!host) {
  if (!process.env.SQL_USER && !process.env.PGUSER) {
    dbAvailable = false;
  }
}

export const createPool = () => {
  if (!global._postgresPool && dbAvailable) {
    try {
      global._postgresPool = new Pool({
        host: host || undefined,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : undefined,
        max: 10,
        connectionTimeoutMillis: 5000,
      });

      global._postgresPool.on('error', (err) => {
        console.error('Unexpected error on idle SQL pool client:', err);
      });
    } catch (e) {
      console.warn('PostgreSQL pool creation failed:', e);
      dbAvailable = false;
      return undefined;
    }
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = pool && dbAvailable ? drizzle(pool, { schema }) : (null as any);

export const isDatabaseAvailable = () => Boolean(dbAvailable && db);


