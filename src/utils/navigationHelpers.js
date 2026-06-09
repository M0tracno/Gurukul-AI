import { createLocationState } from './routerHelpers';

/**
 * Navigation Helper Functions
 * Utilities to help with navigation and routing in the application
 */

/**
 * Navigate to a dashboard based on user role
 * This function provides consistent navigation across the application
 *
 * @param {Function} navigate - The navigate function from useNavigate()
 * @param {string} role - The user role (faculty, student, parent, admin)
 * @param {Object} options - Navigation options
 * @param {boolean} options.replace - Whether to replace the current history entry
 * @param {Object} options.state - Additional state to include
 */
export const navigateToDashboard = (navigate, role, options = {}) => {
  const { replace = false, state = {} } = options;

  const dashboardPaths = {
    faculty: '/faculty-dashboard',
    student: '/student-dashboard',
    parent: '/parent-dashboard',
    admin: '/admin-dashboard',
  };

  const path = dashboardPaths[role] || '/';
  const locationState = createLocationState(null, state);

  navigate(path, { replace, state: locationState });
};

/**
 * Navigate to login screen based on user role
 *
 * @param {Function} navigate - The navigate function from useNavigate()
 * @param {string} role - The user role (faculty, student, parent, admin)
 * @param {Object} options - Navigation options
 * @param {boolean} options.replace - Whether to replace the current history entry
 * @param {string} options.from - The path the user is coming from
 * @param {Object} options.state - Additional state to include
 */
export const navigateToLogin = (navigate, role, options = {}) => {
  const { replace = false, from = null, state = {} } = options;

  const loginPaths = {
    faculty: '/faculty-login',
    student: '/student-login',
    parent: '/parent-login',
    admin: '/admin-login',
  };

  const path = loginPaths[role] || '/';
  const locationState = createLocationState(from, state);

  navigate(path, { replace, state: locationState });
};
