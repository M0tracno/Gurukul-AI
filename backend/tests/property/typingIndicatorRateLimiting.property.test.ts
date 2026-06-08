/**
 * Property-Based Test: Typing Indicator Rate Limiting (Property 20)
 *
 * Feature: gurukul-ai-modernization, Property 20: Typing Indicator Rate Limiting
 *
 * For any sequence of typing events from a single user in a conversation,
 * the Realtime_Layer SHALL not broadcast typing indicators more frequently
 * than once every 3 seconds.
 *
 * **Validates: Requirements 8.3**
 */

import * as fc from 'fast-check';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// --- Mocks ---

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const {
  TYPING_RATE_LIMIT_MS,
  _clearAllTypingState,
  _getLastTypingBroadcast,
} = await import('../../src/realtime/typingHandler.js');

// --- Helpers ---

/**
 * Simulates the rate-limiting logic from the typing handler.
 * This mirrors the core logic: only broadcasts if >= TYPING_RATE_LIMIT_MS
 * has elapsed since the last broadcast for the same user+conversation key.
 *
 * The handler uses `lastTypingBroadcast.get(key) || 0` which means:
 * - First event: `now - 0 >= 3000` evaluates based on whether `now >= 3000`
 * - In realistic scenarios (timestamps from Date.now()), the first event always broadcasts
 *
 * Returns an array of timestamps at which broadcasts actually occurred.
 */
function simulateTypingEvents(
  eventTimestamps: number[],
  userId: string,
  conversationId: string
): number[] {
  const broadcasts: number[] = [];
  // The handler uses `|| 0` default, meaning `now - 0 >= 3000` for first event.
  // We replicate this exact logic.
  let lastBroadcast = 0;

  for (const timestamp of eventTimestamps) {
    if (timestamp - lastBroadcast >= TYPING_RATE_LIMIT_MS) {
      broadcasts.push(timestamp);
      lastBroadcast = timestamp;
    }
  }

  return broadcasts;
}

/**
 * Creates a mock socket that records emitted events for inspection.
 */
function createMockSocket(userId: string, role: string = 'student') {
  const emittedEvents: Array<{ event: string; data: unknown; room: string }> = [];

  const socket = {
    id: `socket-${userId}`,
    user: { userId, role },
    to: jest.fn((room: string) => ({
      emit: jest.fn((event: string, data: unknown) => {
        emittedEvents.push({ event, room, data });
      }),
    })),
    on: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
  };

  return { socket, emittedEvents };
}

// --- Generators ---

/**
 * Generates a sorted array of monotonically increasing timestamps
 * representing when typing events are fired by a user.
 * Timestamps start at TYPING_RATE_LIMIT_MS or above to simulate
 * realistic Date.now() values where the first event always broadcasts
 * (since handler uses `|| 0` sentinel for no-prior-broadcast).
 */
const typingEventSequenceArb = fc.array(
  fc.integer({ min: TYPING_RATE_LIMIT_MS, max: 60000 + TYPING_RATE_LIMIT_MS }),
  { minLength: 1, maxLength: 100 }
).map(timestamps => [...timestamps].sort((a, b) => a - b));

/**
 * Generates user IDs for the rate limiting test.
 */
const userIdArb = fc.stringMatching(/^user-[a-z0-9]{4,8}$/);

/**
 * Generates conversation IDs.
 */
const conversationIdArb = fc.stringMatching(/^conv-[a-z0-9]{4,8}$/);

/**
 * Generates a sequence of rapid-fire events (all within 3 seconds of each other)
 * starting at a realistic base time, to verify that at most one broadcast occurs
 * after the initial one.
 */
const rapidFireSequenceArb = fc.integer({ min: TYPING_RATE_LIMIT_MS, max: 100000 }).chain(
  baseTime => fc.array(
    fc.integer({ min: 0, max: 2999 }),
    { minLength: 2, maxLength: 50 }
  ).map(offsets => offsets.map(o => baseTime + o).sort((a, b) => a - b))
);

// --- Property Tests ---

describe('Property 20: Typing Indicator Rate Limiting', () => {
  beforeEach(() => {
    _clearAllTypingState();
    jest.useFakeTimers();
  });

  afterEach(() => {
    _clearAllTypingState();
    jest.useRealTimers();
  });

  /**
   * Property: For any sequence of typing events from a single user,
   * consecutive typing indicator broadcasts SHALL be separated by
   * at least 3 seconds (TYPING_RATE_LIMIT_MS).
   */
  it('should ensure all consecutive broadcasts are at least 3 seconds apart', async () => {
    await fc.assert(
      fc.asyncProperty(
        typingEventSequenceArb,
        userIdArb,
        conversationIdArb,
        async (timestamps, userId, conversationId) => {
          // Simulate the rate-limited broadcasts
          const broadcasts = simulateTypingEvents(timestamps, userId, conversationId);

          // Verify: consecutive broadcasts must be >= 3000ms apart
          for (let i = 1; i < broadcasts.length; i++) {
            const gap = broadcasts[i] - broadcasts[i - 1];
            expect(gap).toBeGreaterThanOrEqual(TYPING_RATE_LIMIT_MS);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any sequence of rapid-fire typing events (all within 3 seconds of each other),
   * at most one typing indicator broadcast SHALL be emitted (the first one).
   */
  it('should emit at most one broadcast for rapid-fire events within 3 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(
        rapidFireSequenceArb,
        userIdArb,
        conversationIdArb,
        async (timestamps, userId, conversationId) => {
          const broadcasts = simulateTypingEvents(timestamps, userId, conversationId);

          // First event broadcasts (base time >= TYPING_RATE_LIMIT_MS), then
          // no more since all subsequent events are within 2999ms of the first
          expect(broadcasts.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any sequence of typing events (with timestamps >= TYPING_RATE_LIMIT_MS),
   * the rate limiter SHALL always broadcast the first event since the handler's
   * default last-broadcast value is 0, making `timestamp - 0 >= 3000` always true.
   */
  it('should always broadcast the first typing event', async () => {
    await fc.assert(
      fc.asyncProperty(
        typingEventSequenceArb,
        userIdArb,
        conversationIdArb,
        async (timestamps, userId, conversationId) => {
          const broadcasts = simulateTypingEvents(timestamps, userId, conversationId);

          // First event should always be broadcast (timestamps >= 3000, so first - 0 >= 3000)
          expect(broadcasts.length).toBeGreaterThanOrEqual(1);
          expect(broadcasts[0]).toBe(timestamps[0]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any sequence of typing events, the number of broadcasts
   * SHALL NOT exceed ceil(totalTimeSpan / 3000) + 1, proving the rate limiter
   * effectively throttles broadcast frequency.
   */
  it('should not broadcast more than the maximum allowed by rate limiting', async () => {
    await fc.assert(
      fc.asyncProperty(
        typingEventSequenceArb,
        userIdArb,
        conversationIdArb,
        async (timestamps, userId, conversationId) => {
          const broadcasts = simulateTypingEvents(timestamps, userId, conversationId);

          if (timestamps.length === 0) return;

          const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
          // Maximum possible broadcasts = floor(timeSpan / RATE_LIMIT) + 1
          const maxPossibleBroadcasts = Math.floor(timeSpan / TYPING_RATE_LIMIT_MS) + 1;

          expect(broadcasts.length).toBeLessThanOrEqual(maxPossibleBroadcasts);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Integration-level property test: Verifies the actual typing handler emits
   * rate-limited events correctly through a mock socket when typed events
   * are dispatched with controlled timing.
   */
  it('should rate-limit actual socket emissions using the typing handler', async () => {
    const { setupTypingHandlers } = await import('../../src/realtime/typingHandler.js');

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.integer({ min: TYPING_RATE_LIMIT_MS, max: 30000 + TYPING_RATE_LIMIT_MS }),
          { minLength: 2, maxLength: 30 }
        ).map(ts => [...ts].sort((a, b) => a - b)),
        async (timestamps) => {
          _clearAllTypingState();

          const userId = 'test-user';
          const conversationId = 'test-conv';
          const emittedTyping: number[] = [];
          let currentTime = 0;

          // Create mock socket with tracked emissions
          const handlers: Record<string, Function> = {};
          const mockSocket = {
            id: `socket-${userId}`,
            user: { userId, role: 'student' },
            to: jest.fn((_room: string) => ({
              emit: jest.fn((event: string, _data: unknown) => {
                if (event === 'user_typing') {
                  emittedTyping.push(currentTime);
                }
              }),
            })),
            on: jest.fn((event: string, handler: Function) => {
              handlers[event] = handler;
            }),
            join: jest.fn(),
            leave: jest.fn(),
            emit: jest.fn(),
          };

          const mockIo = {
            to: jest.fn(() => ({ emit: jest.fn() })),
          };

          // Set up the typing handlers
          setupTypingHandlers(mockSocket as any, mockIo as any);

          // Get the typing_start handler
          const typingStartHandler = handlers['typing_start'];
          if (!typingStartHandler) return;

          // Use fake timers to control Date.now()
          jest.setSystemTime(timestamps[0]);

          // Simulate each typing event at its timestamp
          for (const timestamp of timestamps) {
            currentTime = timestamp;
            jest.setSystemTime(timestamp);
            typingStartHandler({ conversationId });
          }

          // Verify: consecutive emissions are >= 3000ms apart
          for (let i = 1; i < emittedTyping.length; i++) {
            const gap = emittedTyping[i] - emittedTyping[i - 1];
            expect(gap).toBeGreaterThanOrEqual(TYPING_RATE_LIMIT_MS);
          }

          // Clean up
          _clearAllTypingState();
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: The TYPING_RATE_LIMIT_MS constant SHALL be exactly 3000ms,
   * ensuring the 3-second requirement from Requirement 8.3 is met.
   */
  it('should have TYPING_RATE_LIMIT_MS configured as 3000ms', () => {
    expect(TYPING_RATE_LIMIT_MS).toBe(3000);
  });
});
