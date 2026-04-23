from __future__ import annotations

import hashlib
import os
import uuid
from pathlib import Path

import psycopg


ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"
MIGRATION_NAME = "20260423150000_init"
MIGRATION_FILE = ROOT / "prisma" / "migrations" / MIGRATION_NAME / "migration.sql"


def load_database_url() -> str:
    if "DATABASE_URL" in os.environ:
        return os.environ["DATABASE_URL"]

    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() == "DATABASE_URL":
            return value.strip().strip('"').strip("'")

    raise RuntimeError("DATABASE_URL not found in environment or .env")


def main() -> None:
    database_url = load_database_url()
    migration_sql = MIGRATION_FILE.read_text()
    checksum = hashlib.sha256(migration_sql.encode("utf-8")).hexdigest()

    with psycopg.connect(database_url, autocommit=False) as conn:
        with conn.cursor() as cur:
            cur.execute(
            """
            CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
              "id" TEXT PRIMARY KEY,
              "checksum" TEXT NOT NULL,
              "finished_at" TIMESTAMPTZ,
              "migration_name" TEXT NOT NULL,
              "logs" TEXT,
              "rolled_back_at" TIMESTAMPTZ,
              "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              "applied_steps_count" INTEGER NOT NULL DEFAULT 0
            )
            """
            )
            cur.execute(
                'SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = %s',
                (MIGRATION_NAME,),
            )
            if cur.fetchone():
                conn.commit()
                print(f"Migration {MIGRATION_NAME} is already recorded; skipping.")
                return

            cur.execute(migration_sql)
            cur.execute(
                """
                INSERT INTO "_prisma_migrations"
                  ("id", "checksum", "finished_at", "migration_name", "logs", "started_at", "applied_steps_count")
                VALUES
                  (%s, %s, NOW(), %s, %s, NOW(), %s)
                """,
                (str(uuid.uuid4()), checksum, MIGRATION_NAME, "", 1),
            )
            conn.commit()
            print(f"Applied migration {MIGRATION_NAME}.")


if __name__ == "__main__":
    main()
