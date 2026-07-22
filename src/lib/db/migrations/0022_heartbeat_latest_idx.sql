-- A-5 (audit go-live): indice composito per la query "latest heartbeat" di recordHeartbeat
-- (WHERE enrollment_id=? AND slide_id=? ORDER BY ts DESC LIMIT 1). Toglie la scansione+ordinamento
-- di migliaia di righe ad ogni ping (collo di bottiglia #1 sotto carico). Additivo, nessun dato
-- toccato. Scritto a mano (gli snapshot drizzle sono fermi a 0011: come 0016-0021).
CREATE INDEX IF NOT EXISTS "heartbeat_latest_idx" ON "heartbeat" USING btree ("enrollment_id","slide_id","ts" DESC);
