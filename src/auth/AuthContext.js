import React, { createContext, useContext, useState, useEffect } from 'react';
import env from '../config/env';

// Create the Auth Context
const AuthContext = createContext();

// Export AuthContext for use in other contexts
export { AuthContext };

// Custom hook to use the Auth Context
export function useAuth() {
  return useContext(AuthContext);
}

// Auth Provider Component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [initFailed, setInitFailed] = useState(false);

  // Initialize authentication - verify existing token on mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');

        if (token && userData) {
          try {
            const apiBaseUrl = env.API_URL;

            const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              credentials: 'include'
            });

            if (response.ok) {
              const responseData = await response.json();
              const freshUser = responseData.user;

              localStorage.setItem('userData', JSON.stringify(freshUser));

              setCurrentUser(freshUser);
              setUserRole(freshUser.role);
            } else {
              if (response.status === 401 || response.status === 404) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
              } else {
                throw new Error('Token verification failed');
              }
            }
          } catch (e) {
            console.error('Error verifying token:', e);
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
          }
        }

        setLoading(false);
      } catch (e) {
        console.error('Error initializing authentication:', e);
        setLoading(false);
        setInitFailed(true);
      }
    };

    verifyToken();
  }, []);

  // Helper function to process successful login
  const processSuccessfulLogin = (data) => {
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userData', JSON.stringify(data.user));

    setCurrentUser(data.user);
    setUserRole(data.user.role);
  };

  // Login function
  const login = async (email, password, role) => {
    try {
      const apiBaseUrl = env.API_URL;

      // Use different endpoint for parent login
      let endpoint = '/api/auth/login';
      if (role === 'parent') {
        endpoint = '/api/auth/parent/login';
      }

      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(data.message || 'Invalid credentials');
        } else if (response.status === 401) {
          throw new Error('Access denied. Please check your credentials.');
        } else if (response.status === 403) {
          throw new Error('Account is inactive. Please contact administrator.');
        } else if (response.status === 404) {
          throw new Error('User not found with this email address.');
        } else if (response.status === 429) {
          throw new Error('Too many login attempts. Please try again later.');
        } else {
          throw new Error(data.message || 'Login failed');
        }
      }

      processSuccessfulLogin(data);
      return { user: data.user, token: data.token };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Signup function
  const signup = async (email, password, role, displayName) => {
    try {
      const endpoint = role === 'faculty' ? '/api/auth/register/faculty' : '/api/auth/register/student';

      const response = await fetch(`${env.API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName: displayName?.split(' ')[0] || '',
          lastName: displayName?.split(' ')[1] || '',
          ...(role === 'faculty' && {
            employeeId: `EMP${Date.now()}`,
            department: 'General'
          }),
          ...(role === 'student' && {
            studentId: `STU${Date.now()}`,
            grade: 'General'
          })
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Auto-login after successful registration
      return await login(email, password, role);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    setCurrentUser(null);
    setUserRole(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    return Promise.resolve();
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      const response = await fetch(`${env.API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Password reset failed');
      }

      return data;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  // Parent authentication functions
  const parentLogin = async (token, parentData) => {
    try {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(parentData));
      localStorage.setItem('userRole', 'parent');

      setCurrentUser(parentData);
      setUserRole('parent');

      return { success: true, user: parentData };
    } catch (error) {
      console.error('Parent login error:', error);
      throw error;
    }
  };

  const sendParentOTP = async (phoneNumber, studentId) => {
    try {
      const apiBaseUrl = env.API_URL;

      const response = await fetch(`${apiBaseUrl}/api/auth/parent/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, studentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      return data;
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    }
  };

  const verifyParentOTP = async (phoneNumber, otp, otpId) => {
    try {
      const apiBaseUrl = env.API_URL;

      const response = await fetch(`${apiBaseUrl}/api/auth/parent/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, otp, otpId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid OTP');
      }

      await parentLogin(data.token, data.parent);

      return data;
    } catch (error) {
      console.error('Verify OTP error:', error);
      throw error;
    }
  };

  // MSG91 functions
  const getMSG91Config = async () => {
    try {
      const apiBaseUrl = env.API_URL;

      const response = await fetch(`${apiBaseUrl}/api/auth/parent/widget-config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get widget config');
      }

      return data.data;
    } catch (error) {
      console.error('Get MSG91 config error:', error);
      throw error;
    }
  };

  const sendMSG91OTP = async (phoneNumber, studentId) => {
    try {
      const apiBaseUrl = env.API_URL;

      const response = await fetch(`${apiBaseUrl}/api/auth/parent/send-msg91-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, studentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP via MSG91');
      }

      return data;
    } catch (error) {
      console.error('Send MSG91 OTP error:', error);
      throw error;
    }
  };

  const verifyMSG91OTP = async (phoneNumber, otp, requestId, studentId) => {
    try {
      const apiBaseUrl = env.API_URL;

      const response = await fetch(`${apiBaseUrl}/api/auth/parent/verify-msg91-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, otp, requestId, studentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to verify OTP with MSG91');
      }

      localStorage.setItem('authToken', data.data.token);
      localStorage.setItem('userData', JSON.stringify(data.data.parent));

      setCurrentUser(data.data.parent);
      setUserRole('parent');

      return data;
    } catch (error) {
      console.error('Verify MSG91 OTP error:', error);
      throw error;
    }
  };

  const verifyMSG91Token = async (jwtToken, studentId) => {
    try {
      const apiBaseUrl = env.API_URL;

      const response = await fetch(`${apiBaseUrl}/api/auth/parent/verify-msg91-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jwtToken, studentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid token');
      }

      await parentLogin(data.data.token, data.data.parent);

      return data;
    } catch (error) {
      console.error('Verify MSG91 token error:', error);
      throw error;
    }
  };

  // Context value
  const value = {
    currentUser,
    userRole,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    parentLogin,
    sendParentOTP,
    verifyParentOTP,
    getMSG91Config,
    sendMSG91OTP,
    verifyMSG91OTP,
    verifyMSG91Token,
    isAuthenticated: !!currentUser
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        <p>Loading application...</p>
      </div>
    );
  }

  if (initFailed) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'Arial, sans-serif',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: 'red' }}>Initialization Error</h2>
        <p>Failed to initialize the application. Please try refreshing the page.</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            marginTop: '20px',
            cursor: 'pointer'
          }}
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
