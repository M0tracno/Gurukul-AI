import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography
} from '@mui/material';
import {
  Shield as SecurityIcon,
  Shield as ShieldIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  Block as BlockIcon,
  VpnKey as VpnKeyIcon,
  Fingerprint as FingerprintIcon,
  PhoneAndroid as PhoneIcon,
  Computer as ComputerIcon,
  Location as LocationIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Report as ReportIcon,
  Assessment as AssessmentIcon,
  NetworkCheck as NetworkIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  BugReport as BugIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';

const useStyles = makeStyles((theme) => ({
  dashboardContainer: {
    padding: theme.spacing(3),
  },
  securityCard: {
    height: '100%',
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: theme.shadows[8],
      transform: 'translateY(-2px)',
    }
  },
  criticalCard: {
    borderLeft: `4px solid ${theme.palette.error.main}`,
  },
  warningCard: {
    borderLeft: `4px solid ${theme.palette.warning.main}`,
  },
  healthyCard: {
    borderLeft: `4px solid ${theme.palette.success.main}`,
  },
  infoCard: {
    borderLeft: `4px solid ${theme.palette.info.main}`,
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  metricLabel: {
    textAlign: 'center',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1),
  },
  criticalMetric: {
    color: theme.palette.error.main,
  },
  warningMetric: {
    color: theme.palette.warning.main,
  },
  healthyMetric: {
    color: theme.palette.success.main,
  },
  threatIndicator: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
  },
  highThreat: {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.dark,
  },
  mediumThreat: {
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.dark,
  },
  lowThreat: {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.dark,
  },
  deviceCard: {
    margin: theme.spacing(1, 0),
    padding: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },
  trustedDevice: {
    borderColor: theme.palette.success.main,
    backgroundColor: `${theme.palette.success.main}10`,
  },
  suspiciousDevice: {
    borderColor: theme.palette.warning.main,
    backgroundColor: `${theme.palette.warning.main}10`,
  },
  blockedDevice: {
    borderColor: theme.palette.error.main,
    backgroundColor: `${theme.palette.error.main}10`,
  },
  incidentRow: {
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    }
  },
  severityChip: {
    fontWeight: 'bold',
    minWidth: 80,
  },
  criticalSeverity: {
    backgroundColor: theme.palette.error.main,
    color: 'white',
  },
  highSeverity: {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.dark,
  },
  mediumSeverity: {
    backgroundColor: theme.palette.warning.main,
    color: 'white',
  },
  lowSeverity: {
    backgroundColor: theme.palette.info.main,
    color: 'white',
  },
  statusChip: {
    minWidth: 100,
  },
  tabPanel: {
    paddingTop: theme.spacing(3),
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: theme.spacing(1),
  },
  actionButton: {
    margin: theme.spacing(0.5),
  },
  refreshButton: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
  }
}));

const SecurityDashboard = () => {
  const classes = useStyles();
  const theme = useTheme();
  const originalTheme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [securityMetrics, setSecurityMetrics] = useState({});
  const [threats, setThreats] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [devices, setDevices] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);

  useEffect(() => {
    loadSecurityData();
    // Set up real-time updates
    const interval = setInterval(loadSecurityData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    if (!loading) setRefreshing(true);
    try {
      // Load security metrics
      const metricsResponse = await fetch('/api/security/metrics');
      const metricsData = await metricsResponse.json();
      setSecurityMetrics(metricsData);

      // Load threat data
      const threatsResponse = await fetch('/api/security/threats');
      const threatsData = await threatsResponse.json();
      setThreats(threatsData);

      // Load incidents
      const incidentsResponse = await fetch('/api/security/incidents');
      const incidentsData = await incidentsResponse.json();
      setIncidents(incidentsData);

      // Load devices
      const devicesResponse = await fetch('/api/security/devices');
      const devicesData = await devicesResponse.json();
      setDevices(devicesData);

      // Load vulnerabilities
      const vulnerabilitiesResponse = await fetch('/api/security/vulnerabilities');
      const vulnerabilitiesData = await vulnerabilitiesResponse.json();
      setVulnerabilities(vulnerabilitiesData);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleIncidentAction = async (incidentId, action) => {
    try {
      const response = await fetch(`/api/security/incidents/${incidentId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        loadSecurityData(); // Refresh data
      }
    } catch (error) {
      console.error('Error handling incident action:', error);
    }
  };

  const getSecurityScoreColor = (score) => {
    if (score >= 80) return theme.palette.success.main;
    if (score >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getSeverityClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return classes.criticalSeverity;
      case 'high': return classes.highSeverity;
      case 'medium': return classes.mediumSeverity;
      case 'low': return classes.lowSeverity;
      default: return '';
    }
  };

  const getThreatLevelClass = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return classes.highThreat;
      case 'medium': return classes.mediumThreat;
      case 'low': return classes.lowThreat;
      default: return '';
    }
  };

  const getDeviceStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'trusted': return classes.trustedDevice;
      case 'suspicious': return classes.suspiciousDevice;
      case 'blocked': return classes.blockedDevice;
      default: return '';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      <Grid size={{xs:12,md:3}}>
        <Card className={`${classes.securityCard} ${securityMetrics.score >= 80 ? classes.healthyCard : securityMetrics.score >= 60 ? classes.warningCard : classes.criticalCard}`}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column">
              <ShieldIcon style={{ fontSize: 40, marginBottom: 16 }} />
              <Typography className={`${classes.metricValue} ${securityMetrics.score >= 80 ? classes.healthyMetric : securityMetrics.score >= 60 ? classes.warningMetric : classes.criticalMetric}`}>
                {securityMetrics.score || 0}
              </Typography>
              <Typography className={classes.metricLabel}>
                Security Score
              </Typography>
              <LinearProgress
                variant="determinate"
                value={securityMetrics.score || 0}
                className={classes.progressBar}
                style={{
                  width: '100%',
                  backgroundColor: theme.palette.grey[300],
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getSecurityScoreColor(securityMetrics.score || 0)
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{xs:12,md:3}}>
        <Card className={`${classes.securityCard} ${threats.filter(t => t.status === 'active').length > 0 ? classes.criticalCard : classes.healthyCard}`}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column">
              <WarningIcon style={{ fontSize: 40, marginBottom: 16 }} />
              <Typography className={`${classes.metricValue} ${threats.filter(t => t.status === 'active').length > 0 ? classes.criticalMetric : classes.healthyMetric}`}>
                {threats.filter(t => t.status === 'active').length}
              </Typography>
              <Typography className={classes.metricLabel}>
                Active Threats
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{xs:12,md:3}}>
        <Card className={`${classes.securityCard} ${incidents.filter(i => i.status === 'open').length > 0 ? classes.warningCard : classes.healthyCard}`}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column">
              <ReportIcon style={{ fontSize: 40, marginBottom: 16 }} />
              <Typography className={`${classes.metricValue} ${incidents.filter(i => i.status === 'open').length > 0 ? classes.warningMetric : classes.healthyMetric}`}>
                {incidents.filter(i => i.status === 'open').length}
              </Typography>
              <Typography className={classes.metricLabel}>
                Open Incidents
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{xs:12,md:3}}>
        <Card className={`${classes.securityCard} ${vulnerabilities.filter(v => v.status === 'open').length > 0 ? classes.warningCard : classes.healthyCard}`}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column">
              <BugIcon style={{ fontSize: 40, marginBottom: 16 }} />
              <Typography className={`${classes.metricValue} ${vulnerabilities.filter(v => v.status === 'open').length > 0 ? classes.warningMetric : classes.healthyMetric}`}>
                {vulnerabilities.filter(v => v.status === 'open').length}
              </Typography>
              <Typography className={classes.metricLabel}>
                Open Vulnerabilities
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{xs:12,md:6}}>
        <Card className={classes.securityCard}>
          <CardHeader
            title="Recent Threat Activity"
            action={
              <IconButton onClick={loadSecurityData} disabled={refreshing}>
                <RefreshIcon />
              </IconButton>
            }
          />
          <CardContent>
            {threats.slice(0, 5).map((threat, index) => (
              <Box key={index} className={`${classes.threatIndicator} ${getThreatLevelClass(threat.level)}`}>
                <Typography variant="body2" style={{ flexGrow: 1 }}>
                  {threat.description}
                </Typography>
                <Chip
                  size="small"
                  label={threat.level}
                  className={classes.severityChip}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{xs:12,md:6}}>
        <Card className={classes.securityCard}>
          <CardHeader title="Connected Devices" />
          <CardContent>
            {devices.slice(0, 5).map((device, index) => (
              <Box key={index} className={`${classes.deviceCard} ${getDeviceStatusClass(device.status)}`}>
                <Typography variant="body2">
                  <strong>{device.name}</strong> - {device.type}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Last seen: {formatTimestamp(device.lastSeen)}
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                  <Chip
                    size="small"
                    label={device.status}
                    className={classes.severityChip}
                  />
                  <Typography variant="caption">
                    IP: {device.ipAddress}
                  </Typography>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderIncidentsTab = () => (
    <Card className={classes.securityCard}>
      <CardHeader
        title="Security Incidents"
        action={
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadSecurityData}>
            Refresh
          </Button>
        }
      />
      <CardContent>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow><TableCell>ID</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Actions</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {incidents.map((incident) => (
                <TableRow key={incident.id} className={classes.incidentRow}>
                  <TableCell>{incident.id}</TableCell>
                  <TableCell>{incident.description}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={incident.severity}
                      className={`${classes.severityChip} ${getSeverityClass(incident.severity)}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={incident.status}
                      className={classes.statusChip}
                      color={incident.status === 'open' ? 'error' : incident.status === 'investigating' ? 'warning' : 'success'}
                    />
                  </TableCell>
                  <TableCell>{formatTimestamp(incident.timestamp)}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      className={classes.actionButton}
                      onClick={() => {
                        setSelectedIncident(incident);
                        setIncidentDialogOpen(true);
                      }}
                    >
                      <ViewIcon />
                    </IconButton>
                    {incident.status === 'open' && (
                      <IconButton size="small" onClick={() => handleIncidentAction(incident.id, 'investigate')}>
                        <SearchIcon />
                      </IconButton>
                    )}
                  </TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const renderVulnerabilitiesTab = () => (
    <Grid container spacing={3}>
      <Grid size={{xs:12}}>
        <Card className={classes.securityCard}>
          <CardHeader title="Vulnerability Assessment" />
          <CardContent>
            <Grid container spacing={3}>
              {vulnerabilities.map((vuln, index) => (
                <Grid size={{xs:12,md:6}} key={index}>
                  <Paper elevation={1} style={{ padding: theme.spacing(2) }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="h6">{vuln.name}</Typography>
                      <Chip
                        size="small"
                        label={vuln.severity}
                        className={`${classes.severityChip} ${getSeverityClass(vuln.severity)}`}
                      />
                    </Box>
                    <Typography variant="body2" paragraph>
                      {vuln.description}
                    </Typography>
                    <Box display="flex" justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        className={classes.actionButton}
                        startIcon={<InfoIcon />}
                      >
                        View Patch
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        className={classes.actionButton}
                        startIcon={<CheckIcon />}
                      >
                        Mark Resolved
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className={classes.dashboardContainer}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <SecurityIcon style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Security Dashboard
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SettingsIcon />}
        >
          Security Settings
        </Button>
      </Box>

      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        aria-label="security dashboard tabs"
      >
        <Tab icon={<InfoIcon />} label="Overview" />
        <Tab icon={<ReportIcon />} label="Incidents" />
        <Tab icon={<BugIcon />} label="Vulnerabilities" />
      </Tabs>

      <Box className={classes.tabPanel} mt={3}>
        {tabValue === 0 && renderOverviewTab()}
        {tabValue === 1 && renderIncidentsTab()}
        {tabValue === 2 && renderVulnerabilitiesTab()}
      </Box>

      {selectedIncident && (
        <Dialog
          open={incidentDialogOpen}
          onClose={() => setIncidentDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Grid container spacing={2}>
              <Grid xs>Incident #{selectedIncident.id}</Grid>
              <Grid item>
                <Chip
                  size="small"
                  label={selectedIncident.severity}
                  className={`${classes.severityChip} ${getSeverityClass(selectedIncident.severity)}`}
                />
              </Grid>
            </Grid>
          </DialogTitle>
          <DialogContent>
            <Typography variant="h6">{selectedIncident.description}</Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Reported at: {formatTimestamp(selectedIncident.timestamp)}
            </Typography>

            <Typography variant="subtitle1" gutterBottom>
              Incident Timeline:
            </Typography>
            <List>
              {selectedIncident.events && selectedIncident.events.map((event, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={event.action}
                    secondary={`${formatTimestamp(event.timestamp)} - ${event.user || 'System'}`}
                  />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIncidentDialogOpen(false)}>
              Close
            </Button>
            {selectedIncident.status === 'open' && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  handleIncidentAction(selectedIncident.id, 'resolve');
                  setIncidentDialogOpen(false);
                }}
              >
                Mark Resolved
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default SecurityDashboard;
