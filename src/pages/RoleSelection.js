import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Container,
  Grid,
  Link,
  Typography,
  useTheme
} from '@mui/material';
import makeStyles from '../utils/makeStylesCompat';
import { useAuth } from '../auth/AuthContext';
import { APP_NAME, ROLES, THEME_CONSTANTS } from '../constants/appConstants';
import {
  School as StudentIcon,
  Person as FacultyIcon,
  People as ParentIcon,
  SupervisorAccount as AdminIcon
} from '@mui/icons-material';

// Enhanced styling for the RoleSelection page
const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: theme.spacing(3),
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#f5f7fb',
    backgroundImage: theme.palette.mode === 'dark' ? 'radial-gradient(circle at 50% 14em, #313264 0%, #00023b 60%, #00023b 100%)' : 'radial-gradient(circle at 50% 14em, #f0f4ff 0%, #f5f7fb 60%, #ffffff 100%)',
  },
  header: {
    textAlign: 'center',
    marginBottom: theme.spacing(6),
  },
  appTitle: {
    fontWeight: 800,
    letterSpacing: '0.025em',
    marginBottom: theme.spacing(1),
    color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a237e',
    backgroundClip: 'text',
    backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    textShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
    display: 'inline-block',
    padding: '0.2em 0',
    animation: '$titleGlow 8s ease-in-out infinite alternate',
  },
  '@keyframes titleGlow': {
    '0%': {
      textShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
    },
    '50%': {
      textShadow: '0 4px 24px rgba(102, 126, 234, 0.6)',
    },
    '100%': {
      textShadow: '0 4px 16px rgba(118, 75, 162, 0.45)',
    },
  },
  subtitle: {
    marginBottom: theme.spacing(3),
    color: theme.palette.mode === 'dark' ? '#c0c6e8' : '#424242',
    fontWeight: 500,
  },  cardGrid: {
    marginTop: theme.spacing(4),
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: theme.spacing(3),
    [theme.breakpoints.down('lg')]: {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    [theme.breakpoints.down('sm')]: {
      gridTemplateColumns: '1fr',
    },
  },card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    '&:hover': {
      transform: 'translateY(-6px)',
      boxShadow: '0 12px 20px -10px rgba(0, 0, 0, 0.2)',
    },
  },  cardMediaWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(3),
    backgroundSize: 'cover',
    height: '100px',
    borderRadius: '4px 4px 0 0',
  },
  studentCardMedia: {
    backgroundImage: THEME_CONSTANTS.GRADIENTS.STUDENT,
  },
  facultyCardMedia: {
    backgroundImage: THEME_CONSTANTS.GRADIENTS.FACULTY,
  },
  parentCardMedia: {
    backgroundImage: THEME_CONSTANTS.GRADIENTS.PARENT,
  },
  adminCardMedia: {
    backgroundImage: THEME_CONSTANTS.GRADIENTS.ADMIN,
  },
  iconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: '50%',
    padding: theme.spacing(1.5),
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  cardIcon: {
    fontSize: '2.5rem',
    color: '#424242',
  },  cardContent: {
    flexGrow: 1,
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '120px',
  },
  cardTitle: {
    fontWeight: 700,
    marginBottom: theme.spacing(1),
  },
  cardDescription: {
    fontSize: '0.95rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
  },  cardActions: {
    padding: theme.spacing(1.5, 2),
    borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
    display: 'flex',
    alignItems: 'center',
  },
  loginButton: {
    width: '100%',
    fontWeight: 700,
  },
  featureContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 2),
  },
  featureDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    marginRight: theme.spacing(1),
    boxShadow: '0 0 10px 2px rgba(255,255,255,0.7)',
  },
  aiDot: {
    backgroundColor: '#3a86ff',
    boxShadow: '0 0 10px 2px rgba(58,134,255,0.7)',
  },
  analyticsDot: {
    backgroundColor: '#8338ec',
    boxShadow: '0 0 10px 2px rgba(131,56,236,0.7)',
  },
  assessmentDot: {
    backgroundColor: '#f72585',
    boxShadow: '0 0 10px 2px rgba(247,37,133,0.7)',
  },
  featureText: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: theme.palette.mode === 'dark' ? '#c0c6e8' : '#424242',
  },
  footer: {
    marginTop: theme.spacing(3),
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.8rem',
    color: theme.palette.mode === 'dark' ? '#a0a0a0' : '#757575',
  },
  authorsSection: {
    textAlign: 'center',
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
    borderRadius: theme.shape.borderRadius,
  },
}));

// Enhanced role data with updated descriptions
const roleData = [  {
    id: ROLES.STUDENT,
    title: ROLES.STUDENT_DISPLAY,
    description: 'Access courses, track progress, and engage with AI-powered learning materials on your educational journey.',
    icon: StudentIcon,
    path: '/student-login',
    mediaClass: 'studentCardMedia',
    color: THEME_CONSTANTS.ROLE_COLORS.STUDENT,
  },
  {
    id: ROLES.FACULTY,
    title: ROLES.FACULTY_DISPLAY,
    description: 'Create courses, grade assignments, and guide students on their learning journey with advanced teaching tools.',
    icon: FacultyIcon,
    path: '/faculty-login',
    mediaClass: 'facultyCardMedia',
    color: THEME_CONSTANTS.ROLE_COLORS.FACULTY,
  },
  {
    id: ROLES.PARENT,
    title: ROLES.PARENT_DISPLAY,
    description: 'Monitor your child\'s academic progress and communicate directly with teachers in a collaborative environment.',
    icon: ParentIcon,
    path: '/parent-login',
    mediaClass: 'parentCardMedia',
    color: THEME_CONSTANTS.ROLE_COLORS.PARENT,
  },
  {
    id: ROLES.ADMIN,
    title: ROLES.ADMIN_DISPLAY,
    description: 'Manage users, oversee course creation, and configure system settings with complete administrative control.',
    icon: AdminIcon,
    path: '/admin-login',
    mediaClass: 'adminCardMedia',
    color: THEME_CONSTANTS.ROLE_COLORS.ADMIN,
  },
];

// Feature highlights removed as requested

function RoleSelection() {
  const classes = useStyles();
  const navigate = useNavigate();
  const theme = useTheme();
  const { setUserRole } = useAuth();

  // Handle role selection and navigation
  const handleRoleSelect = (roleId, path) => {
    // Save selected role if available, otherwise just navigate
    if (setUserRole) {
      setUserRole(roleId);
    } else {
      console.log('Setting user role function not available, navigating directly');
    }
    navigate(path);
  };

  return (
    <Box className={classes.root}>
      <Container maxWidth="lg">
        {/* Header Section with App Title and Subtitle */}
        <Box className={classes.header}>
          <Typography variant="h2" component="h1" className={classes.appTitle}>
            {APP_NAME}
          </Typography>
          <Typography variant="h6" className={classes.subtitle}>
            Ancient Wisdom • Modern Technology • Personalized Learning
          </Typography>          {/* Feature Highlights section removed */}
        </Box>        {/* Role Selection Cards - Vertically Aligned Grid */}
        <Box className={classes.cardGrid}>
          {roleData.map((role) => (
            <Card key={role.id} className={classes.card} raised elevation={3}>
              <Box className={`${classes.cardMediaWrapper} ${classes[role.mediaClass]}`}>
                <Box className={classes.iconWrapper}>
                  <role.icon className={classes.cardIcon} style={{ color: role.color }} />
                </Box>
              </Box>
              <CardContent className={classes.cardContent}>
                <Typography variant="h6" className={classes.cardTitle}>
                  {role.title}
                </Typography>
                <Typography className={classes.cardDescription}>
                  {role.description}
                </Typography>
              </CardContent>
              <CardActions className={classes.cardActions}>
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.loginButton}
                  onClick={() => handleRoleSelect(role.id, role.path)}
                  style={{ backgroundColor: role.color }}
                  fullWidth
                >
                  Login as {role.title}
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>        {/* Authors Section */}
        <Box className={classes.authorsSection} sx={{ textAlign: 'center', mt: 4, mb: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            Developed by:
            <Link href="https://www.linkedin.com/in/ayushman-nanda-4a1377312/" target="_blank" rel="noopener" sx={{ ml: 1 }}>
              Ayushman Nanda
            </Link>
          </Typography>
        </Box>

        {/* Footer */}
        <Box className={classes.footer}>
          <Typography className={classes.footerText}>
            © {new Date().getFullYear()} {APP_NAME} • All Rights Reserved
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default RoleSelection;

