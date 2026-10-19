import type { SchemaOptions } from 'mongoose';

import { newId } from '../utils/id.js';

/**
 * `_id` definition for every collection: random, prefixed string IDs (G-16).
 *
 *   const ProjectSchema = new Schema({ _id: idField('prj'), name: String }, baseSchemaOptions);
 */
export function idField(prefix: string) {
  return { type: String, default: () => newId(prefix) } as const;
}

interface JsonRecord {
  _id?: unknown;
  id?: unknown;
  __v?: unknown;
  [key: string]: unknown;
}

/**
 * Shared schema options:
 * - createdAt / updatedAt on every record (stored in UTC, G-19)
 * - no Mongoose __v; editable records use `rev` instead (revision plugin, G-10)
 * - JSON output exposes `id` instead of `_id`
 *
 * API responses should still go through each module's mapper, so internal fields
 * (hashes, storage keys) are never sent by accident.
 */
export const baseSchemaOptions = {
  timestamps: true,
  versionKey: false,
  id: false,
  toJSON: {
    virtuals: false,
    transform: (_doc: unknown, ret: JsonRecord) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
} satisfies SchemaOptions;
