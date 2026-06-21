/**
 * Unit tests for the Feedback Mongoose model.
 *
 * Covers schema validation (rating bounds, integer rating, comment max length,
 * required target fields) and the `toJSON` transform that strips internal
 * fields (`isDeleted`, `__v`).
 *
 * Feature: communication-feedback-and-admin-apis
 * _Requirements: 6.1, 6.2_
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Feedback, {
  RATING_MIN,
  RATING_MAX,
  COMMENT_MAX_LENGTH,
} from './Feedback.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Feedback.deleteMany({});
});

/**
 * Helper: a valid Feedback payload that passes all schema validations.
 * `targetModel` is intentionally omitted because the schema's pre('validate')
 * hook derives it from `targetType`.
 */
function validFeedbackData(overrides: Record<string, unknown> = {}) {
  return {
    authorId: new mongoose.Types.ObjectId(),
    authorModel: 'Student',
    authorRole: 'student',
    targetType: 'teacher',
    targetId: new mongoose.Types.ObjectId(),
    rating: 5,
    comment: 'Very helpful and clear instructor.',
    ...overrides,
  };
}

describe('Feedback model', () => {
  describe('valid documents', () => {
    it('accepts a well-formed feedback document and derives targetModel from targetType', async () => {
      const doc = new Feedback(validFeedbackData());
      await expect(doc.validate()).resolves.toBeUndefined();
      expect(doc.targetModel).toBe('Faculty');
    });

    it('derives targetModel as Course when targetType is course', async () => {
      const doc = new Feedback(validFeedbackData({ targetType: 'course' }));
      await doc.validate();
      expect(doc.targetModel).toBe('Course');
    });

    it.each([RATING_MIN, RATING_MAX, 3])(
      'accepts an in-range integer rating of %i',
      async (rating) => {
        const doc = new Feedback(validFeedbackData({ rating }));
        await expect(doc.validate()).resolves.toBeUndefined();
      }
    );
  });

  describe('rating validation', () => {
    it(`rejects a rating below RATING_MIN (${RATING_MIN})`, async () => {
      const doc = new Feedback(validFeedbackData({ rating: RATING_MIN - 1 }));
      await expect(doc.validate()).rejects.toMatchObject({
        errors: { rating: expect.anything() },
      });
    });

    it(`rejects a rating above RATING_MAX (${RATING_MAX})`, async () => {
      const doc = new Feedback(validFeedbackData({ rating: RATING_MAX + 1 }));
      await expect(doc.validate()).rejects.toMatchObject({
        errors: { rating: expect.anything() },
      });
    });

    it('rejects a non-integer rating', async () => {
      const doc = new Feedback(validFeedbackData({ rating: 3.5 }));
      let error: mongoose.Error.ValidationError | null = null;
      try {
        await doc.validate();
      } catch (err) {
        error = err as mongoose.Error.ValidationError;
      }
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(error!.errors).toHaveProperty('rating');
      expect(error!.errors.rating.message).toBe('Rating must be an integer');
    });

    it('rejects a missing rating', async () => {
      const doc = new Feedback(validFeedbackData({ rating: undefined }));
      await expect(doc.validate()).rejects.toMatchObject({
        errors: { rating: expect.anything() },
      });
    });
  });

  describe('comment validation', () => {
    it(`rejects a comment exceeding COMMENT_MAX_LENGTH (${COMMENT_MAX_LENGTH})`, async () => {
      const doc = new Feedback(
        validFeedbackData({ comment: 'a'.repeat(COMMENT_MAX_LENGTH + 1) })
      );
      await expect(doc.validate()).rejects.toMatchObject({
        errors: { comment: expect.anything() },
      });
    });

    it('accepts a comment exactly at COMMENT_MAX_LENGTH', async () => {
      const doc = new Feedback(
        validFeedbackData({ comment: 'a'.repeat(COMMENT_MAX_LENGTH) })
      );
      await expect(doc.validate()).resolves.toBeUndefined();
    });

    it('rejects a missing comment', async () => {
      const doc = new Feedback(validFeedbackData({ comment: undefined }));
      await expect(doc.validate()).rejects.toMatchObject({
        errors: { comment: expect.anything() },
      });
    });
  });

  describe('required target fields', () => {
    it('rejects a document missing targetType', async () => {
      const doc = new Feedback(validFeedbackData({ targetType: undefined }));
      await expect(doc.validate()).rejects.toMatchObject({
        errors: { targetType: expect.anything() },
      });
    });

    it('rejects a document missing targetId', async () => {
      const doc = new Feedback(validFeedbackData({ targetId: undefined }));
      await expect(doc.validate()).rejects.toMatchObject({
        errors: { targetId: expect.anything() },
      });
    });

    it('rejects an invalid targetType value', async () => {
      const doc = new Feedback(validFeedbackData({ targetType: 'parent' }));
      await expect(doc.validate()).rejects.toMatchObject({
        errors: { targetType: expect.anything() },
      });
    });
  });

  describe('toJSON transform', () => {
    it('strips isDeleted and __v from serialized output while preserving other fields', async () => {
      const doc = await Feedback.create(validFeedbackData());

      // __v exists on the persisted document.
      expect(doc.__v).toBeDefined();

      const json = doc.toJSON() as Record<string, unknown>;

      expect(json).not.toHaveProperty('isDeleted');
      expect(json).not.toHaveProperty('__v');

      // Sanity: meaningful fields survive the transform.
      expect(json).toHaveProperty('rating', 5);
      expect(json).toHaveProperty('comment');
      expect(json).toHaveProperty('targetType', 'teacher');
    });

    it('strips isDeleted even when it is set to true', async () => {
      const doc = await Feedback.create(
        validFeedbackData({ isDeleted: true })
      );
      const json = doc.toJSON() as Record<string, unknown>;
      expect(json).not.toHaveProperty('isDeleted');
    });
  });
});
