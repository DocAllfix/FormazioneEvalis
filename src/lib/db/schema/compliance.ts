// Cluster C — Compliance, APPEND-ONLY (ARCHITETTURA.md §3) [BUILD]
// activity_log (verb, object, payload, prev_hash, hash) — scrittura via ruolo
//   SQL solo-INSERT (REVOKE UPDATE/DELETE) + trigger anti-modifica.
// heartbeat (enrollment_id, lesson_id, position, focus, ts).
// certificate (status ready_for_review|approved|issued, verify_uuid, approved_by?).
//
// ⚠️ CLAUDE.md: questo schema non si tocca "di striscio". Qualsiasi modifica qui
// va segnalata esplicitamente prima di procedere. Definizioni allo Step 1/6.

export {};
