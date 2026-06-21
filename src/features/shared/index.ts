/**
 * Shared feature module barrel export
 *
 * Import from this file when using shared module externally:
 *   import { PaginationParams, ApiError } from '@/features/shared';
 *
 * Do NOT import from internal paths like '@/features/shared/components/...'
 */

// Types
export * from './types';

// Components
export * from './components/ErrorBoundary';
export * from './components/SkeletonLoaders';
export * from './components/QueryErrorState';
export * from './components/DataTable';
export * from './components/FormFields';
export * from './components/Buttons';
export * from './components/ResponsiveContainer';
export * from './components/EmptyState';
export * from './components/Greeting';

// Hooks
export * from './hooks';

// Utils
export { computeGreeting, phraseForHour, type TimeOfDayPhrase } from './utils/greeting';

// Services
export { apiClient, ApiClientError } from './services/apiClient';
