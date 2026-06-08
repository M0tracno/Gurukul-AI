/**
 * Integration tests for the message sending user flow.
 *
 * Covers:
 * - Success path: user sends a message, receives delivery confirmation
 * - Error path: message delivery fails, user sees failure notification
 *
 * Validates: Requirements 9.2
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock socket.io-client
const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockDisconnect = vi.fn();
const mockIoOn = vi.fn();

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: mockOn,
    off: mockOff,
    emit: mockEmit,
    disconnect: mockDisconnect,
    connected: true,
    io: {
      on: mockIoOn,
    },
  })),
}));

// Mock sentry
vi.mock('../../config/sentry', () => ({
  setSentryUser: vi.fn(),
  default: { init: vi.fn() },
}));

// Mock env
vi.mock('../../config/env', () => ({
  default: {
    API_URL: 'http://localhost:5000',
    NODE_ENV: 'test',
    DEV: false,
    PROD: false,
    SENTRY_DSN: '',
  },
}));

import { AuthProvider } from '../../providers/AuthProvider';
import {
  SocketProvider,
  useSocket,
  useMessaging,
  type MessagePayload,
  type DeliveryConfirmation,
  type DeliveryFailure,
} from '../../providers/SocketProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

// --- Test component that exercises the messaging flow ---

function MessageComposer() {
  const { status } = useSocket();
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const [deliveredMessages, setDeliveredMessages] = useState<string[]>([]);
  const [failedMessages, setFailedMessages] = useState<string[]>([]);
  const [messageText, setMessageText] = useState('');

  const { sendMessage } = useMessaging({
    onDeliveryConfirmation: (confirmation: DeliveryConfirmation) => {
      setDeliveredMessages((prev) => [...prev, confirmation.messageId]);
    },
    onDeliveryFailure: (failure: DeliveryFailure) => {
      setFailedMessages((prev) => [...prev, failure.error]);
    },
  });

  const handleSend = () => {
    if (!messageText.trim()) return;

    const payload: MessagePayload = {
      recipientId: 'teacher-1',
      recipientModel: 'Faculty',
      content: messageText,
      conversationId: 'conv-123',
    };

    sendMessage(payload);
    setSentMessages((prev) => [...prev, messageText]);
    setMessageText('');
  };

  return (
    <div data-testid="message-composer">
      <div data-testid="connection-status">Status: {status}</div>
      <label htmlFor="message-input">Message</label>
      <input
        id="message-input"
        type="text"
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        placeholder="Type a message..."
      />
      <button onClick={handleSend} disabled={status !== 'connected'}>
        Send
      </button>

      {sentMessages.length > 0 && (
        <div data-testid="sent-messages">
          <h3>Sent</h3>
          {sentMessages.map((msg, i) => (
            <div key={i} data-testid={`sent-msg-${i}`}>
              {msg}
            </div>
          ))}
        </div>
      )}

      {deliveredMessages.length > 0 && (
        <div data-testid="delivered-messages">
          <h3>Delivered</h3>
          {deliveredMessages.map((id, i) => (
            <div key={i} data-testid={`delivered-msg-${i}`}>
              {id}
            </div>
          ))}
        </div>
      )}

      {failedMessages.length > 0 && (
        <div data-testid="failed-messages" role="alert">
          <h3>Failed</h3>
          {failedMessages.map((err, i) => (
            <div key={i} data-testid={`failed-msg-${i}`}>
              {err}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderMessageComposer() {
  const queryClient = createTestQueryClient();

  // Set up authenticated state
  const payload = {
    sub: 'student-1',
    email: 'student@school.edu',
    role: 'student',
    name: 'Arjun',
    exp: Math.floor(Date.now() / 1000) + 900,
  };
  const encodedPayload = btoa(JSON.stringify(payload));
  const mockAccessToken = `header.${encodedPayload}.signature`;

  localStorage.setItem(
    'gurukul-auth-tokens',
    JSON.stringify({
      accessToken: mockAccessToken,
      refreshToken: 'refresh-token',
    }),
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <SocketProvider>
            <MessageComposer />
          </SocketProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Message Sending Integration Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Set up mockOn to capture event handlers and simulate connect
    mockOn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'connect') {
        // Simulate connection after registration
        setTimeout(() => handler(), 0);
      }
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('sends a message via socket and shows it in sent list', async () => {
    const user = userEvent.setup();

    renderMessageComposer();

    // Wait for socket connection (mock fires 'connect' event)
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'Status: connected',
      );
    });

    // Type and send a message
    const input = screen.getByLabelText(/message/i);
    const sendBtn = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Hello Teacher!');
    await user.click(sendBtn);

    // Verify the message was emitted via socket
    expect(mockEmit).toHaveBeenCalledWith('send_message', {
      recipientId: 'teacher-1',
      recipientModel: 'Faculty',
      content: 'Hello Teacher!',
      conversationId: 'conv-123',
    });

    // Verify the message appears in sent list
    expect(screen.getByTestId('sent-msg-0')).toHaveTextContent('Hello Teacher!');

    // Verify input is cleared after sending
    expect(input).toHaveValue('');
  });

  it('handles delivery confirmation event from server', async () => {
    const user = userEvent.setup();
    let deliveryHandler: ((data: DeliveryConfirmation) => void) | null = null;

    // Capture the message_delivered handler
    mockOn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'connect') {
        setTimeout(() => handler(), 0);
      }
      if (event === 'message_delivered') {
        deliveryHandler = handler as (data: DeliveryConfirmation) => void;
      }
    });

    renderMessageComposer();

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'Status: connected',
      );
    });

    // Send a message
    const input = screen.getByLabelText(/message/i);
    const sendBtn = screen.getByRole('button', { name: /send/i });
    await user.type(input, 'Test message');
    await user.click(sendBtn);

    // Simulate delivery confirmation from server
    expect(deliveryHandler).not.toBeNull();
    act(() => {
      deliveryHandler!({
        messageId: 'msg-001',
        timestamp: '2024-03-01T10:00:00Z',
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('delivered-messages')).toBeInTheDocument();
    });

    expect(screen.getByTestId('delivered-msg-0')).toHaveTextContent('msg-001');
  });

  it('handles delivery failure event and shows error to user', async () => {
    const user = userEvent.setup();
    let failureHandler: ((data: DeliveryFailure) => void) | null = null;

    // Capture the message_delivery_failed handler
    mockOn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'connect') {
        setTimeout(() => handler(), 0);
      }
      if (event === 'message_delivery_failed') {
        failureHandler = handler as (data: DeliveryFailure) => void;
      }
    });

    renderMessageComposer();

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'Status: connected',
      );
    });

    // Send a message
    const input = screen.getByLabelText(/message/i);
    const sendBtn = screen.getByRole('button', { name: /send/i });
    await user.type(input, 'This will fail');
    await user.click(sendBtn);

    // Simulate delivery failure from server
    expect(failureHandler).not.toBeNull();
    act(() => {
      failureHandler!({
        messageId: 'msg-002',
        error: 'PERSISTENCE_FAILED',
        message: 'Unable to save message to database',
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('failed-messages')).toBeInTheDocument();
    });

    // Error alert should be visible
    const alertEl = screen.getByRole('alert');
    expect(alertEl).toBeInTheDocument();
    expect(screen.getByTestId('failed-msg-0')).toHaveTextContent(
      'PERSISTENCE_FAILED',
    );
  });

  it('disables send button when socket is disconnected', async () => {
    // Don't fire connect event
    mockOn.mockImplementation(() => {});

    renderMessageComposer();

    // Status should not be 'connected' since connect handler never fires
    // The socket status starts as 'connecting'
    const sendBtn = screen.getByRole('button', { name: /send/i });
    expect(sendBtn).toBeDisabled();
  });
});
