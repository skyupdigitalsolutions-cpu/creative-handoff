import type { Aggregate, MongooseQueryMiddleware, Query, Schema } from 'mongoose';

/**
 * Tenant isolation (G-16), enforced at the data layer.
 *
 * - Adds a required, immutable, indexed `workspaceId` to the schema.
 * - Every query on the model MUST filter by `workspaceId`; otherwise it throws before
 *   touching the database. A forgotten filter fails loudly in tests instead of leaking data.
 * - Aggregations must start with a `$match` on `workspaceId`.
 *
 * Platform-admin and system jobs that legitimately read across workspaces opt out explicitly:
 *   Model.find(filter).setOptions({ skipTenantCheck: true })
 *   Model.aggregate(pipeline).option({ skipTenantCheck: true })
 */

export class TenantFilterMissingError extends Error {
  constructor(model: string, operation: string) {
    super(
      `Tenant isolation: ${model}.${operation}() was called without a workspaceId filter. ` +
        'Add workspaceId to the filter, or pass { skipTenantCheck: true } for platform/system jobs.',
    );
    this.name = 'TenantFilterMissingError';
  }
}

const QUERY_OPERATIONS: MongooseQueryMiddleware[] = [
  'countDocuments',
  'deleteMany',
  'deleteOne',
  'distinct',
  'find',
  'findOne',
  'findOneAndDelete',
  'findOneAndReplace',
  'findOneAndUpdate',
  'replaceOne',
  'updateMany',
  'updateOne',
];

function hasWorkspaceFilter(filter: Record<string, unknown> | null | undefined): boolean {
  if (!filter) return false;
  const value = filter.workspaceId;
  return value !== undefined && value !== null && value !== '';
}

export interface TenantPluginOptions {
  /** Index workspaceId on its own. Turn off when a compound index starting with workspaceId exists. */
  index?: boolean;
}

export function tenantPlugin(schema: Schema, options: TenantPluginOptions = {}): void {
  schema.add({
    workspaceId: { type: String, required: true, immutable: true, index: options.index ?? true },
  });

  schema.pre(QUERY_OPERATIONS, { document: false, query: true }, function (this: Query<unknown, unknown>) {
    const queryOptions = this.getOptions() as { skipTenantCheck?: boolean };
    if (queryOptions.skipTenantCheck === true) return;
    if (!hasWorkspaceFilter(this.getFilter())) {
      const operation = (this as unknown as { op?: string }).op ?? 'query';
      throw new TenantFilterMissingError(this.model.modelName, operation);
    }
  });

  schema.pre('aggregate', function (this: Aggregate<unknown>) {
    const aggregateOptions = this.options as { skipTenantCheck?: boolean };
    if (aggregateOptions.skipTenantCheck === true) return;
    const firstStage = this.pipeline()[0] as { $match?: Record<string, unknown> } | undefined;
    if (!hasWorkspaceFilter(firstStage?.$match)) {
      const modelName = (this as unknown as { _model?: { modelName?: string } })._model?.modelName ?? 'Model';
      throw new TenantFilterMissingError(modelName, 'aggregate');
    }
  });
}