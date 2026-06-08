/**
 * Application Constants
 * 
 * This file contains constants used throughout the application
 * including role names and application branding.
 */

// Application Name
export const APP_NAME = 'Gurukul AI';

// Role Names (Original → New)
// Student → Eklavya
// Faculty → Dronacharya
// Parent → Gandhari/Dhritarashtra
// Admin → Krishna
export const ROLES = {
  // Role IDs (used in authentication and routing)
  STUDENT: 'student',
  FACULTY: 'faculty',
  PARENT: 'parent',
  ADMIN: 'admin',
  
  // Display Names (used in UI)
  STUDENT_DISPLAY: 'Eklavya',
  FACULTY_DISPLAY: 'Dronacharya',
  PARENT_DISPLAY: 'Gandhari & Dhritarashtra',
  ADMIN_DISPLAY: 'Krishna',
  
  // Role Descriptions
  STUDENT_DESC: 'Login as an Eklavya to access courses, take quizzes, and view your performance.',
  FACULTY_DESC: 'Login as a Dronacharya to create quizzes, grade assignments, and track student progress.',
  PARENT_DESC: 'Login as Gandhari & Dhritarashtra to monitor your child\'s academic performance and communicate with teachers.',
  ADMIN_DESC: 'Login as Krishna to manage users, courses, and system settings.'
};

// Dashboard paths
export const DASHBOARD_PATHS = {
  STUDENT: '/student-dashboard',
  FACULTY: '/faculty-dashboard',
  PARENT: '/parent-dashboard',
  ADMIN: '/admin-dashboard'
};

// Login paths
export const LOGIN_PATHS = {
  STUDENT: '/student-login',
  FACULTY: '/faculty-login',
  PARENT: '/parent-login',
  ADMIN: '/admin-login'
};

// Theme constants
export const THEME_CONSTANTS = {
  // Role-specific colors
  ROLE_COLORS: {
    STUDENT: '#4361ee', // Blue
    FACULTY: '#3a0ca3', // Deep Purple
    PARENT: '#f72585', // Pink
    ADMIN: '#4cc9f0'  // Cyan
  },
  
  // Gradient backgrounds
  GRADIENTS: {
    PRIMARY: 'linear-gradient(135deg, #3a86ff 0%, #4361ee 100%)',
    SECONDARY: 'linear-gradient(135deg, #8338ec 0%, #5e60ce 100%)',
    STUDENT: 'linear-gradient(135deg, #4361ee 0%, #3a86ff 100%)',
    FACULTY: 'linear-gradient(135deg, #3a0ca3 0%, #480ca8 100%)',
    PARENT: 'linear-gradient(135deg, #f72585 0%, #b5179e 100%)',
    ADMIN: 'linear-gradient(135deg, #4cc9f0 0%, #4895ef 100%)',
    DARK: 'linear-gradient(135deg, #121212 0%, #2b2d42 100%)'
  }
};


