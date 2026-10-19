import type { ClientSession } from 'mongoose';
import mongoose from 'mongoose';

/**
 * Runs `work` inside a MongoDB transaction and returns its result.
 *
 * Use it whenever a business change must be saved together with its audit record and
 * outbox record (G-24): either everything is committed or nothing is.
 * MongoDB retries transient transaction errors automatically, so `work` must be safe
 * to run more than once (no emails, HTTP calls or queue jobs inside it — use the outbox).
 *
 * Pass `session` to every query inside: Model.create([doc], { session }), query.session(session).
 */
export async function withTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    let completed = false;
    await session.withTransaction(
      async () => {
        result = await work(session);
        completed = true;
      },
      {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
        readPreference: 'primary',
      },
    );
    if (!completed) throw new Error('Transaction did not complete');
    return result as T;
  } finally {
    await session.endSession();
  }
}
