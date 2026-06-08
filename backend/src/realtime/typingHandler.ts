import type { Server as SocketIOServer } from 'socket.io';
import type { AuthenticatedSocket } from './socketManager.js';

/**
 * Track last typing broadcast time per user per conversation.
 * Key format: `${userId}:${conversationId}`
 */
const lastTypingBroadcast = new Map<string, number>();

/**
 * Track typing timeout handles for auto-stopped-typing emission.
 * Key format: `${userId}:${conversationId}`
 */
const typingTimeouts = new Map<string, NodeJS.Timeout>();

/** Rate limit: only broadcast typing once per 3 seconds per user per conversation. */
export const TYPING_RATE_LIMIT_MS = 3000;

/** Stopped-typing fires after 5 seconds of inactivity. */
export const TYPING_TIMEOUT_MS = 5000;

/**
 * Set up typing indicator socket event handlers for an authenticated socket.
 *
 * Handles:
 * - `typing_start`: Rate-limited broadcast of `user_typing` to conversation room.
 *   Resets inactivity timeout that will auto-emit `user_stopped_typing`.
 * - `typing_stop`: Immediately broadcasts `user_stopped_typing` and clears state.
 * - `leave_conversation`: Emits `user_stopped_typing` and cleans up.
 * - `disconnect`: Cleans up all typing state for the disconnecting user.
 */
export function setupTypingHandlers(socket: AuthenticatedSocket, io: SocketIOServer): void {
  const userId = socket.user.userId;

  socket.on('typing_start', (data: { conversationId: string }) => {
    const { conversationId } = data;
    if (!conversationId) return;

    const key = `${userId}:${conversationId}`;
    const now = Date.now();
    const lastBroadcast = lastTypingBroadcast.get(key) || 0;

    // Rate limit: only broadcast if 3+ seconds since last broadcast for this user+conversation
    if (now - lastBroadcast >= TYPING_RATE_LIMIT_MS) {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId,
        conversationId,
      });
      lastTypingBroadcast.set(key, now);
    }

    // Reset the stopped-typing inactivity timeout
    const existingTimeout = typingTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    typingTimeouts.set(
      key,
      setTimeout(() => {
        socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
          userId,
          conversationId,
        });
        lastTypingBroadcast.delete(key);
        typingTimeouts.delete(key);
      }, TYPING_TIMEOUT_MS),
    );
  });

  socket.on('typing_stop', (data: { conversationId: string }) => {
    const { conversationId } = data;
    if (!conversationId) return;

    const key = `${userId}:${conversationId}`;

    // Clear the inactivity timeout
    const existingTimeout = typingTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    typingTimeouts.delete(key);
    lastTypingBroadcast.delete(key);

    // Immediately broadcast stopped typing
    socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
      userId,
      conversationId,
    });
  });

  // When user leaves a conversation, emit stopped-typing and clean up
  socket.on('leave_conversation', (conversationId: string) => {
    if (!conversationId) return;

    const key = `${userId}:${conversationId}`;
    const existingTimeout = typingTimeouts.get(key);

    if (existingTimeout) {
      clearTimeout(existingTimeout);
      typingTimeouts.delete(key);
      lastTypingBroadcast.delete(key);

      socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
        userId,
        conversationId,
      });
    }
  });

  // Clean up all typing state for this user on disconnect
  socket.on('disconnect', () => {
    for (const [key, timeout] of typingTimeouts.entries()) {
      if (key.startsWith(`${userId}:`)) {
        clearTimeout(timeout);
        typingTimeouts.delete(key);
        lastTypingBroadcast.delete(key);
      }
    }
  });
}

/**
 * Exported for testing: clear all typing state.
 * This should only be used in test teardown.
 */
export function _clearAllTypingState(): void {
  for (const timeout of typingTimeouts.values()) {
    clearTimeout(timeout);
  }
  typingTimeouts.clear();
  lastTypingBroadcast.clear();
}

/**
 * Exported for testing: get typing broadcast timestamps map.
 */
export function _getLastTypingBroadcast(): Map<string, number> {
  return lastTypingBroadcast;
}

/**
 * Exported for testing: get typing timeouts map.
 */
export function _getTypingTimeouts(): Map<string, NodeJS.Timeout> {
  return typingTimeouts;
}
