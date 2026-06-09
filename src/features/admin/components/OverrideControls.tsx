/**
 * Override Controls Component
 *
 * Presents override controls for admin-authorized records. Allows the admin
 * to override graded answer scores/feedback and displays the updated record
 * on success, or the Error_Envelope message on failure.
 *
 * Requirements: 11.2, 11.3, 11.4
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';
import { Edit as EditIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import { colors } from '@/styles/designTokens';
import {
  submitGradeOverride,
  ApiClientError,
  type OverrideResult,
} from '../services/adminApiService';

export interface OverrideControlsProps {
  /** Submission ID to override */
  submissionId: string;
  /** Question ID within the submission */
  questionId: string;
  /** Current score (pre-override) */
  currentScore: number;
  /** Max possible score for this question */
  maxScore: number;
  /** Current feedback text */
  currentFeedback: string;
  /** Whether this answer was already overridden */
  alreadyOverridden: boolean;
  /** Callback fired when override succeeds with the updated record */
  onOverrideSuccess?: (result: OverrideResult) => void;
}

/**
 * OverrideControls — Renders editable score/feedback fields and a submit button.
 * On success, displays the updated record. On failure, shows the Error_Envelope message.
 */
export const OverrideControls: React.FC<OverrideControlsProps> = ({
  submissionId,
  questionId,
  currentScore,
  maxScore,
  currentFeedback,
  alreadyOverridden,
  onOverrideSuccess,
}) => {
  const [score, setScore] = useState<string>(String(currentScore));
  const [feedback, setFeedback] = useState<string>(currentFeedback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedRecord, setUpdatedRecord] = useState<OverrideResult | null>(null);

  const handleSubmitOverride = async () => {
    setError(null);
    setUpdatedRecord(null);

    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore < 0) {
      setError('Score must be a non-negative number.');
      return;
    }

    if (!feedback.trim()) {
      setError('Feedback is required.');
      return;
    }

    setLoading(true);
    try {
      const result = await submitGradeOverride({
        submissionId,
        questionId,
        score: numericScore,
        feedback: feedback.trim(),
      });

      setUpdatedRecord(result);
      onOverrideSuccess?.(result);
    } catch (err) {
      if (err instanceof ApiClientError) {
        // Display the Error_Envelope message (Requirement 11.4)
        setError(err.message);
      } else {
        setError('An unexpected error occurred while submitting the override.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${colors.neutral[700]}40`,
        background: `${colors.neutral[800]}30`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <EditIcon sx={{ color: colors.neon.cyan, fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 600 }}>
          Override Controls
        </Typography>
        {alreadyOverridden && (
          <Chip
            label="Previously Overridden"
            size="small"
            sx={{
              ml: 1,
              background: `${colors.neon.orange}20`,
              color: colors.neon.orange,
              fontSize: '0.7rem',
            }}
          />
        )}
      </Box>

      {/* Updated record display on success (Requirement 11.3) */}
      {updatedRecord && (
        <Alert
          severity="success"
          icon={<CheckIcon />}
          sx={{ mb: 2 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Override applied successfully
          </Typography>
          <Typography variant="caption" component="div">
            Score: {updatedRecord.score} | Feedback: {updatedRecord.feedback}
          </Typography>
        </Alert>
      )}

      {/* Error display (Requirement 11.4) */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Score"
          type="number"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          size="small"
          inputProps={{ min: 0, max: maxScore, step: 0.5 }}
          helperText={`Max: ${maxScore}`}
          disabled={loading}
          sx={{
            width: 120,
            '& .MuiInputBase-root': { color: 'white' },
            '& .MuiInputLabel-root': { color: colors.neutral[400] },
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: colors.neutral[600] },
              '&:hover fieldset': { borderColor: colors.neon.cyan },
              '&.Mui-focused fieldset': { borderColor: colors.neon.cyan },
            },
            '& .MuiFormHelperText-root': { color: colors.neutral[500] },
          }}
        />
        <TextField
          label="Feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          size="small"
          multiline
          minRows={1}
          maxRows={3}
          fullWidth
          disabled={loading}
          sx={{
            '& .MuiInputBase-root': { color: 'white' },
            '& .MuiInputLabel-root': { color: colors.neutral[400] },
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: colors.neutral[600] },
              '&:hover fieldset': { borderColor: colors.neon.cyan },
              '&.Mui-focused fieldset': { borderColor: colors.neon.cyan },
            },
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSubmitOverride}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <EditIcon />}
          sx={{
            background: `linear-gradient(135deg, ${colors.neon.cyan}, ${colors.neon.blue})`,
            '&:hover': {
              background: `linear-gradient(135deg, ${colors.neon.blue}, ${colors.neon.cyan})`,
            },
            '&.Mui-disabled': {
              opacity: 0.6,
            },
          }}
        >
          {loading ? 'Submitting…' : 'Submit Override'}
        </Button>
      </Box>
    </Box>
  );
};

export default OverrideControls;
