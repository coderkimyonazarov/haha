import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/app.ts'],
  format: ['cjs'],
  target: 'node18',
  clean: true,
  sourcemap: true,
  // Let Vercel and standard node resolve node_modules automatically
  external: [
    'express', 'cors', 'helmet', 'better-sqlite3', 'dotenv', 'postgres', 
    'drizzle-orm', 'argon2', 'zod', 'jsonwebtoken', 'express-rate-limit'
  ]
});
