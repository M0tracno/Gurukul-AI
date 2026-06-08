import React, { useState, useEffect } from 'react';
import { Refresh, Schedule as ScheduleIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import makeStyles from '../../utils/makeStylesCompat';
import { getContentRecommendations } from '../../services/advancedAIService';

import { Box, Button, Card, CardContent, CardMedia, Chip, CircularProgress, Grid, IconButton, Paper, Tooltip, Typography, toLocaleString } from '@mui/material';
const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    borderRadius: 16,
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'},
  title: {
    marginBottom: theme.spacing(1),
    fontWeight: 600,
    position: 'relative',
    display: 'inline-block',
    '&:after': {
      content: '""',
      position: 'absolute',
      bottom: -8,
      left: 0,
      width: 60,
      height: 4,
      background: theme.palette.primary.main,
      borderRadius: 2}},
  subtitle: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(3)},
  sectionTitle: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(2),
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center'},
  resourceCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    borderRadius: 12,
    overflow: 'hidden',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)'}},
  cardMedia: {
    height: 140,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    position: 'relative'},
  videoMedia: {
    background: 'linear-gradient(135deg, #3a86ff 0%, #4361ee 100%)'},
  readingMedia: {
    background: 'linear-gradient(135deg, #8338ec 0%, #5e60ce 100%)'},
  audioMedia: {
    background: 'linear-gradient(135deg, #ff006e 0%, #fb5607 100%)'},
  interactiveMedia: {
    background: 'linear-gradient(135deg, #06d6a0 0%, #1b9aaa 100%)'},
  mediaIcon: {
    fontSize: 60,
    opacity: 0.8},
  cardContent: {
    flexGrow: 1,
    padding: theme.spacing(2)},
  resourceTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(1)},
  resourceMeta: {
    display: 'flex',
    alignItems: 'center',
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
    marginBottom: theme.spacing(1)},
  resourceReason: {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1),
    fontStyle: 'italic'},
  relevanceChip: {
    marginLeft: 'auto',
    height: 24,
    fontWeight: 600},
  peerCard: {
    padding: theme.spacing(2),
    borderRadius: 12,
    marginBottom: theme.spacing(2),
    background: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.9)',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'}},
  peerHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1)},
  peerIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main},
  peerTitle: {
    fontWeight: 600},
  peerMeta: {
    display: 'flex',
    alignItems: 'center',
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
    marginTop: theme.spacing(1)},
  peerMetaItem: {
    display: 'flex',
    alignItems: 'center',
    marginRight: theme.spacing(2)},
  peerMetaIcon: {
    fontSize: 16,
    marginRight: theme.spacing(0.5)},
  refreshButton: {
    marginLeft: theme.spacing(1),
    color: theme.palette.primary.main},
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4)},
  bookmarkButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    color: 'white',
    background: 'rgba(0, 0, 0, 0.3)',
    '&:hover': {
      background: 'rgba(0, 0, 0, 0.5)'}}}));

const PersonalizedRecommendations = ({ studentId, currentTopic }) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState(null);

  useEffect(() => {
    // Simulate loading recommendations
    setLoading(true);

    setTimeout(() => {
      const data = getContentRecommendations(studentId, currentTopic);
      setRecommendations(data);
      setLoading(false);
    }, 1200);
  }, [studentId, currentTopic]);

  const handleRefresh = () => {
  const theme = useTheme();
    setLoading(true);
    setTimeout(() => {
      const data = getContentRecommendations(studentId, currentTopic);
      setRecommendations(data);
      setLoading(false);
    }, 1200);
  };

  const getMediaClass = (type) => {
    switch (type) {
      case 'video': return classes.videoMedia;
      case 'article': return classes.readingMedia;
      case 'audio': return classes.audioMedia;
      case 'interactive': return classes.interactiveMedia;
      default: return classes.videoMedia;
    }
  };

  const getMediaIcon = (type) => {
    switch (type) {
      case 'video': return <VideoIcon className={classes.mediaIcon} />;
      case 'article': return <ReadingIcon className={classes.mediaIcon} />;
      case 'audio': return <AudioIcon className={classes.mediaIcon} />;
      case 'interactive': return <InteractiveIcon className={classes.mediaIcon} />;
      default: return <VideoIcon className={classes.mediaIcon} />;
    }
  };

  const formatRelevanceScore = (score) => {
    return `${Math.round(score * 100)}%`;
  };

  const getRelevanceColor = (score) => {
    if (score >= 0.9) return '#06d6a0';
    if (score >= 0.8) return '#3a86ff';
    if (score >= 0.7) return '#ffbe0b';
    return '#ff006e';
  };

  if (loading) {
    return (
      <Paper className={classes.root}>
        <Typography variant="h5" className={classes.title}>
          Personalized Recommendations
        </Typography>
        <Typography variant="body2" className={classes.subtitle}>
          AI-powered content tailored to your learning style and progress
        </Typography>

        <Box className={classes.loadingContainer}>
          <CircularProgress color="primary" />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper className={classes.root}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <div>
          <Typography variant="h5" className={classes.title}>
            Personalized Recommendations
          </Typography>
          <Typography variant="body2" className={classes.subtitle}>
            AI-powered content tailored to your learning style and progress
          </Typography>
        </div>

        <Tooltip title="Refresh recommendations">
          <IconButton onClick={handleRefresh} className={classes.refreshButton}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="h6" className={classes.sectionTitle}>
        <VideoIcon style={{ marginRight: 8 }} /> Recommended Learning Resources
      </Typography>

      <Grid container spacing={3}>
        {recommendations?.recommendedResources.map((resource) => (
          <Grid size={{xs:12,sm:6,md:4}} key={resource.id}>
            <Card className={classes.resourceCard}>
              <CardActionArea>
                <CardMedia
                  className={`${classes.cardMedia} ${getMediaClass(resource.type)}`}
                >
                  {getMediaIcon(resource.type)}
                  <Tooltip title="Bookmark for later">
                    <IconButton className={classes.bookmarkButton}>
                      <BookmarkIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardMedia>

                <CardContent className={classes.cardContent}>
                  <Typography variant="h6" className={classes.resourceTitle}>
                    {resource.title}
                  </Typography>

                  <Box className={classes.resourceMeta}>
                    <Typography variant="body2">
                      {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)} • {resource.duration}
                    </Typography>

                    <Chip
                      label={formatRelevanceScore(resource.relevanceScore)}
                      className={classes.relevanceChip}
                      size="small"
                      style={{ backgroundColor: getRelevanceColor(resource.relevanceScore), color: 'white' }}
                    />
                  </Box>

                  <Typography className={classes.resourceReason}>
                    "{resource.reason}"
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" className={classes.sectionTitle}>
        <GroupIcon style={{ marginRight: 8 }} /> Peer Learning Opportunities
      </Typography>

      {recommendations?.peerLearningOpportunities.map((opportunity, index) => (
        <Paper key={index} className={classes.peerCard}>
          <Box className={classes.peerHeader}>
            {opportunity.type === 'study group' ?
              <GroupIcon className={classes.peerIcon} /> :
              <TutorIcon className={classes.peerIcon} />
            }
            <Typography variant="h6" className={classes.peerTitle}>
              {opportunity.topic}
            </Typography>

            <Chip
              label={`${Math.round(opportunity.matchScore * 100)}% match`}
              className={classes.relevanceChip}
              size="small"
              style={{
                backgroundColor: getRelevanceColor(opportunity.matchScore),
                color: 'white'
              }}
            />
          </Box>

          <Box className={classes.peerMeta}>
            {opportunity.type === 'study group' && (
              <Box className={classes.peerMetaItem}>
                <GroupIcon className={classes.peerMetaIcon} />
                <Typography variant="body2">
                  {opportunity.participants} participants
                </Typography>
              </Box>
            )}

            {opportunity.type === 'peer tutoring' && (
              <Box className={classes.peerMetaItem}>
                <TutorIcon className={classes.peerMetaIcon} />
                <Typography variant="body2">
                  Tutor: {opportunity.tutor}
                </Typography>
              </Box>
            )}

            <Box className={classes.peerMetaItem}>
              <ScheduleIcon className={classes.peerMetaIcon} />
              <Typography variant="body2">
                {new Date(opportunity.scheduledFor).toLocaleString()}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              style={{ marginRight: 8 }}
            >
              Learn More
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
            >
              Join Now
            </Button>
          </Box>
        </Paper>
      ))}
    </Paper>
  );
};

export default PersonalizedRecommendations;
