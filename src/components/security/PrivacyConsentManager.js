import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Switch,
  Typography,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  PrivacyTip as PrivacyIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Shield as ShieldIcon,
  School as SchoolIcon,
  Cookie as CookieIcon,
  Analytics as AnalyticsIcon,
  Share as ShareIcon,
  Storage as StorageIcon,
  Shield as SecurityIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';

/**
 * Privacy Consent Management Component
 *
 * Provides comprehensive privacy consent management interface
 * with GDPR, FERPA, COPPA, and CCPA compliance features
 */

const useStyles = makeStyles(theme => ({
  dialog: {
    '& .MuiDialog-paper': {
      minWidth: 800,
      maxWidth: 1000,
      minHeight: 700,
    },
  },
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingBottom: theme.spacing(2),
  },
  consentCard: {
    marginBottom: theme.spacing(2),
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: theme.shadows[4],
    },
  },
  consentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  consentIcon: {
    fontSize: 40,
    marginRight: theme.spacing(2),
  },
  requiredIcon: {
    color: theme.palette.error.main,
  },
  optionalIcon: {
    color: theme.palette.success.main,
  },
  purposeCard: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
  },
  dataTypeChip: {
    margin: theme.spacing(0.5),
    fontSize: '0.75rem',
  },
  personalDataChip: {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.dark,
  },
  sensitiveDataChip: {
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.dark,
  },
  anonymousDataChip: {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.dark,
  },
  consentStatus: {
    display: 'flex',
    alignItems: 'center',
    marginTop: theme.spacing(1),
  },
  accordionSummary: {
    '& .MuiAccordionSummary-content': {
      alignItems: 'center',
    },
  },
  complianceSection: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
  },
  complianceBadge: {
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  gdprBadge: {
    backgroundColor: '#1976d2',
    color: 'white',
  },
  ferpaBadge: {
    backgroundColor: '#388e3c',
    color: 'white',
  },
  coppaBadge: {
    backgroundColor: '#f57c00',
    color: 'white',
  },
  ccpaBadge: {
    backgroundColor: '#7b1fa2',
    color: 'white',
  },
  rightsList: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(2),
  },
  actionButton: {
    margin: theme.spacing(0.5),
  },
  consentProgress: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  },
  withdrawalWarning: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.warning.light,
    borderRadius: theme.shape.borderRadius,
  },
  legalBasis: {
    fontStyle: 'italic',
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
    marginTop: theme.spacing(1),
  },
  retentionPeriod: {
    display: 'flex',
    alignItems: 'center',
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
}));

const PrivacyConsentManager = ({ open, onClose, userType = 'student' }) => {
  const classes = useStyles();
  const theme = useTheme();
  const originalTheme = useTheme();
  const [consents, setConsents] = useState({});
  const [consentHistory, setConsentHistory] = useState([]);
  const [dataProcessingActivities, setDataProcessingActivities] = useState([]);
  const [userRights, setUserRights] = useState([]);
  const [complianceStatus, setComplianceStatus] = useState({});
  const [loading, setLoading] = useState(false);

  // Consent categories based on user type and compliance requirements
  const consentCategories = [
    {
      id: 'essential',
      title: 'Essential Services',
      description: 'Required for core educational services and platform functionality',
      icon: <SchoolIcon className={`${classes.consentIcon} ${classes.requiredIcon}`} />,
      required: true,
      purposes: [
        'Account management and authentication',
        'Course enrollment and academic record keeping',
        'Communication for educational purposes',
        'Security and fraud prevention',
      ],
      dataTypes: ['Personal Information', 'Academic Records', 'Authentication Data'],
      legalBasis: 'Legitimate Interest / Contract Performance',
      retentionPeriod: 'Duration of educational relationship + 7 years',
      compliance: ['FERPA', 'GDPR'],
    },
    {
      id: 'analytics',
      title: 'Learning Analytics',
      description: 'Analyzing learning patterns to improve educational outcomes',
      icon: <AnalyticsIcon className={`${classes.consentIcon} ${classes.optionalIcon}`} />,
      required: false,
      purposes: [
        'Learning performance analysis',
        'Personalized content recommendations',
        'Educational research and improvement',
        'Usage pattern analysis',
      ],
      dataTypes: ['Learning Data', 'Behavioral Data', 'Performance Metrics'],
      legalBasis: 'Consent',
      retentionPeriod: '3 years after graduation',
      compliance: ['GDPR', 'FERPA'],
    },
    {
      id: 'marketing',
      title: 'Marketing Communications',
      description: 'Receiving promotional content and educational opportunities',
      icon: <ShareIcon className={`${classes.consentIcon} ${classes.optionalIcon}`} />,
      required: false,
      purposes: [
        'Educational program promotions',
        'Newsletter and updates',
        'Event invitations',
        'Alumni communications',
      ],
      dataTypes: ['Contact Information', 'Preferences', 'Engagement Data'],
      legalBasis: 'Consent',
      retentionPeriod: 'Until withdrawal of consent',
      compliance: ['GDPR', 'CCPA'],
    },
    {
      id: 'third_party',
      title: 'Third-Party Integrations',
      description: 'Sharing data with educational partners and service providers',
      icon: <ShareIcon className={`${classes.consentIcon} ${classes.optionalIcon}`} />,
      required: false,
      purposes: [
        'Learning management system integration',
        'External assessment platforms',
        'Career services and job placement',
        'Alumni network services',
      ],
      dataTypes: ['Academic Records', 'Contact Information', 'Career Data'],
      legalBasis: 'Consent',
      retentionPeriod: 'Duration of service partnership',
      compliance: ['FERPA', 'GDPR'],
    },
    {
      id: 'research',
      title: 'Educational Research',
      description: 'Participating in anonymized educational research studies',
      icon: <SecurityIcon className={`${classes.consentIcon} ${classes.optionalIcon}`} />,
      required: false,
      purposes: [
        'Educational effectiveness research',
        'Anonymized learning pattern studies',
        'Academic outcome improvement',
        'Institutional research',
      ],
      dataTypes: ['Anonymized Learning Data', 'Academic Performance', 'Demographics'],
      legalBasis: 'Consent',
      retentionPeriod: '10 years (anonymized)',
      compliance: ['GDPR', 'FERPA', 'IRB Guidelines'],
    },
  ];

  // User rights based on compliance frameworks
  const userDataRights = [
    {
      id: 'access',
      title: 'Right to Access',
      description: 'Request a copy of all personal data we hold about you',
      icon: <ViewIcon />,
      frameworks: ['GDPR', 'CCPA'],
      action: 'requestDataAccess',
    },
    {
      id: 'rectification',
      title: 'Right to Rectification',
      description: 'Request correction of inaccurate or incomplete data',
      icon: <EditIcon />,
      frameworks: ['GDPR', 'FERPA'],
      action: 'requestDataCorrection',
    },
    {
      id: 'erasure',
      title: 'Right to Erasure',
      description: 'Request deletion of personal data (subject to legal requirements)',
      icon: <DeleteIcon />,
      frameworks: ['GDPR', 'CCPA'],
      action: 'requestDataDeletion',
    },
    {
      id: 'portability',
      title: 'Right to Data Portability',
      description: 'Receive your data in a structured, machine-readable format',
      icon: <DownloadIcon />,
      frameworks: ['GDPR'],
      action: 'requestDataPortability',
    },
    {
      id: 'restriction',
      title: 'Right to Restrict Processing',
      description: 'Limit how we process your personal data',
      icon: <CancelIcon />,
      frameworks: ['GDPR'],
      action: 'requestProcessingRestriction',
    },
  ];

  useEffect(() => {
    loadConsentData();
  }, []);

  const loadConsentData = async () => {
    setLoading(true);
    try {
      // Load current consent status
      const consentResponse = await fetch('/api/privacy/consents');
      const consentData = await consentResponse.json();
      setConsents(consentData);

      // Load compliance status
      const complianceResponse = await fetch('/api/privacy/compliance-status');
      const complianceData = await complianceResponse.json();
      setComplianceStatus(complianceData);
    } catch (error) {
      console.error('Error loading consent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = async (categoryId, granted) => {
    try {
      const response = await fetch('/api/privacy/update-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          granted,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        setConsents(prev => ({
          ...prev,
          [categoryId]: {
            granted,
            timestamp: new Date().toISOString(),
            method: 'user_interface',
          },
        }));
      }
    } catch (error) {
      console.error('Error updating consent:', error);
    }
  };

  const handleUserRightRequest = async rightType => {
    try {
      const response = await fetch('/api/privacy/user-rights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rightType,
          requestTimestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        // Show success message
        alert(`Your ${rightType} request has been submitted and will be processed within 30 days.`);
      }
    } catch (error) {
      console.error('Error submitting user right request:', error);
    }
  };

  const getDataTypeChipClass = dataType => {
    if (dataType.includes('Personal') || dataType.includes('Contact')) {
      return classes.personalDataChip;
    } else if (dataType.includes('Sensitive') || dataType.includes('Biometric')) {
      return classes.sensitiveDataChip;
    } else if (dataType.includes('Anonymous')) {
      return classes.anonymousDataChip;
    }
    return '';
  };

  const getComplianceBadgeClass = framework => {
    switch (framework) {
      case 'GDPR':
        return classes.gdprBadge;
      case 'FERPA':
        return classes.ferpaBadge;
      case 'COPPA':
        return classes.coppaBadge;
      case 'CCPA':
        return classes.ccpaBadge;
      default:
        return '';
    }
  };

  const calculateConsentProgress = () => {
    const totalCategories = consentCategories.length;
    const consentedCategories = Object.values(consents).filter(consent => consent.granted).length;
    return (consentedCategories / totalCategories) * 100;
  };

  return (
    <Dialog open={open} onClose={onClose} className={classes.dialog} maxWidth="lg">
      <DialogTitle className={classes.dialogTitle}>
        <Box display="flex" alignItems="center">
          <PrivacyIcon style={{ marginRight: 8 }} />
          Privacy & Consent Management
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Compliance Status */}
        <Box className={classes.complianceSection}>
          <Typography variant="h6" gutterBottom>
            <ShieldIcon style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Compliance Status
          </Typography>
          <Box>
            <Chip
              label="GDPR Compliant"
              className={`${classes.complianceBadge} ${classes.gdprBadge}`}
            />
            <Chip
              label="FERPA Compliant"
              className={`${classes.complianceBadge} ${classes.ferpaBadge}`}
            />
            <Chip
              label="COPPA Compliant"
              className={`${classes.complianceBadge} ${classes.coppaBadge}`}
            />
            <Chip
              label="CCPA Compliant"
              className={`${classes.complianceBadge} ${classes.ccpaBadge}`}
            />
          </Box>
        </Box>

        {/* Consent Progress */}
        <Box className={classes.consentProgress}>
          <Box className={classes.progressLabel}>
            <Typography variant="body2">Consent Configuration Progress</Typography>
            <Typography variant="body2">{Math.round(calculateConsentProgress())}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={calculateConsentProgress()}
            style={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Consent Categories */}
        <Typography variant="h6" gutterBottom style={{ marginTop: 24 }}>
          Data Processing Consents
        </Typography>

        {consentCategories.map(category => (
          <Card key={category.id} className={classes.consentCard}>
            <CardContent>
              <Box className={classes.consentHeader}>
                <Box display="flex" alignItems="center">
                  {category.icon}
                  <Box>
                    <Typography variant="h6">
                      {category.title}
                      {category.required && (
                        <Chip
                          label="Required"
                          size="small"
                          color="error"
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    </Typography>
                    <Typography color="textSecondary">{category.description}</Typography>
                  </Box>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={consents[category.id]?.granted || category.required}
                      onChange={e => handleConsentChange(category.id, e.target.checked)}
                      disabled={category.required}
                      color="primary"
                    />
                  }
                  label=""
                />
              </Box>

              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  className={classes.accordionSummary}
                >
                  <InfoIcon style={{ marginRight: 8, color: theme.palette.info.main }} />
                  <Typography>View Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Processing Purposes:
                      </Typography>
                      <List dense>
                        {category.purposes.map((purpose, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={purpose} />
                          </ListItem>
                        ))}
                      </List>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Data Types:
                      </Typography>
                      <Box>
                        {category.dataTypes.map((dataType, index) => (
                          <Chip
                            key={index}
                            label={dataType}
                            size="small"
                            className={`${classes.dataTypeChip} ${getDataTypeChipClass(dataType)}`}
                          />
                        ))}
                      </Box>

                      <Typography className={classes.legalBasis}>
                        Legal Basis: {category.legalBasis}
                      </Typography>

                      <Box className={classes.retentionPeriod}>
                        <StorageIcon style={{ marginRight: 4, fontSize: 16 }} />
                        Retention: {category.retentionPeriod}
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        ))}

        {/* User Rights Section */}
        <Typography variant="h6" gutterBottom style={{ marginTop: 32 }}>
          Your Privacy Rights
        </Typography>

        <Paper className={classes.rightsList}>
          {userDataRights.map(right => (
            <React.Fragment key={right.id}>
              <ListItem>
                <ListItemIcon>{right.icon}</ListItemIcon>
                <ListItemText
                  primary={right.title}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {right.description}
                      </Typography>
                      <Box style={{ marginTop: 4 }}>
                        {right.frameworks.map(framework => (
                          <Chip
                            key={framework}
                            label={framework}
                            size="small"
                            className={`${classes.complianceBadge} ${getComplianceBadgeClass(framework)}`}
                          />
                        ))}
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleUserRightRequest(right.action)}
                    className={classes.actionButton}
                  >
                    Request
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </Paper>

        {/* Withdrawal Warning */}
        {Object.values(consents).some(consent => !consent.granted) && (
          <Alert severity="warning" className={classes.withdrawalWarning}>
            <Typography variant="body2">
              <strong>Note:</strong> Withdrawing consent for certain data processing activities may
              limit your access to educational services. Required consents cannot be withdrawn while
              maintaining an active account.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => window.open('/privacy-policy', '_blank')}
        >
          View Full Privacy Policy
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrivacyConsentManager;
