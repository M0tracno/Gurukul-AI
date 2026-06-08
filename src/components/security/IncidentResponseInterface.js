import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import { toLocaleString } from '@mui/material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Report as ReportIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Assignment as AssignIcon,
  Group as TeamIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Shield as SecurityIcon,
  Computer as ComputerIcon,
  NetworkCheck as NetworkIcon,
  Storage as StorageIcon,
  Fingerprint as FingerprintIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as CopyIcon,
  Share as ShareIcon,
  Lock as LockIcon,
  VpnKey as KeyIcon
} from '@mui/icons-material';

/**
 * Incident Response Interface
 *
 * Provides comprehensive incident management and response capabilities
 * with automated workflows, escalation procedures, and forensic tools
 */

const useStyles = makeStyles((theme) => ({
  container: {
    padding: theme.spacing(3),
  },
  incidentCard: {
    marginBottom: theme.spacing(2),
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: theme.shadows[8],
    },
  },
  criticalIncident: {
    borderLeft: `4px solid ${theme.palette.error.main}`,
  },
  highIncident: {
    borderLeft: `4px solid ${theme.palette.warning.main}`,
  },
  mediumIncident: {
    borderLeft: `4px solid ${theme.palette.info.main}`,
  },
  lowIncident: {
    borderLeft: `4px solid ${theme.palette.success.main}`,
  },
  playbookCard: {
    height: '100%',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[8],
    },
  },
  activePlaybook: {
    borderColor: theme.palette.primary.main,
    backgroundColor: `${theme.palette.primary.main}10`,
  },
  responseTeam: {
    display: 'flex',
    alignItems: 'center',
    margin: theme.spacing(1, 0),
  },
  teammateAvatar: {
    marginRight: theme.spacing(1),
    width: 32,
    height: 32,
  },
  statusChip: {
    fontWeight: 'bold',
    minWidth: 100,
  },
  severityChip: {
    fontWeight: 'bold',
    minWidth: 80,
  },
  evidenceCard: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },
  forensicTool: {
    padding: theme.spacing(2),
    textAlign: 'center',
    border: `2px dashed ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: theme.palette.primary.main,
      backgroundColor: `${theme.palette.primary.main}05`,
    },
  },
  communicationLog: {
    maxHeight: 300,
    overflow: 'auto',
    padding: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
  },
  messageItem: {
    padding: theme.spacing(1),
    marginBottom: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
  },
  timelineItem: {
    '& .MuiTimelineContent-root': {
      padding: theme.spacing(1, 2),
    },
  },
  escalationButton: {
    margin: theme.spacing(0.5),
  },
  quickAction: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  metricsCard: {
    textAlign: 'center',
    padding: theme.spacing(2),
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: theme.spacing(1),
  },
  criticalMetric: {
    color: theme.palette.error.main,
  },
  warningMetric: {
    color: theme.palette.warning.main,
  },
  successMetric: {
    color: theme.palette.success.main,
  },
  tabPanel: {
    paddingTop: theme.spacing(2),
  },
}));

const IncidentResponseInterface = () => {
  const theme = useTheme();
  const classes = useStyles();
  const [tabValue, setTabValue] = useState(0);
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [responsePlaybooks, setResponsePlaybooks] = useState([]);
  const [activePlaybook, setActivePlaybook] = useState(null);
  const [responseTeam, setResponseTeam] = useState([]);
  const [communicationLog, setCommunicationLog] = useState([]);
  const [forensicEvidence, setForensicEvidence] = useState([]);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [playbookDialogOpen, setPlaybookDialogOpen] = useState(false);
  const [escalationDialogOpen, setEscalationDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sample incident data
  useEffect(() => {
    loadIncidentData();
  }, []);

  const loadIncidentData = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API calls
      setIncidents([
        {
          id: 'INC-2024-001',
          title: 'Suspicious Login Activity Detected',
          description: 'Multiple failed login attempts from unknown IP addresses',
          severity: 'high',
          status: 'investigating',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          assignedTo: 'security-team',
          affectedSystems: ['authentication', 'user-database'],
          source: 'automated-detection'
        },
        {
          id: 'INC-2024-002',
          title: 'Potential Data Exfiltration',
          description: 'Unusual network traffic patterns detected',
          severity: 'critical',
          status: 'active',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          assignedTo: 'incident-response-team',
          affectedSystems: ['network', 'file-server'],
          source: 'network-monitoring'
        }
      ]);

      setResponsePlaybooks([
        {
          id: 'pb-data-breach',
          name: 'Data Breach Response',
          description: 'Comprehensive response for data security incidents',
          steps: 8,
          estimatedTime: '4-6 hours',
          category: 'data-security'
        },
        {
          id: 'pb-malware',
          name: 'Malware Incident Response',
          description: 'Detection and containment of malicious software',
          steps: 6,
          estimatedTime: '2-4 hours',
          category: 'malware'
        },
        {
          id: 'pb-ddos',
          name: 'DDoS Attack Response',
          description: 'Mitigation strategies for distributed denial of service attacks',
          steps: 5,
          estimatedTime: '1-2 hours',
          category: 'network-security'
        }
      ]);

      setResponseTeam([
        {
          id: 'team-lead',
          name: 'Alice Johnson',
          role: 'Incident Commander',
          status: 'active',
          contact: '+1-555-0101'
        },
        {
          id: 'security-analyst',
          name: 'Bob Smith',
          role: 'Security Analyst',
          status: 'active',
          contact: '+1-555-0102'
        },
        {
          id: 'forensic-expert',
          name: 'Carol Williams',
          role: 'Digital Forensics',
          status: 'on-call',
          contact: '+1-555-0103'
        }
      ]);

    } catch (error) {
      console.error('Error loading incident data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return classes.criticalIncident;
      case 'high': return classes.highIncident;
      case 'medium': return classes.mediumIncident;
      case 'low': return classes.lowIncident;
      default: return '';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved': return 'success';
      case 'investigating': return 'warning';
      case 'active': return 'error';
      case 'new': return 'info';
      default: return 'default';
    }
  };

  const handleIncidentSelect = (incident) => {
    setSelectedIncident(incident);
    setIncidentDialogOpen(true);
  };

  const handlePlaybookActivate = (playbook) => {
    setActivePlaybook(playbook);
    setPlaybookDialogOpen(true);
  };

  const handleEscalation = (level) => {
    // Implement escalation logic
    console.log('Escalating to level:', level);
  };

  const renderIncidentsTab = () => (
    <Grid container spacing={3}>
      <Grid size={{xs:12}}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Active Incidents</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setIncidentDialogOpen(true)}
          >
            Report Incident
          </Button>
        </Box>
      </Grid>

      {incidents.map((incident) => (
        <Grid size={{xs:12}} key={incident.id}>
          <Card className={`${classes.incidentCard} ${getSeverityClass(incident.severity)}`}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {incident.title}
                  </Typography>
                  <Typography color="textSecondary" paragraph>
                    {incident.description}
                  </Typography>
                  <Box display="flex" gap={1} mb={2}>
                    <Chip
                      label={incident.severity}
                      color={getSeverityColor(incident.severity)}
                      className={classes.severityChip}
                    />
                    <Chip
                      label={incident.status}
                      color={getStatusColor(incident.status)}
                      className={classes.statusChip}
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    ID: {incident.id} • Created: {new Date(incident.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<AssessmentIcon />}
                    onClick={() => handleIncidentSelect(incident)}
                    className={classes.quickAction}
                  >
                    Investigate
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<PlayIcon />}
                    className={classes.quickAction}
                  >
                    Start Response
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderPlaybooksTab = () => (
    <Grid container spacing={3}>
      <Grid size={{xs:12}}>
        <Typography variant="h6" gutterBottom>
          Response Playbooks
        </Typography>
      </Grid>

      {responsePlaybooks.map((playbook) => (
        <Grid size={{xs:12,md:4}} key={playbook.id}>
          <Card
            className={`${classes.playbookCard} ${activePlaybook?.id === playbook.id ? classes.activePlaybook : ''}`}
            onClick={() => handlePlaybookActivate(playbook)}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {playbook.name}
              </Typography>
              <Typography color="textSecondary" paragraph>
                {playbook.description}
              </Typography>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">
                  {playbook.steps} steps
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {playbook.estimatedTime}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderResponseTeamTab = () => (
    <Grid container spacing={3}>
      <Grid size={{xs:12}}>
        <Typography variant="h6" gutterBottom>
          Response Team
        </Typography>
      </Grid>

      <Grid size={{xs:12,md:6}}>
        <Card>
          <CardHeader title="Active Team Members" />
          <CardContent>
            {responseTeam.map((member) => (
              <Box key={member.id} className={classes.responseTeam}>
                <Avatar className={classes.teammateAvatar}>
                  {member.name.charAt(0)}
                </Avatar>
                <Box flex={1}>
                  <Typography fontWeight="bold">
                    {member.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {member.role}
                  </Typography>
                </Box>
                <Box>
                  <Chip
                    label={member.status}
                    color={member.status === 'active' ? 'success' : 'warning'}
                    size="small"
                  />
                  <IconButton size="small" color="primary">
                    <PhoneIcon />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{xs:12,md:6}}>
        <Card>
          <CardHeader title="Escalation Contacts" />
          <CardContent>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<PhoneIcon />}
              className={classes.escalationButton}
              onClick={() => setEscalationDialogOpen(true)}
            >
              Emergency Escalation
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<EmailIcon />}
              className={classes.escalationButton}
            >
              Notify Management
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<TeamIcon />}
              className={classes.escalationButton}
            >
              Request Additional Resources
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderForensicsTab = () => (
    <Grid container spacing={3}>
      <Grid size={{xs:12}}>
        <Typography variant="h6" gutterBottom>
          Digital Forensics & Evidence Collection
        </Typography>
      </Grid>

      <Grid size={{xs:12,md:6}}>
        <Card>
          <CardHeader title="Forensic Tools" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{xs:6}}>
                <Box className={classes.forensicTool}>
                  <ComputerIcon style={{ fontSize: 40, marginBottom: 8 }} />
                  <Typography variant="body2">
                    System Imaging
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{xs:6}}>
                <Box className={classes.forensicTool}>
                  <NetworkIcon style={{ fontSize: 40, marginBottom: 8 }} />
                  <Typography variant="body2">
                    Network Analysis
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{xs:6}}>
                <Box className={classes.forensicTool}>
                  <StorageIcon style={{ fontSize: 40, marginBottom: 8 }} />
                  <Typography variant="body2">
                    Data Recovery
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{xs:6}}>
                <Box className={classes.forensicTool}>
                  <FingerprintIcon style={{ fontSize: 40, marginBottom: 8 }} />
                  <Typography variant="body2">
                    Hash Analysis
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{xs:12,md:6}}>
        <Card>
          <CardHeader title="Evidence Collection" />
          <CardContent>
            {forensicEvidence.map((evidence, index) => (
              <Box key={index} className={classes.evidenceCard}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight="bold">
                      {evidence.type}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {evidence.description}
                    </Typography>
                  </Box>
                  <IconButton size="small">
                    <DownloadIcon />
                  </IconButton>
                </Box>
              </Box>
            ))}
            <Button
              variant="outlined"
              fullWidth
              startIcon={<UploadIcon />}
              style={{ marginTop: 16 }}
            >
              Upload Evidence
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box className={classes.container}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          <ReportIcon style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Incident Response Center
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadIncidentData}
            style={{ marginRight: 16 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<WarningIcon />}
          >
            Emergency Response
          </Button>
        </Box>
      </Box>

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="Incidents" />
        <Tab label="Playbooks" />
        <Tab label="Response Team" />
        <Tab label="Forensics" />
      </Tabs>

      <Box className={classes.tabPanel}>
        {tabValue === 0 && renderIncidentsTab()}
        {tabValue === 1 && renderPlaybooksTab()}
        {tabValue === 2 && renderResponseTeamTab()}
        {tabValue === 3 && renderForensicsTab()}
      </Box>

      {/* Incident Detail Dialog */}
      <Dialog
        open={incidentDialogOpen}
        onClose={() => setIncidentDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Incident Investigation - {selectedIncident?.id}
        </DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Grid container spacing={3}>
              <Grid size={{xs:12,md:6}}>
                <Typography variant="h6" gutterBottom>
                  Incident Details
                </Typography>
                <Typography><strong>Title:</strong> {selectedIncident.title}</Typography>
                <Typography><strong>Description:</strong> {selectedIncident.description}</Typography>
                <Typography><strong>Severity:</strong> {selectedIncident.severity}</Typography>
                <Typography><strong>Status:</strong> {selectedIncident.status}</Typography>
                <Typography><strong>Created:</strong> {new Date(selectedIncident.createdAt).toLocaleString()}</Typography>
              </Grid>
              <Grid size={{xs:12,md:6}}>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Button variant="outlined" fullWidth style={{ marginBottom: 8 }}>
                  Assign to Team Member
                </Button>
                <Button variant="outlined" fullWidth style={{ marginBottom: 8 }}>
                  Change Severity
                </Button>
                <Button variant="outlined" fullWidth style={{ marginBottom: 8 }}>
                  Add Notes
                </Button>
                <Button variant="contained" color="primary" fullWidth>
                  Start Investigation
                </Button>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIncidentDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Escalation Dialog */}
      <Dialog
        open={escalationDialogOpen}
        onClose={() => setEscalationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Emergency Escalation</DialogTitle>
        <DialogContent>
          <Alert severity="error" style={{ marginBottom: 16 }}>
            This will immediately notify all emergency contacts and activate crisis protocols.
          </Alert>
          <Typography gutterBottom>
            Select escalation level:
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Escalation Level</InputLabel>
            <Select>
              <MenuItem value="level1">Level 1 - Management Notification</MenuItem>
              <MenuItem value="level2">Level 2 - Executive Alert</MenuItem>
              <MenuItem value="level3">Level 3 - Crisis Team Activation</MenuItem>
              <MenuItem value="level4">Level 4 - External Authorities</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEscalationDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" color="error">
            Escalate Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IncidentResponseInterface;
