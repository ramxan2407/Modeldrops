import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";

class Statement {
  constructor(db, query, values = []) {
    Object.assign(this, { db, query, values });
  }
  bind(...values) {
    return new Statement(this.db, this.query, values);
  }
  async first() {
    return this.db.prepare(this.query).get(...this.values) || null;
  }
  async all() {
    return { results: this.db.prepare(this.query).all(...this.values) };
  }
  async run() {
    return this.runSync();
  }
  runSync() {
    const result = this.db.prepare(this.query).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

export function openLocalDatabase(path) {
  const sql = new DatabaseSync(path);
  sql.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
  sql.exec(
    "CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)",
  );
  for (const file of readdirSync(new URL("../../drizzle/", import.meta.url))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    if (sql.prepare("SELECT name FROM local_migrations WHERE name=?").get(file))
      continue;
    sql.exec("BEGIN");
    try {
      sql.exec(
        readFileSync(new URL("../../drizzle/" + file, import.meta.url), "utf8"),
      );
      sql.prepare("INSERT INTO local_migrations VALUES(?)").run(file);
      sql.exec("COMMIT");
    } catch (error) {
      sql.exec("ROLLBACK");
      throw error;
    }
  }
  return {
    sql,
    DB: {
      prepare: (query) => new Statement(sql, query),
      batch: async (statements) => {
        sql.exec("BEGIN");
        try {
          const results = statements.map((s) => s.runSync());
          sql.exec("COMMIT");
          return results;
        } catch (error) {
          sql.exec("ROLLBACK");
          throw error;
        }
      },
    },
  };
}
