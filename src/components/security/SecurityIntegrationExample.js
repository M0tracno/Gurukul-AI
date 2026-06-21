// filepath: c:\Users\AYUSHMAN NANDA\OneDrive\Desktop\GDC\src\components\security\SecurityIntegrationExample.js
import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import SecurityDashboard from './SecurityDashboard';
import MFASetupDialog from './MFASetupDialog';
import PrivacyConsentManager from './PrivacyConsentManager';
import SecuritySettings from './SecuritySettings';
import IncidentResponseInterface from './IncidentResponseInterface';
import { useAuth } from '../../auth/AuthContext';
import makeStyles from '../../utils/makeStylesCompat';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Fab,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import {
  Shield as SecurityIcon,
  Shield as ShieldIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

const useStyles = makeStyles(theme => ({
  container: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  paper: {
    padding: theme.spacing(3),
    margin: theme.spacing(1),
  },
  securityCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    marginBottom: theme.spacing(2),
  },
  statusChip: {
    margin: theme.spacing(0.5),
  },
  fab: {
    position: 'fixed',
    bottom: theme.spacing(3),
    right: theme.spacing(3),
  },
  alert: {
    marginBottom: theme.spacing(2),
  },
}));

const SecurityIntegrationExample = () => {
  const theme = useTheme();
  const classes = useStyles();
  const { currentUser } = useAuth(); // Use basic auth hook

  // UI state
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState([]);

  // Load security data on component mount
  useEffect(() => {
    if (currentUser) {
      checkSecurityAlerts();
    }
  }, [currentUser]);

  // Check for security alerts (simplified version)
  const checkSecurityAlerts = () => {
    const alerts = [];

    // Basic security checks
    if (!currentUser?.mfaEnabled) {
      alerts.push({
        type: 'warning',
        message: 'Your account security can be improved by enabling multi-factor authentication.',
        action: 'Enable MFA',
        handler: () => setMfaDialogOpen(true),
      });
    }

    setSecurityAlerts(alerts);
  };

  // Security status summary (simplified)
  const getSecurityStatusSummary = () => {
    const mockScore = 75; // Mock score for demonstration

    return {
      score: mockScore,
      status:
        mockScore >= 80
          ? 'excellent'
          : mockScore >= 60
            ? 'good'
            : mockScore >= 40
              ? 'fair'
              : 'poor',
      color:
        mockScore >= 80
          ? 'success'
          : mockScore >= 60
            ? 'primary'
            : mockScore >= 40
              ? 'warning'
              : 'error',
    };
  };

  const securityStatus = getSecurityStatusSummary();

  if (!currentUser) {
    return (
      <Container className={classes.container}>
        <Paper className={classes.paper}>
          <Typography variant="h5" gutterBottom>
            Security Integration Example
          </Typography>
          <Typography variant="body1">Please log in to view security features.</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container className={classes.container} maxWidth="xl">
      {/* Security Status Card */}
      <Card className={classes.securityCard}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" gutterBottom>
                Security Center
              </Typography>
              <Typography variant="body1">
                Your security score: {securityStatus.score}/100
              </Typography>
            </Box>
            <Chip
              icon={securityStatus.status === 'excellent' ? <CheckIcon /> : <WarningIcon />}
              label={securityStatus.status.toUpperCase()}
              color={securityStatus.color}
              size="medium"
            />
          </Box>

          <Box display="flex" mt={2}>
            <Grid container spacing={1}>
              <Grid item>
                <Chip
                  size="small"
                  className={classes.statusChip}
                  label="MFA: Available"
                  color="primary"
                  onClick={() => setMfaDialogOpen(true)}
                />
              </Grid>
              <Grid item>
                <Chip
                  size="small"
                  className={classes.statusChip}
                  label="Privacy: Managed"
                  color="primary"
                  onClick={() => setPrivacyDialogOpen(true)}
                />
              </Grid>
              <Grid item>
                <Chip
                  size="small"
                  className={classes.statusChip}
                  label="Risk: Monitored"
                  color="primary"
                />
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Security Alerts */}
      {securityAlerts.length > 0 && (
        <Box mb={3}>
          {securityAlerts.map((alert, index) => (
            <Alert
              key={index}
              severity={alert.type}
              className={classes.alert}
              action={
                alert.action && (
                  <Chip size="small" label={alert.action} onClick={alert.handler} color="primary" />
                )
              }
            >
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Security Dashboard */}
      <Paper className={classes.paper}>
        <SecurityDashboard />
      </Paper>

      {/* Floating Action Button for Security Settings */}
      <Fab color="primary" className={classes.fab} onClick={() => setSettingsDialogOpen(true)}>
        <SecurityIcon />
      </Fab>

      {/* MFA Setup Dialog */}
      <Dialog open={mfaDialogOpen} onClose={() => setMfaDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Multi-Factor Authentication Setup</DialogTitle>
        <DialogContent>
          <MFASetupDialog
            onSetupComplete={() => {
              setMfaDialogOpen(false);
              checkSecurityAlerts();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Privacy Consent Dialog */}
      <Dialog
        open={privacyDialogOpen}
        onClose={() => setPrivacyDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Privacy Consent Management</DialogTitle>
        <DialogContent>
          <PrivacyConsentManager
            onConsentUpdate={() => {
              checkSecurityAlerts();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Security Settings Dialog */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Security Settings</DialogTitle>
        <DialogContent>
          <SecuritySettings
            onSettingsUpdate={() => {
              checkSecurityAlerts();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Incident Response Dialog */}
      <Dialog
        open={incidentDialogOpen}
        onClose={() => setIncidentDialogOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>Security Incident Response</DialogTitle>
        <DialogContent>
          <IncidentResponseInterface
            onIncidentUpdate={() => {
              checkSecurityAlerts();
            }}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default SecurityIntegrationExample;
