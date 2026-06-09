/**
 * Grading Override Panel Component
 *
 * Lists graded submissions that the admin is authorized to override,
 * and presents override controls for each graded answer. On success,
 * displays the updated record; on failure, shows the Error_Envelope message.
 *
 * Requirements: 11.2, 11.3, 11.4
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { FrostedCard } from '@/components/common/FrostedCard';
import { colors } from '@/styles/designTokens';
import { apiClient } from '@/features/shared/services/apiClient';
import { ApiClientError, type OverrideResult } from '../services/adminApiService';
import { OverrideControls } from './OverrideControls';

// Types for fetched submission data
interface GradedAnswerData {
  questionId: string;
  score: number;
  maxScore: number;
  confidence?: number;
  feedback?: string;
  overriddenByTeacher: boolean;
}

interface SubmissionData {
  _id: string;
  assessmentId: string;
  studentId: string;
  submittedAt: string;
  gradingStatus: 'queued' | 'processing' | 'completed' | 'failed';
  gradedAnswers?: GradedAnswerData[];
  finalized: boolean;
}

// Envelope shape for submissions list
interface SubmissionsEnvelope {
  success: boolean;
  data: SubmissionData[];
}

/**
 * GradingOverridePanel — Fetches completed submissions and renders override controls
 * for each graded answer. Admins can override scores and feedback.
 */
export const GradingOverridePanel: React.FC = () => {
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      // Fetch completed submissions that can be overridden (not yet finalized)
      const envelope = await apiClient<SubmissionsEnvelope>(
        '/api/v1/grading/submissions',
        { params: { status: 'completed', finalized: 'false', limit: 20 } }
      );
      setSubmissions(envelope.data || []);
    } catch (err) {
      if (err instanceof ApiClientError) {
        // If endpoint doesn't exist yet, show an empty state gracefully
        if (err.statusCode === 404) {
          setSubmissions([]);
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load submissions for override.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleOverrideSuccess = (submissionId: string, result: OverrideResult) => {
    // Update the local state to reflect the override (Requirement 11.3)
    setSubmissions((prev) =>
      prev.map((sub) => {
        if (sub._id !== submissionId) return sub;
        return {
          ...sub,
          gradedAnswers: sub.gradedAnswers?.map((ga) =>
            ga.questionId === result.questionId
              ? { ...ga, score: result.score, feedback: result.feedback, overriddenByTeacher: true }
              : ga
          ),
        };
      })
    );
  };

  if (loading) {
    return (
      <FrostedCard glassLevel="medium" neonGlow neonColor="blue" animate>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress sx={{ color: colors.neon.blue }} />
        </Box>
      </FrostedCard>
    );
  }

  return (
    <FrostedCard glassLevel="medium" neonGlow neonColor="blue" animate>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon sx={{ color: colors.neon.blue }} />
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
            Grading Overrides
          </Typography>
        </Box>
        <Tooltip title="Refresh submissions">
          <IconButton onClick={loadSubmissions} size="small" sx={{ color: colors.neon.blue }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="body2" sx={{ color: colors.neutral[400], mb: 2 }}>
        Override AI-generated scores and feedback for completed submissions before finalization.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {submissions.length === 0 && !error && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" sx={{ color: colors.neutral[500] }}>
            No submissions available for override at this time.
          </Typography>
        </Box>
      )}

      {/* Submission list with expandable override controls */}
      {submissions.map((submission) => (
        <Accordion
          key={submission._id}
          sx={{
            mb: 1,
            background: `${colors.neutral[800]}60`,
            border: `1px solid ${colors.neutral[700]}40`,
            borderRadius: '8px !important',
            '&:before': { display: 'none' },
            '&.Mui-expanded': {
              margin: '0 0 8px 0',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: colors.neutral[400] }} />}
            sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 } }}
          >
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
              Submission {submission._id.slice(-8)}
            </Typography>
            <Chip
              label={submission.gradingStatus}
              size="small"
              sx={{
                fontSize: '0.65rem',
                color: submission.gradingStatus === 'completed' ? colors.semantic.success : colors.neutral[400],
                background: submission.gradingStatus === 'completed'
                  ? `${colors.semantic.success}15`
                  : `${colors.neutral[600]}40`,
              }}
            />
            {submission.gradedAnswers && (
              <Typography variant="caption" sx={{ color: colors.neutral[500] }}>
                {submission.gradedAnswers.length} answer(s)
              </Typography>
            )}
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {submission.gradedAnswers?.map((ga) => (
                <OverrideControls
                  key={ga.questionId}
                  submissionId={submission._id}
                  questionId={ga.questionId}
                  currentScore={ga.score}
                  maxScore={ga.maxScore}
                  currentFeedback={ga.feedback || ''}
                  alreadyOverridden={ga.overriddenByTeacher}
                  onOverrideSuccess={(result) =>
                    handleOverrideSuccess(submission._id, result)
                  }
                />
              ))}
              {(!submission.gradedAnswers || submission.gradedAnswers.length === 0) && (
                <Typography variant="body2" sx={{ color: colors.neutral[500] }}>
                  No graded answers available for this submission.
                </Typography>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </FrostedCard>
  );
};

export default GradingOverridePanel;
