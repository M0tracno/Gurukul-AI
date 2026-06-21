# Frontend Wiring Integration Tests

This test suite validates that the frontend service layer correctly calls the real backend endpoints as specified in the Communication-Feedback-and-Admin-APIs spec.

## Test Coverage

### Task 13.4: Admin User Management
- ✅ Fetches parents from `/api/parents` 
- ✅ Unwraps success envelope correctly
- ✅ Does not expose password fields
- ✅ Handles partial failure gracefully
- ✅ Returns empty collection when no users exist

### Task 13.1: Faculty Communication
- ✅ Fetches conversations from `/api/messages/conversations`
- ✅ Fetches thread from `/api/messages/conversations/:conversationId`
- ✅ Sends messages to POST `/api/messages` (no client-supplied senderId)
- ✅ Marks messages as read via PATCH `/api/messages/:messageId/read`
- ✅ Deletes messages via DELETE `/api/messages/:messageId`
- ✅ Handles errors gracefully
- ✅ Returns empty collection when no conversations exist

### Task 13.2: Faculty Feedback
- ✅ Fetches received feedback from `/api/feedback/received`
- ✅ Unwraps envelope with stats (total, positive, needsAttention, averageRating)
- ✅ Derives target scope from auth token (no targetId in query)
- ✅ Returns stats with zero values when no feedback exists
- ✅ Handles errors gracefully

### Task 13.3: Student Feedback
- ✅ Submits feedback to POST `/api/feedback` (no client-supplied authorId)
- ✅ Validates rating is within range
- ✅ Handles submission errors gracefully

### Task 13.5: Faculty Quiz Analytics
- ✅ Fetches analytics from `/api/faculty/me/quiz-analytics`
- ✅ Unwraps envelope correctly
- ✅ Derives faculty scope from auth token (no teacherId in URL)
- ✅ Handles zero attempts gracefully
- ✅ Omits `completionRatePercent` when not available (per Req 11.8)
- ✅ Handles errors gracefully

### Cross-Cutting Concerns
- ✅ All endpoints return success envelope `{ success: true, data, meta? }`
- ✅ All endpoints return failure envelope `{ success: false, message }` on error
- ⚠️  Error messages currently expose internal details (documented for future enhancement)

## Known Issues

### Error Sanitization
The current implementation exposes internal error details (MongoDB errors, stack traces, file paths) directly to users. This is documented in the tests with NOTE comments:

```typescript
// NOTE: Current implementation exposes error.message directly
// Future enhancement: sanitize internal error details before exposing to user
```

This affects:
- `messagingService.getConversations()` - exposes fetch errors
- `feedbackService.getReceivedFeedback()` - exposes database errors
- `feedbackService.submitFeedback()` - exposes validation/database errors
- `facultyService.getQuizAnalytics()` - exposes aggregation errors

**Recommendation**: Add an error sanitization layer in the service methods that maps technical errors to user-friendly messages before returning them to the UI.

## Running the Tests

```bash
npm test -- src/services/__tests__/frontend-wiring.test.ts
```

## Test Results

```
 Test Files  1 passed (1)
      Tests  26 passed (26)
   Duration  ~2s
```

All tests pass. The tests verify that:
1. Services call the correct endpoints
2. Envelopes are unwrapped correctly
3. Scope is always derived from auth token (never from client input)
4. Empty responses are handled gracefully
5. Success and failure envelopes follow the standard format
