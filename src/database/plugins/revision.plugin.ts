import type { Document, MongooseQueryMiddleware, Query, Schema, UpdateQuery } from 'mongoose';

/**
 * Record revision (G-10). Every editable record carries `rev`, which goes up by 1 on each save.
 * The browser sends back the rev it loaded; `updateWithRevision()` (database/revision.ts)
 * only applies the change if the stored rev still matches, so nobody's edit is silently overwritten.
 *
 * This plugin keeps `rev` moving on every write path:
 * - document.save() on an existing document
 * - updateOne / updateMany / findOneAndUpdate (adds `$inc: { rev: 1 }`)
 */

const UPDATE_OPERATIONS: MongooseQueryMiddleware[] = ['updateOne', 'updateMany', 'findOneAndUpdate'];

export function revisionPlugin(schema: Schema): void {
  schema.add({ rev: { type: Number, default: 0, min: 0 } });

  schema.pre('save', function (this: Document) {
    if (!this.isNew) {
      const current = this.get('rev') as number | undefined;
      this.set('rev', (current ?? 0) + 1);
    }
  });

  schema.pre(UPDATE_OPERATIONS, { document: false, query: true }, function (this: Query<unknown, unknown>) {
    const update = this.getUpdate();
    // Aggregation-pipeline updates are left alone; callers must handle rev themselves.
    if (!update || Array.isArray(update)) return;
    const typed = update as UpdateQuery<{ rev: number }>;
    // Never let a client-supplied rev be written directly.
    if (typed.$set && 'rev' in typed.$set) delete (typed.$set as Record<string, unknown>).rev;
    if ('rev' in typed) delete (typed as Record<string, unknown>).rev;
    typed.$inc = { ...(typed.$inc ?? {}), rev: 1 };
    this.setUpdate(typed);
  });
}