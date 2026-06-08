/**
 * Router Helper Functions
 * Utilities to help with React Router compatibility between versions
 * and prepare for future React Router v7 updates.
 */

/**
 * Gets route parameters from the current location
 * Compatible with React Router v6 and future-proof for v7
 * 
 * @param {Object} params - The params object from useParams()
 * @returns {Object} - The cleaned params object
 */
export const getRouteParams = (params) => {
  // Remove the '*' wildcard parameter that might be added in future versions
  const { '*': wildcard, ...cleanParams } = params || {};
  return cleanParams;
};

/**
 * Creates location state that's compatible with current and future versions of React Router
 * 
 * @param {string} from - The path the user is coming from
 * @param {Object} additionalState - Any additional state to include
 * @returns {Object} - Router location state object
 */
export const createLocationState = (from, additionalState = {}) => {
  return {
    from: from || '/',
    ...additionalState,
  };
};

/**
 * Get a normalized pathname from location
 * Works with both current and future React Router versions
 * 
 * @param {Object} location - The location object from useLocation()
 * @returns {string} - Normalized pathname
 */
export const getNormalizedPathname = (location) => {
  if (!location) return '/';
  
  // Handle potential format changes in future versions
  const pathname = location.pathname || '';
  
  // Ensure the pathname starts with a slash
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
};

/**
 * Safely access the state from location
 * Compatible with React Router v6 and future-proof for v7
 * 
 * @param {Object} location - The location object from useLocation()
 * @param {string} key - The key to access in the state object
 * @param {*} defaultValue - Default value if state or key doesn't exist
 * @returns {*} - The value from state or the default value
 */
export const getLocationState = (location, key, defaultValue = null) => {
  if (!location || !location.state) {
    return defaultValue;
  }
  
  return location.state[key] !== undefined ? location.state[key] : defaultValue;
};



