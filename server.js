// Production entry for the mock API (JSON Server). Used by `npm start` on hosts such as Render or Railway.
import jsonServer from 'json-server';
import { copyFileSync, existsSync } from 'node:fs';

const dbFile = process.env.DB_FILE || 'db.json';
if (!existsSync(dbFile)) copyFileSync('db.seed.json', dbFile);

const server = jsonServer.create();
server.use(jsonServer.defaults({ logger: false })); // includes CORS
server.use(jsonServer.router(dbFile));
server.listen(process.env.PORT || 3001, () => console.log(`API ready on port ${process.env.PORT || 3001}`));