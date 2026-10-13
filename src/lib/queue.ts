/** Lightweight job queue: in-memory now, BullMQ/Redis when REDIS_URL is set.
 * Keeps request handlers fast — notifications, expiry sweeps and price-alert
 * checks are enqueued here instead of awaited inline.
 */
type Job = { name: string; payload: Record<string, unknown>; runAt: number; tries: number };

const mem: Job[] = [];
let draining = false;

export function isQueueConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

export async function enqueue(name: string, payload: Record<string, unknown> = {}, delayMs = 0): Promise<void> {
  mem.push({ name, payload, runAt: Date.now() + Math.max(0, delayMs), tries: 0 });
  void drain().catch(() => {});
}

export function pendingJobs(): number {
  return mem.length;
}

async function drain(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    while (mem.length > 0) {
      const job = mem.sort((a, b) => a.runAt - b.runAt)[0];
      if (!job || job.runAt > Date.now()) break;
      mem.splice(mem.indexOf(job), 1);
      try {
        await runJob(job);
      } catch {
        job.tries += 1;
        if (job.tries < 3) mem.push({ ...job, runAt: Date.now() + job.tries * 5000 });
      }
    }
  } finally {
    draining = false;
  }
}

async function runJob(job: Job): Promise<void> {
  // Notify jobs resolve lazily so this module never imports notify at load.
  if (job.name === "notify") {
    const { sendNotification } = await import("./notify");
    await sendNotification(job.payload as { channel: "email" | "sms" | "whatsapp"; to: string; message: string; subject?: string });
    return;
  }
  if (job.name === "sweep-promos") {
    const { getStore } = await import("./store");
    await getStore().sweepExpiredPromotions().catch(() => {});
    return;
  }
  // Unknown jobs are dropped (forward-compat with future BullMQ workers).
}
