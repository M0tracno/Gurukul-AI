import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { Button, Typography, Container } from '@mui/material';
import { Home as HomeIcon, Error as ErrorIcon } from '@mui/icons-material';

const Root = styled('div')(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(2),
  background: '#f5f5f5',
  textAlign: 'center',
}));

const IconStyled = styled(ErrorIcon)(({ theme }) => ({
  fontSize: 80,
  color: theme.palette.error.main,
  marginBottom: theme.spacing(2),
}));

const TitleStyled = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
}));

const SubtitleStyled = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  color: theme.palette.text.secondary,
}));

const ButtonStyled = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

const NotFound = () => {
  return (
    <Root>
      <Container maxWidth="md">
        <IconStyled />
        <TitleStyled variant="h3" component="h1">
          404: Page Not Found
        </TitleStyled>
        <SubtitleStyled variant="h6">
          Sorry, we could not find the page you are looking for.
        </SubtitleStyled>
        <ButtonStyled
          variant="contained"
          color="primary"
          size="large"
          component={RouterLink}
          to="/"
        >
          Return to Home
        </ButtonStyled>
      </Container>
    </Root>
  );
};

export default NotFound;
