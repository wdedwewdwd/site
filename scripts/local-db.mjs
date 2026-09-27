/**
 * Runs a real PostgreSQL server for local development (no install, no admin rights):
 * data lives in ./.localdb and the server listens on localhost only.
 * Keep this process running while the site runs; Ctrl+C stops the database cleanly.
 *
 *   npm run db:local
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const url = new URL(process.env.DATABASE_URL ?? "");
const port = Number(url.port || 5433);
const database = url.pathname.slice(1) || "arizon";
const dataDir = path.resolve(".localdb", "data");

const portInUse = () =>
  new Promise((resolve) => {
    const s = net.connect({ port, host: "127.0.0.1" }, () => (s.destroy(), resolve(true)));
    s.on("error", () => resolve(false));
  });

if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
  console.error("DATABASE_URL does not point at localhost; refusing to start a local database.");
  process.exit(1);
}
if (await portInUse()) {
  console.log(`Local database already running on port ${port}.`);
  process.exit(0);
}

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  port,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  authMethod: "scram-sha-256",
  persistent: true,
  // UTF-8 is required for Persian text; without it Windows defaults to WIN1252.
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
  onLog: () => {},
});

if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
  console.log("Creating local database cluster (first run)...");
  await pg.initialise();
}
await pg.start();
await pg.createDatabase(database).catch(() => {}); // already exists
console.log(`Local PostgreSQL running on 127.0.0.1:${port} (database "${database}"). Keep this window open.`);

const stop = async () => {
  await pg.stop().catch(() => {});
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
