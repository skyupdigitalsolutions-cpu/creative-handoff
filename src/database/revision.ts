import type { ClientSession, HydratedDocument, Model, QueryFilter, UpdateQuery } from 'mongoose';

import { notFound, revisionConflict } from '../errors/http-errors.js';
import { formatIstDateTime } from '../utils/dates.js';

interface RevisionOptions {
  session?: ClientSession;
  /** Name shown in GEN-05 ("{name} changed this at {time}"). Modules pass the last editor's name. */
  resolveEditorName?: (current: Record<string, unknown>) => Promise<string> | string;
}

/**
 * Applies `update` only if the record's stored rev equals `expectedRev` (G-10).
 * - Match: saves, bumps rev by 1 (revision plugin), returns the updated document.
 * - Record exists with another rev: 409 GEN-05, nothing saved.
 * - Record missing (or in another workspace, because `filter` includes workspaceId): 404 GEN-07.
 */
export async function updateWithRevision<T>(
  model: Model<T>,
  filter: QueryFilter<T>,
  expectedRev: number,
  update: UpdateQuery<T>,
  options: RevisionOptions = {},
): Promise<HydratedDocument<T>> {
  const updated = await model.findOneAndUpdate({ ...filter, rev: expectedRev } as QueryFilter<T>, update, {
    returnDocument: 'after',
    runValidators: true,
    ...(options.session ? { session: options.session } : {}),
  });
  if (updated) return updated;

  const current = (await model
    .findOne(filter)
    .lean()
    .session(options.session ?? null)) as Record<string, unknown> | null;
  if (!current) throw notFound();

  const name = options.resolveEditorName ? await options.resolveEditorName(current) : 'Someone';
  const updatedAt = current.updatedAt instanceof Date ? current.updatedAt : new Date();
  throw revisionConflict({ name, time: formatIstDateTime(updatedAt) });
}
