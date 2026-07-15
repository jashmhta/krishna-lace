import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  const connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connStr) {
    if (req.method === "GET") return res.status(200).json(null);
    return res.status(200).json({ ok: false, error: "no-database" });
  }

  let sql;
  try {
    sql = neon(connStr);
  } catch {
    if (req.method === "GET") return res.status(200).json(null);
    return res.status(200).json({ ok: false, error: "connection-failed" });
  }

  try {
    // Ensure table exists (auto-migrate on first request)
    await sql`CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    if (req.method === "GET") {
      const rows = await sql`SELECT data FROM app_state WHERE id = 'main'`;
      return res.status(200).json(rows.length ? rows[0].data : null);
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      await sql`
        INSERT INTO app_state (id, data, updated_at)
        VALUES ('main', ${JSON.stringify(body)}::jsonb, NOW())
        ON CONFLICT (id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("DB error:", err.message);
    if (req.method === "GET") return res.status(200).json(null);
    return res.status(200).json({ ok: false, error: err.message });
  }
}
