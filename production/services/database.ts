import { Pool, type PoolClient } from "pg";
export interface Sql {
  query<T extends Record<string, any> = Record<string, any>>(
    sql: string,
    values?: any[],
  ): Promise<{ rows: T[] }>;
}
export interface Database extends Sql {
  transaction<T>(callback: (tx: Sql) => Promise<T>): Promise<T>;
}
export class PostgresDatabase implements Database {
  private pool: Pool;
  constructor(url: string) {
    if (!url) throw new Error("DATABASE_URL is required");
    this.pool = new Pool({
      connectionString: url,
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
  }
  async query<T extends Record<string, any> = Record<string, any>>(
    sql: string,
    values?: any[],
  ) {
    const result = await this.pool.query<T>(sql, values);
    return { rows: result.rows };
  }
  async transaction<T>(callback: (tx: Sql) => Promise<T>) {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const value = await callback(c as unknown as Sql);
      await c.query("COMMIT");
      return value;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  close() {
    return this.pool.end();
  }
}
