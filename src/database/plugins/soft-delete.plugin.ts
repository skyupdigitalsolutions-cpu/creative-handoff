import type { Schema } from 'mongoose';

/**
 * Soft delete / Trash (P-20, P-28). A trashed record keeps its data and remembers the state
 * it was in, so Restore can put it back exactly. The purge job removes it after CFG-18.
 *
 * Services decide what "trashed" hides; the plugin only adds the fields and an index.
 * Use `notTrashed` in list filters:  Model.find({ workspaceId, ...notTrashed })
 */
export function softDeletePlugin(schema: Schema): void {
  schema.add({
    trashedAt: { type: Date, default: null },
    trashedBy: { type: String, default: null },
    previousState: { type: String, default: null },
  });
  schema.index({ trashedAt: 1 }, { partialFilterExpression: { trashedAt: { $type: 'date' } } });
}

export const notTrashed = { trashedAt: null } as const;