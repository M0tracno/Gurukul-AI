/**
 * SocketProvider — Socket.IO connection lifecycle management.
 *
 * Manages a single Socket.IO connection authenticated via the current
 * access token. Handles reconnection with exponential backoff (1s initial,
 * max 30s, max 5 attempts) and exposes connection state, messaging hooks,
 * typing indicator hooks, and real-time event subscription to the app.
 *
 * Requirements: 8.4
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthProvider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'failed';

export interface MessagePayload {
  recipientId: string;
  recipientModel: 'Student' | 'Faculty' | 'Parent';
  content: string;
  conversationId: string;
}

export interface IncomingMessage {
  _id: string;
  senderId: string;
  senderModel: string;
  recipientId: string;
  recipientModel: string;
  content: string;
  conversationId: string;
  createdAt: string;
  deliveryStatus?: string;
}

export interface DeliveryConfirmation {
  messageId: string;
  timestamp: string;
}

export interface DeliveryFailure {
  messageId?: string;
  error: string;
  message: string;
}

export interface TypingEvent {
  userId: string;
  conversationId: string;
}

export interface SyncCompleteEvent {
  userId: string;
  syncedAt: string;
}

export interface SyncErrorEvent {
  error: string;
  message: string;
}

interface SocketContextValue {
  /** The active Socket.IO instance, or null when not connected */
  socket: Socket | null;
  /** Current connection status */
  status: ConnectionStatus;
  /** Manually reconnect (resets backoff) */
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max reconnection attempts before surfacing failure to the UI */
const MAX_RECONNECT_ATTEMPTS = 5;
/** Initial reconnection delay in milliseconds */
const INITIAL_RECONNECT_DELAY = 1000;
/** Maximum reconnection delay in milliseconds */
const MAX_RECONNECT_DELAY = 30000;

// ---------------------------------------------------------------------------
// SocketProvider
// ---------------------------------------------------------------------------

interface SocketProviderProps {
  children: ReactNode;
}

function createSocketConnection(accessToken: string): Socket {
  return io(window.location.origin, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: INITIAL_RECONNECT_DELAY,
    reconnectionDelayMax: MAX_RECONNECT_DELAY,
    randomizationFactor: 0,
    timeout: 10000,
  });
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { accessToken, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

  // Connect when authenticated, disconnect when not
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      // Disconnect existing socket if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketInstance(null);
        setStatus('disconnected');
      }
      return;
    }

    // Create a new socket connection
    setStatus('connecting');

    const socket = createSocketConnection(accessToken);

    socket.on('connect', () => {
      setStatus('connected');
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setStatus('connecting');
    });

    // After all reconnection attempts fail, surface failure to the UI
    socket.io.on('reconnect_failed', () => {
      setStatus('failed');
    });

    socketRef.current = socket;
    setSocketInstance(socket);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketInstance(null);
      setStatus('disconnected');
    };
  }, [isAuthenticated, accessToken]);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocketInstance(null);
    }
    // Trigger re-connection by creating a fresh socket
    if (isAuthenticated && accessToken) {
      setStatus('connecting');
      const socket = createSocketConnection(accessToken);

      socket.on('connect', () => {
        setStatus('connected');
      });

      socket.on('disconnect', () => {
        setStatus('disconnected');
      });

      socket.on('connect_error', () => {
        setStatus('connecting');
      });

      socket.io.on('reconnect_failed', () => {
        setStatus('failed');
      });

      socketRef.current = socket;
      setSocketInstance(socket);
    }
  }, [isAuthenticated, accessToken]);

  const value = useMemo<SocketContextValue>(
    () => ({
      socket: socketInstance,
      status,
      reconnect,
    }),
    [socketInstance, status, reconnect]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

// ---------------------------------------------------------------------------
// Core hook: useSocket
// ---------------------------------------------------------------------------

/**
 * Hook to access the Socket.IO connection and status.
 * Must be used inside a SocketProvider.
 */
export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Hook: useSocketEvent — generic real-time event subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe to a specific Socket.IO event. The callback is called each time
 * the event fires. Automatically cleans up on unmount or when deps change.
 */
export function useSocketEvent<T = unknown>(event: string, handler: (data: T) => void): void {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return;

    const listener = (data: T) => {
      handlerRef.current(data);
    };

    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [socket, event]);
}

// ---------------------------------------------------------------------------
// Hook: useMessaging — send messages and listen for incoming/delivery events
// ---------------------------------------------------------------------------

interface UseMessagingOptions {
  /** Called when a new message arrives in a joined conversation */
  onMessage?: (message: IncomingMessage) => void;
  /** Called when a message is confirmed delivered */
  onDeliveryConfirmation?: (confirmation: DeliveryConfirmation) => void;
  /** Called when message delivery fails */
  onDeliveryFailure?: (failure: DeliveryFailure) => void;
  /** Called when message sync completes after reconnection */
  onSyncComplete?: (data: SyncCompleteEvent) => void;
  /** Called when message sync fails */
  onSyncError?: (data: SyncErrorEvent) => void;
}

interface UseMessagingReturn {
  /** Send a message to a recipient */
  sendMessage: (payload: MessagePayload) => void;
  /** Join a conversation room to receive messages and typing indicators */
  joinConversation: (conversationId: string) => void;
  /** Leave a conversation room */
  leaveConversation: (conversationId: string) => void;
  /** Request delivery of messages missed during disconnection */
  syncMessages: (lastMessageTimestamp: Date | string) => void;
}

/**
 * Hook for real-time messaging capabilities. Provides methods to send messages,
 * join/leave conversations, and sync missed messages. Subscribes to incoming
 * message events, delivery confirmations, and failures.
 */
export function useMessaging(options: UseMessagingOptions = {}): UseMessagingReturn {
  const { socket } = useSocket();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Subscribe to messaging events
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg: IncomingMessage) => {
      optionsRef.current.onMessage?.(msg);
    };
    const onDelivered = (data: DeliveryConfirmation) => {
      optionsRef.current.onDeliveryConfirmation?.(data);
    };
    const onFailed = (data: DeliveryFailure) => {
      optionsRef.current.onDeliveryFailure?.(data);
    };
    const onSyncComplete = (data: SyncCompleteEvent) => {
      optionsRef.current.onSyncComplete?.(data);
    };
    const onSyncError = (data: SyncErrorEvent) => {
      optionsRef.current.onSyncError?.(data);
    };

    socket.on('new_message', onNewMessage);
    socket.on('message_delivered', onDelivered);
    socket.on('message_delivery_failed', onFailed);
    socket.on('sync_complete', onSyncComplete);
    socket.on('sync_error', onSyncError);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('message_delivered', onDelivered);
      socket.off('message_delivery_failed', onFailed);
      socket.off('sync_complete', onSyncComplete);
      socket.off('sync_error', onSyncError);
    };
  }, [socket]);

  const sendMessage = useCallback(
    (payload: MessagePayload) => {
      if (!socket) return;
      socket.emit('send_message', payload);
    },
    [socket]
  );

  const joinConversation = useCallback(
    (conversationId: string) => {
      if (!socket) return;
      socket.emit('join_conversation', conversationId);
    },
    [socket]
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      if (!socket) return;
      socket.emit('leave_conversation', conversationId);
    },
    [socket]
  );

  const syncMessages = useCallback(
    (lastMessageTimestamp: Date | string) => {
      if (!socket) return;
      const ts =
        lastMessageTimestamp instanceof Date
          ? lastMessageTimestamp.toISOString()
          : lastMessageTimestamp;
      socket.emit('sync_messages', { lastMessageTimestamp: ts });
    },
    [socket]
  );

  return { sendMessage, joinConversation, leaveConversation, syncMessages };
}

// ---------------------------------------------------------------------------
// Hook: useTypingIndicator — manage typing state with rate limiting
// ---------------------------------------------------------------------------

interface UseTypingIndicatorOptions {
  /** The conversation to send/receive typing events for */
  conversationId: string;
  /** Called when another user starts typing */
  onUserTyping?: (data: TypingEvent) => void;
  /** Called when another user stops typing */
  onUserStoppedTyping?: (data: TypingEvent) => void;
}

interface UseTypingIndicatorReturn {
  /** Call when the local user starts typing */
  startTyping: () => void;
  /** Call when the local user stops typing (e.g., blur, submit) */
  stopTyping: () => void;
}

/**
 * Hook for sending and receiving typing indicators within a conversation.
 * The server enforces rate limiting (max once per 3s per user) and auto-emits
 * a stopped-typing event after 5s of inactivity.
 */
export function useTypingIndicator(options: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const { socket } = useSocket();
  const { conversationId, onUserTyping, onUserStoppedTyping } = options;
  const callbacksRef = useRef({ onUserTyping, onUserStoppedTyping });
  callbacksRef.current = { onUserTyping, onUserStoppedTyping };

  // Subscribe to typing events for the conversation
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleTyping = (data: TypingEvent) => {
      if (data.conversationId === conversationId) {
        callbacksRef.current.onUserTyping?.(data);
      }
    };

    const handleStoppedTyping = (data: TypingEvent) => {
      if (data.conversationId === conversationId) {
        callbacksRef.current.onUserStoppedTyping?.(data);
      }
    };

    socket.on('user_typing', handleTyping);
    socket.on('user_stopped_typing', handleStoppedTyping);

    return () => {
      socket.off('user_typing', handleTyping);
      socket.off('user_stopped_typing', handleStoppedTyping);
    };
  }, [socket, conversationId]);

  const startTyping = useCallback(() => {
    if (!socket || !conversationId) return;
    socket.emit('typing_start', { conversationId });
  }, [socket, conversationId]);

  const stopTyping = useCallback(() => {
    if (!socket || !conversationId) return;
    socket.emit('typing_stop', { conversationId });
  }, [socket, conversationId]);

  return { startTyping, stopTyping };
}
