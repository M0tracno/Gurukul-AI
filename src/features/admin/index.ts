/**
 * Admin feature module barrel export
 *
 * Import from this file when using admin module externally:
 *   import { AdminProfile } from '@/features/admin';
 *
 * Do NOT import from internal paths like '@/features/admin/components/...'
 */

// Types
export * from './types';

// Components
export { SystemMetricsPanel } from './components/SystemMetricsPanel';
export { GradingOverridePanel } from './components/GradingOverridePanel';
export { OverrideControls } from './components/OverrideControls';

// Services
export {
  fetchSystemMetrics,
  fetchDashboardMetrics,
  submitGradeOverride,
  finalizeSubmission,
} from './services/adminApiService';
