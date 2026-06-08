import React from 'react';
import { AdminPanelSettings, Brightness4, People, PeopleIcon, Person, Person as PersonIcon, Psychology, School, SchoolIcon, Security, Speed } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import LinkBehavior from '../components/common/LinkBehavior';

import { Badge, Container, Grid, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
// Import enhanced login styles
  roleThemes
} from '../styles/EnhancedLoginStyles';

// Enhanced role-specific button styles
const EnhancedRoleButton = styled(Button)(({ theme, role }) => {
  const theme = useTheme();
  const originalTheme = useTheme();
  const colors = roleThemes[role] || roleThemes.student;

  return {
    padding: theme.spacing(3),
    height: '200px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.spacing(2),
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    border: `2px solid transparent`,
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    overflow: 'hidden',
    textTransform: 'none',
    '&:hover': {
      transform: 'translateY(-8px) scale(1.02)',
      boxShadow: `0 20px 40px ${colors.primary}30`,
      border: `2px solid ${colors.primary}50`,
      background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
      '& .role-icon': {
        color: colors.primary,
        transform: 'scale(1.1)'}},
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
      opacity: 0,
      transition: 'opacity 0.3s ease'},
    '&:hover::before': {
      opacity: 1}};
});

const RoleIcon = styled('div')(({ theme }) => ({
  fontSize: 72,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.secondary,
  transition: 'all 0.3s ease',
  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'}));

const RoleTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '1.2rem',
  color: theme.palette.text.primary,
  transition: 'color 0.3s ease'}));

const RoleDescription = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(1),
  fontSize: '0.8rem',
  color: theme.palette.text.secondary,
  textAlign: 'center'}));

const FeatureSection = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(6),
  padding: theme.spacing(4, 0),
  borderTop: '1px solid rgba(255, 255, 255, 0.2)'}));

const FeatureGrid = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(3)}));

const FeatureItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(2),
  borderRadius: theme.spacing(1),
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(5px)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    background: 'rgba(255, 255, 255, 0.2)'}}));

const FeatureIcon = styled('div')(({ theme }) => ({
  fontSize: 40,
  marginBottom: theme.spacing(1),
  color: 'rgba(255, 255, 255, 0.8)'}));

const FeatureText = styled(Typography)(({ theme }) => ({
  fontSize: '0.9rem',
  fontWeight: 500,
  color: 'rgba(255, 255, 255, 0.9)',
  textAlign: 'center'}));

const Footer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(4),
  textAlign: 'center',
  padding: theme.spacing(3, 0),
  borderTop: '1px solid rgba(255, 255, 255, 0.1)'}));

const FooterText = styled(Typography)(({ theme }) => ({
  color: 'rgba(255, 255, 255, 0.7)',
  fontSize: '0.9rem',
  marginBottom: theme.spacing(2)}));

const Badge = styled(Box)(({ theme }) => ({
  display: 'inline-block',
  padding: theme.spacing(1, 2),
  background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
  borderRadius: '20px',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)'}));
function Login() {
  return (
    <EnhancedBackground role="admin">
      <Container maxWidth="lg">
        <EnhancedLoginPaper role="admin">
          <EnhancedTitle role="admin">
            Education Management System
          </EnhancedTitle>
          <EnhancedSubtitle>
            Choose your role to access the platform
          </EnhancedSubtitle>

          <Grid container spacing={4}>
            <Grid size={{xs:12,sm:6,md:3}}>
              <EnhancedRoleButton
                component={LinkBehavior}
                to="/faculty-login"
                variant="outlined"
                fullWidth
                role="faculty"
              >
                <RoleIcon className="role-icon">
                  <SchoolIcon fontSize="inherit" />
                </RoleIcon>
                <RoleTitle>Faculty</RoleTitle>
                <RoleDescription>
                  Manage courses & students
                </RoleDescription>
              </EnhancedRoleButton>
            </Grid>

            <Grid size={{xs:12,sm:6,md:3}}>
              <EnhancedRoleButton
                component={LinkBehavior}
                to="/student-login"
                variant="outlined"
                fullWidth
                role="student"
              >
                <RoleIcon className="role-icon">
                  <PersonIcon fontSize="inherit" />
                </RoleIcon>
                <RoleTitle>Student</RoleTitle>
                <RoleDescription>
                  Access courses & grades
                </RoleDescription>
              </EnhancedRoleButton>
            </Grid>

            <Grid size={{xs:12,sm:6,md:3}}>
              <EnhancedRoleButton
                component={LinkBehavior}
                to="/parent-login"
                variant="outlined"
                fullWidth
                role="parent"
              >
                <RoleIcon className="role-icon">
                  <PeopleIcon fontSize="inherit" />
                </RoleIcon>
                <RoleTitle>Parent</RoleTitle>
                <RoleDescription>
                  Monitor child's progress
                </RoleDescription>
              </EnhancedRoleButton>
            </Grid>

            <Grid size={{xs:12,sm:6,md:3}}>
              <EnhancedRoleButton
                component={LinkBehavior}
                to="/admin-login"
                variant="outlined"
                fullWidth
                role="admin"
              >
                <RoleIcon className="role-icon">
                  <AdminIcon fontSize="inherit" />
                </RoleIcon>
                <RoleTitle>Admin</RoleTitle>
                <RoleDescription>
                  System administration
                </RoleDescription>
              </EnhancedRoleButton>
            </Grid>
          </Grid>

          <FeatureSection>
            <Typography variant="h6" align="center" gutterBottom sx={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
              Platform Features
            </Typography>
            <FeatureGrid container spacing={2}>
              <Grid size={{xs:12,sm:3}}>
                <FeatureItem>
                  <FeatureIcon>
                    <Psychology fontSize="inherit" />
                  </FeatureIcon>
                  <FeatureText>AI-Powered</FeatureText>
                </FeatureItem>
              </Grid>
              <Grid size={{xs:12,sm:3}}>
                <FeatureItem>
                  <FeatureIcon>
                    <Security fontSize="inherit" />
                  </FeatureIcon>
                  <FeatureText>Secure</FeatureText>
                </FeatureItem>
              </Grid>
              <Grid size={{xs:12,sm:3}}>
                <FeatureItem>
                  <FeatureIcon>
                    <Speed fontSize="inherit" />
                  </FeatureIcon>
                  <FeatureText>Fast</FeatureText>
                </FeatureItem>
              </Grid>
              <Grid size={{xs:12,sm:3}}>
                <FeatureItem>
                  <FeatureIcon>
                    <Brightness4 fontSize="inherit" />
                  </FeatureIcon>
                  <FeatureText>Modern</FeatureText>
                </FeatureItem>
              </Grid>
            </FeatureGrid>
          </FeatureSection>

          <Footer>
            <FooterText>
              Comprehensive education management platform with AI-powered insights
            </FooterText>
            <Badge>
              ✨ Enhanced Learning Experience
            </Badge>
          </Footer>
        </EnhancedLoginPaper>
      </Container>
    </EnhancedBackground>
  );
}

export default Login;