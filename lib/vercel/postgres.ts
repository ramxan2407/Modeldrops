import { supabaseCa } from "./tls.mjs";
import { Pool, types } from "pg";

export type QueryResult = {
  rows: Record<string, unknown>[];
  rowCount?: number | null;
  affectedRows?: number;
};
export interface SqlConnection {
  query(sql: string, values?: unknown[]): Promise<QueryResult>;
}
export interface SqlDriver {
  transaction<T>(fn: (db: SqlConnection) => Promise<T>): Promise<T>;
}

// Convert the application's parameterized SQLite subset; never interpolate values.
export function postgresSql(input: string) {
  let index = 0;
  let sql = input.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\?/g, (token) =>
    token === "?" ? `$${++index}` : token,
  );
  if (/^\s*INSERT OR IGNORE\b/i.test(sql)) {
    sql =
      sql.replace(/INSERT OR IGNORE/i, "INSERT").replace(/;\s*$/, "") +
      " ON CONFLICT DO NOTHING";
  }
  return sql;
}
class Statement {
  constructor(
    readonly owner: PostgresDatabase,
    readonly sql: string,
    readonly values: unknown[] = [],
  ) {}
  bind(...values: unknown[]) {
    return new Statement(this.owner, this.sql, values);
  }
  async first<T>(column?: string): Promise<T | null> {
    const result = await this.owner.execute([this]);
    const row = result[0].results[0];
    return (row ? (column ? row[column] : row) : null) as T | null;
  }
  async all<T>() {
    return (await this.owner.execute([this]))[0] as {
      results: T[];
      success: boolean;
      meta: { changes: number };
    };
  }
  async run() {
    return (await this.owner.execute([this]))[0];
  }
}
export class PostgresDatabase {
  constructor(private driver: SqlDriver) {}
  prepare(sql: string) {
    return new Statement(this, sql);
  }
  async batch(statements: Statement[]) {
    return this.execute(statements);
  }
  async execute(statements: Statement[]) {
    if (statements.some((s) => s.owner !== this))
      throw new Error("Foreign database statement");
    return this.driver.transaction(async (tx) => {
      // D1 serializes writers. Preserve that invariant across serverless instances,
      // including aggregate ledger inserts and conditional multi-statement updates.
      if (statements.some((s) => !/^\s*SELECT\b/i.test(s.sql)))
        await tx.query("SELECT pg_advisory_xact_lock(781942631)");
      const result = [];
      for (const s of statements) {
        const r = await tx.query(postgresSql(s.sql), s.values);
        result.push({
          results: r.rows,
          success: true,
          meta: { changes: r.rowCount ?? r.affectedRows ?? 0 },
        });
      }
      return result;
    });
  }
}
export function createPostgresDatabase(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: true, ca: supabaseCa },
    types: {
      getTypeParser(oid: number, format?: "text" | "binary") {
        if (oid === 20 || oid === 1700)
          return (value: string) => {
            const number = Number(value);
            if (!Number.isSafeInteger(number))
              throw new Error("Database integer exceeds safe range");
            return number;
          };
        return types.getTypeParser(oid, format);
      },
    },
  });
  return new PostgresDatabase({
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL search_path TO model_drops");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  });
}
