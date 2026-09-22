import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { PostgresDatabase } from "../../lib/vercel/postgres";
import { fixture } from "./lora-fixture";
export async function postgresFixture() {
  const f = fixture();
  const pg = new PGlite({ parsers: { 1700: Number } });
  await pg.exec(
    await readFile(
      new URL("../../migrations/vercel/001_workspace.sql", import.meta.url),
      "utf8",
    ),
  );
  await pg.exec(
    await readFile(
      new URL("../../migrations/vercel/002_higgsfield.sql", import.meta.url),
      "utf8",
    ),
  );
  const db = new PostgresDatabase({
    transaction: (fn) =>
      pg.transaction(async (tx) => {
        await tx.exec("SET LOCAL search_path TO model_drops");
        return fn({
          query: async (sql, values) => {
            const r = await tx.query<Record<string, unknown>>(sql, values);
            return { rows: r.rows, affectedRows: r.affectedRows };
          },
        });
      }),
  });
  for (const name of ["alice", "bob", "admin"])
    await db
      .prepare("INSERT INTO users(id,name,email) VALUES(?,?,?)")
      .bind(name, name, name + "@example.test")
      .run();
  return {
    ...f,
    env: { ...f.env, DB: db as unknown as D1Database },
    close: async () => {
      await pg.close();
      f.sql.close();
    },
  };
}
