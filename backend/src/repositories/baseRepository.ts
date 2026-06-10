import type { QueryFilter, Model, Document } from 'mongoose';

export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  lean?: boolean;
  includeDeleted?: boolean;
}

export interface IBaseRepository<T> {
  findById(id: string, options?: QueryOptions): Promise<T | null>;
  findByIdIncludingDeleted(id: string): Promise<T | null>;
  findMany(filter: QueryFilter<T>, options?: QueryOptions): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  softDelete(id: string): Promise<void>;
  count(filter: QueryFilter<T>, options?: QueryOptions): Promise<number>;
}

/**
 * Base repository implementing soft-delete and lean queries for all read operations.
 * Standard queries exclude records with non-null `deletedAt` by default.
 */
export class BaseRepository<T extends Document> implements IBaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  /**
   * Builds a filter that excludes soft-deleted records unless includeDeleted is true.
   */
  protected buildSoftDeleteFilter(
    filter: QueryFilter<T>,
    includeDeleted?: boolean
  ): QueryFilter<T> {
    if (includeDeleted) {
      return filter;
    }
    // Compose (AND) the caller's filter with the soft-delete predicate rather
    // than spreading it in. Spreading would overwrite any `$or` the caller
    // already set (e.g. search filters), silently dropping their constraints.
    const softDelete = {
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };
    return { $and: [filter, softDelete] } as QueryFilter<T>;
  }

  /**
   * Find a single record by ID, excluding soft-deleted records by default.
   * Uses .lean() for read-only performance.
   */
  async findById(id: string, options?: QueryOptions): Promise<T | null> {
    const filter = this.buildSoftDeleteFilter(
      { _id: id } as QueryFilter<T>,
      options?.includeDeleted
    );
    const result = await this.model.findOne(filter).lean().exec();
    return result as T | null;
  }

  /**
   * Find a record by ID without soft-delete filtering.
   * Useful for admin access to deleted records.
   */
  async findByIdIncludingDeleted(id: string): Promise<T | null> {
    const result = await this.model.findById(id).lean().exec();
    return result as T | null;
  }

  /**
   * Find multiple records matching a filter with pagination, sorting,
   * and soft-delete exclusion. Uses .lean() for read-only performance.
   */
  async findMany(filter: QueryFilter<T>, options?: QueryOptions): Promise<T[]> {
    const effectiveFilter = this.buildSoftDeleteFilter(
      filter,
      options?.includeDeleted
    );

    let query = this.model.find(effectiveFilter);

    // Apply sorting
    if (options?.sortBy) {
      const sortDirection = options.sortOrder === 'desc' ? -1 : 1;
      query = query.sort({ [options.sortBy]: sortDirection });
    }

    // Apply pagination
    if (options?.page && options?.limit) {
      const skip = (options.page - 1) * options.limit;
      query = query.skip(skip).limit(options.limit);
    } else if (options?.limit) {
      query = query.limit(options.limit);
    }

    const results = await query.lean().exec();
    return results as T[];
  }

  /**
   * Create a new record.
   */
  async create(data: Partial<T>): Promise<T> {
    const document = await this.model.create(data);
    return document.toObject() as T;
  }

  /**
   * Update a record by ID. Returns the updated document or null if not found.
   * Excludes soft-deleted records from the update target.
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const filter = this.buildSoftDeleteFilter(
      { _id: id } as QueryFilter<T>,
      false
    );
    const result = await this.model
      .findOneAndUpdate(filter, { $set: data }, { returnDocument: 'after', runValidators: true })
      .lean()
      .exec();
    return result as T | null;
  }

  /**
   * Soft-delete a record by setting `deletedAt` to the current date.
   * Does not permanently remove the record from the database.
   */
  async softDelete(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, {
      $set: { deletedAt: new Date() },
    }).exec();
  }

  /**
   * Count records matching a filter, excluding soft-deleted records by default.
   */
  async count(filter: QueryFilter<T>, options?: QueryOptions): Promise<number> {
    const effectiveFilter = this.buildSoftDeleteFilter(
      filter,
      options?.includeDeleted
    );
    return this.model.countDocuments(effectiveFilter).exec();
  }
}
