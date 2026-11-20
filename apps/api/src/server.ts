import { app } from './app.ts';
import { databasePath, db } from './database.ts';

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';
const server = app.listen(port, host, () => {
  console.log(`Huddle API listening on http://${host}:${port}`);
  console.log(`SQLite database: ${databasePath}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
