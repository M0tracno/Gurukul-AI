import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../src/auth/AuthContext';
import { SecurityProvider } from '../src/contexts/SecurityContext';
import SecurityDashboard from '../src/components/security/SecurityDashboard';
import MFASetupDialog from '../src/components/security/MFASetupDialog';
import PrivacyConsentManager from '../src/components/security/PrivacyConsentManager';
import SecuritySettings from '../src/components/security/SecuritySettings';
import { SecurityStatusMonitor } from '../src/components/security/SecurityMiddleware';
import { ThemeProvider, createTheme } from '@mui/material/styles';

/**
 * Security Components Tests - Phase 5 Security Enhancement
 * React component tests for security UI components
 */


// Test utilities and mocks

// Components to test

// Mock theme
const mockTheme = createTheme();

// Mock auth context value
const mockAuthContextValue = {
  currentUser: {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User'
  },
  userRole: 'faculty',
  loading: false
};

// Mock security context value
const mockSecurityContextValue = {
  securityInitialized: true,
  securityStatus: {
    securityScore: 85,
    mfaEnabled: false,
    clearanceLevel: 'medium',
    riskScore: 25
  },
  deviceFingerprint: {
    fingerprint: 'mock-fingerprint-123',
    confidence: 85
  },
  sessionSecurity: {
    isActive: true,
    expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
  },
  threatLevel: 'low',
  securityAlerts: [],
  complianceStatus: {
    isCompliant: true,
    gdprCompliant: true,
    ferpaCompliant: true
  },
  isSecurityLoading: false,
  securityError: null,
  updateSecurityStatus: jest.fn(),
  logSecurityEvent: jest.fn(),
  reportIncident: jest.fn(),
  dismissAlert: jest.fn(),
  refreshSecurityStatus: jest.fn(),
  hasSecurityClearance: jest.fn(() => true),
  getSecurityRecommendations: jest.fn(() => []),
  isHighRisk: false,
  hasActiveAlerts: false,
  securityScore: 85,
  needsAttention: false,
  isCompliant: true
};

// Test wrapper component
const TestWrapper = ({ children, securityContext = mockSecurityContextValue }) => (
  <BrowserRouter>
    <ThemeProvider theme={mockTheme}>
      <AuthContext.Provider value={mockAuthContextValue}>
        <SecurityProvider value={securityContext}>
          {children}
        </SecurityProvider>
      </AuthContext.Provider>
    </ThemeProvider>
  </BrowserRouter>
);

// Mock external dependencies
jest.mock('../src/services/security/securityCoordinator', () => ({
  initialize: jest.fn(),
  getSecurityStatus: jest.fn(),
  getSessionSecurity: jest.fn(),
  getComplianceStatus: jest.fn(),
  logSecurityEvent: jest.fn(),
  createIncident: jest.fn()
}));

jest.mock('../src/utils/security', () => ({
  monitoring: {
    generateDeviceFingerprint: jest.fn(() => ({
      fingerprint: 'mock-fingerprint-123',
      confidence: 85
    }))
  },
  validation: {
    validatePassword: jest.fn(() => ({
      isValid: true,
      score: 85,
      strength: 'Strong'
    })),
    validateEmail: jest.fn(() => ({
      isValid: true
    }))
  },
  encryption: {
    encryptData: jest.fn(),
    decryptData: jest.fn()
  }
}));

describe('SecurityDashboard Component', () => {
  test('renders security dashboard with metrics', async () => {
    render(
      <TestWrapper>
        <SecurityDashboard />
      </TestWrapper>
    );

    // Check for main dashboard elements
    expect(screen.getByText(/Security Dashboard/i)).toBeInTheDocument();
    
    // Wait for async content to load
    await waitFor(() => {
      expect(screen.getByText(/Security Score/i)).toBeInTheDocument();
    });
  });

  test('displays security score correctly', async () => {
    render(
      <TestWrapper>
        <SecurityDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should display the mock security score
      expect(screen.getByText(/85/)).toBeInTheDocument();
    });
  });

  test('shows threat level indicator', async () => {
    render(
      <TestWrapper>
        <SecurityDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should show low threat level
      expect(screen.getByText(/low/i)).toBeInTheDocument();
    });
  });
});

describe('MFASetupDialog Component', () => {
  const mockProps = {
    open: true,
    onClose: jest.fn(),
    onComplete: jest.fn()
  };

  test('renders MFA setup dialog', () => {
    render(
      <TestWrapper>
        <MFASetupDialog {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText(/Multi-Factor Authentication/i)).toBeInTheDocument();
  });

  test('shows authentication method options', () => {
    render(
      <TestWrapper>
        <MFASetupDialog {...mockProps} />
      </TestWrapper>
    );

    // Should show different MFA options
    expect(screen.getByText(/Authenticator App/i)).toBeInTheDocument();
    expect(screen.getByText(/SMS/i)).toBeInTheDocument();
    expect(screen.getByText(/Email/i)).toBeInTheDocument();
  });

  test('handles method selection', () => {
    render(
      <TestWrapper>
        <MFASetupDialog {...mockProps} />
      </TestWrapper>
    );

    // Click on TOTP option
    const totpOption = screen.getByRole('button', { name: /Authenticator App/i });
    fireEvent.click(totpOption);

    // Should proceed to next step
    expect(screen.getByText(/Scan QR Code/i)).toBeInTheDocument();
  });

  test('calls onClose when canceled', () => {
    render(
      <TestWrapper>
        <MFASetupDialog {...mockProps} />
      </TestWrapper>
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });
});

describe('PrivacyConsentManager Component', () => {
  test('renders privacy consent manager', () => {
    render(
      <TestWrapper>
        <PrivacyConsentManager />
      </TestWrapper>
    );

    expect(screen.getByText(/Privacy Settings/i)).toBeInTheDocument();
  });

  test('displays compliance frameworks', () => {
    render(
      <TestWrapper>
        <PrivacyConsentManager />
      </TestWrapper>
    );

    // Should show compliance options
    expect(screen.getByText(/GDPR/i)).toBeInTheDocument();
    expect(screen.getByText(/FERPA/i)).toBeInTheDocument();
  });

  test('allows consent toggling', async () => {
    render(
      <TestWrapper>
        <PrivacyConsentManager />
      </TestWrapper>
    );

    // Find and toggle a consent switch
    const consentSwitch = screen.getAllByRole('checkbox')[0];
    fireEvent.click(consentSwitch);

    // Should trigger consent update
    await waitFor(() => {
      expect(consentSwitch).toBeChecked();
    });
  });
});

describe('SecuritySettings Component', () => {
  test('renders security settings', () => {
    render(
      <TestWrapper>
        <SecuritySettings />
      </TestWrapper>
    );

    expect(screen.getByText(/Security Settings/i)).toBeInTheDocument();
  });

  test('displays authentication settings', () => {
    render(
      <TestWrapper>
        <SecuritySettings />
      </TestWrapper>
    );

    // Should show authentication options
    expect(screen.getByText(/Password/i)).toBeInTheDocument();
    expect(screen.getByText(/Two-Factor Authentication/i)).toBeInTheDocument();
  });

  test('shows privacy controls', () => {
    render(
      <TestWrapper>
        <SecuritySettings />
      </TestWrapper>
    );

    // Should show privacy settings
    expect(screen.getByText(/Privacy Controls/i)).toBeInTheDocument();
  });

  test('allows settings updates', async () => {
    render(
      <TestWrapper>
        <SecuritySettings />
      </TestWrapper>
    );

    // Find a settings toggle
    const settingSwitch = screen.getAllByRole('checkbox')[0];
    fireEvent.click(settingSwitch);

    // Should update setting
    await waitFor(() => {
      expect(settingSwitch).toBeChecked();
    });
  });
});

describe('SecurityStatusMonitor Component', () => {
  test('renders without security alerts', () => {
    render(
      <TestWrapper>
        <SecurityStatusMonitor>
          <div>Child content</div>
        </SecurityStatusMonitor>
      </TestWrapper>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  test('displays security alerts when present', () => {
    const securityContextWithAlerts = {
      ...mockSecurityContextValue,
      securityAlerts: [
        {
          id: 'test-alert',
          type: 'warning',
          title: 'Test Alert',
          message: 'This is a test security alert',
          priority: 'high'
        }
      ],
      hasActiveAlerts: true
    };

    render(
      <TestWrapper securityContext={securityContextWithAlerts}>
        <SecurityStatusMonitor>
          <div>Child content</div>
        </SecurityStatusMonitor>
      </TestWrapper>
    );

    expect(screen.getByText('Test Alert')).toBeInTheDocument();
    expect(screen.getByText('This is a test security alert')).toBeInTheDocument();
  });

  test('displays critical threat alert', () => {
    const securityContextWithCriticalThreat = {
      ...mockSecurityContextValue,
      threatLevel: 'critical'
    };

    render(
      <TestWrapper securityContext={securityContextWithCriticalThreat}>
        <SecurityStatusMonitor>
          <div>Child content</div>
        </SecurityStatusMonitor>
      </TestWrapper>
    );

    expect(screen.getByText(/Critical Security Alert/i)).toBeInTheDocument();
  });

  test('allows alert dismissal', async () => {
    const mockDismissAlert = jest.fn();
    const securityContextWithAlerts = {
      ...mockSecurityContextValue,
      securityAlerts: [
        {
          id: 'dismissible-alert',
          type: 'info',
          title: 'Dismissible Alert',
          message: 'This alert can be dismissed',
          priority: 'low'
        }
      ],
      dismissAlert: mockDismissAlert
    };

    render(
      <TestWrapper securityContext={securityContextWithAlerts}>
        <SecurityStatusMonitor>
          <div>Child content</div>
        </SecurityStatusMonitor>
      </TestWrapper>
    );

    // Find and click dismiss button
    const dismissButton = screen.getByLabelText(/close/i);
    fireEvent.click(dismissButton);

    expect(mockDismissAlert).toHaveBeenCalledWith('dismissible-alert');
  });
});

// Integration tests
describe('Security Components Integration', () => {
  test('security components work together', async () => {
    const App = () => (
      <TestWrapper>
        <SecurityDashboard />
        <SecuritySettings />
      </TestWrapper>
    );

    render(<App />);

    // Both components should render
    await waitFor(() => {
      expect(screen.getByText(/Security Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Security Settings/i)).toBeInTheDocument();
    });
  });

  test('security context provides data to components', async () => {
    render(
      <TestWrapper>
        <SecurityDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should display data from security context
      expect(screen.getByText(/85/)).toBeInTheDocument(); // Security score
    });
  });
});

// Error boundary tests
describe('Security Component Error Handling', () => {
  // Mock console.error to avoid test output pollution
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  test('handles component errors gracefully', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    // This should not crash the test
    expect(() => {
      render(
        <TestWrapper>
          <ThrowError />
        </TestWrapper>
      );
    }).not.toThrow();
  });
});
