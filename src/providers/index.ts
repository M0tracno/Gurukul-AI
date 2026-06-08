/**
 * Providers — Barrel Export
 *
 * Central export point for all application-level React providers.
 */

export { AppThemeProvider, useThemeMode } from './ThemeProvider';
export { AppQueryProvider } from './QueryProvider';
export { AuthProvider, useAuth } from './AuthProvider';
export {
  SocketProvider,
  useSocket,
  useSocketEvent,
  useMessaging,
  useTypingIndicator,
} from './SocketProvider';
export type {
  ConnectionStatus,
  MessagePayload,
  IncomingMessage,
  DeliveryConfirmation,
  DeliveryFailure,
  TypingEvent,
  SyncCompleteEvent,
  SyncErrorEvent,
} from './SocketProvider';
