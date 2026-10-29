"use strict";

const { refreshMembershipOrder } = require('./membership');

// Provider calls are read-only order queries / acknowledgement of already
// durable grants. This worker never creates an order or starts a payment.
function createMembershipReconciler({ getDb, providerRegistry = {}, refresh = refreshMembershipOrder, clock = Date.now } = {}) {
  let running = false;
  let timer = null;
  let stopped = false;
  async function runOnce() {
    if (running || stopped) return { skipped: true };
    const providers = Object.entries(providerRegistry).filter(([, provider]) => provider?.readiness?.().ready === true).map(([id]) => id);
    if (!providers.length) return { skipped: true };
    running = true;
    let attempted = 0, confirmed = 0;
    const start = Number(clock());
    try {
      const db = getDb();
      const rows = db.prepare(`SELECT id,user_id,provider FROM membership_orders
        WHERE (status IN ('created','pending','paid','failed') OR (status='fulfilled' AND provider_delivered_at IS NULL))
          AND julianday(created_at)>=julianday(?)-7
        ORDER BY COALESCE(last_reconciled_at,created_at),id LIMIT 10`).all(new Date(start).toISOString());
      for (const row of rows) {
        if (stopped || Number(clock()) - start > 45_000) break;
        if (!providers.includes(row.provider)) continue;
        db.prepare('UPDATE membership_orders SET last_reconciled_at=? WHERE id=?').run(new Date(Number(clock())).toISOString(), row.id);
        attempted++;
        try {
          await refresh({ db, userId: `ielts:${row.user_id}`, orderId: row.id, providerRegistry });
          confirmed++;
        } catch { /* A bounded next pass resumes; never log provider bodies or identity. */ }
      }
      return { attempted, confirmed };
    } finally { running = false; }
  }
  function start() {
    if (timer || stopped || !Object.keys(providerRegistry).length) return;
    timer = setInterval(() => { void runOnce().catch(() => {}); }, 5 * 60 * 1000);
    timer.unref?.();
  }
  function stop() { stopped = true; clearInterval(timer); timer = null; }
  return Object.freeze({ runOnce, start, stop });
}

module.exports = { createMembershipReconciler };
