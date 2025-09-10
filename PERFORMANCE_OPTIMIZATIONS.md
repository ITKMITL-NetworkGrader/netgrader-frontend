# Performance Optimizations for Submission Polling

## Current Issue
With 100 students polling every 2-3 seconds, the backend could face significant performance issues:
- 100 students × 3-second polling = **33 requests per second**
- 100 students × 2-second polling = **50 requests per second**

## Frontend Optimizations

### 1. Increase Polling Interval
```javascript
// Instead of 3 seconds, use 5-10 seconds for less frequent polling
}, 5000) // Poll every 5 seconds
```

### 2. Exponential Backoff
```javascript
let pollingInterval = 3000 // Start at 3 seconds
const maxInterval = 15000 // Max 15 seconds

state.pollingInterval = setInterval(async () => {
  const submission = await fetchSubmission(jobId)
  
  if (submission?.status === 'running') {
    // Keep current interval for active grading
    pollingInterval = 3000
  } else {
    // Increase interval for pending/completed states
    pollingInterval = Math.min(pollingInterval * 1.5, maxInterval)
  }
  
  // Restart with new interval
  clearInterval(state.pollingInterval)
  setTimeout(() => startPolling(jobId, labId, partId), pollingInterval)
}, pollingInterval)
```

### 3. Page Visibility API (Only poll when tab is active)
```javascript
if (document.hidden) {
  // Don't poll when tab is not visible
  return
}

// Add event listeners for page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause polling when tab is hidden
    stopPolling(labId, partId)
  } else {
    // Resume polling when tab becomes visible
    if (state.lastSubmissionJobId) {
      startPolling(state.lastSubmissionJobId, labId, partId)
    }
  }
})
```

### 4. Smart Polling Based on Status
```javascript
const getPollingInterval = (status: string) => {
  switch (status) {
    case 'pending': return 5000   // 5 seconds for queue
    case 'running': return 2000   // 2 seconds for active grading
    case 'completed':
    case 'failed':
    case 'cancelled': return 0    // Stop polling
    default: return 3000          // Default 3 seconds
  }
}
```

### 5. Request Batching/Debouncing
```javascript
// Batch multiple requests if user switches between parts quickly
const debouncedFetch = debounce(fetchSubmission, 1000)
```

## Backend Optimizations

### 1. Caching Layer
- **Redis Cache**: Store submission status in Redis for faster access
- **Cache TTL**: Set appropriate expiration times for different statuses
- **Cache Invalidation**: Update cache when status changes

### 2. Database Optimizations
- **Indexing**: Add indexes on `jobId`, `studentId`, and `status` fields
- **Connection Pooling**: Use database connection pooling
- **Query Optimization**: Optimize submission status queries

### 3. Rate Limiting
```javascript
// Implement rate limiting per user/IP
const rateLimit = {
  windowMs: 60000, // 1 minute
  maxRequests: 30, // Max 30 requests per minute per user
}
```

### 4. API Response Optimization
```javascript
// Return only necessary fields for polling
{
  "status": "running",
  "progress": {
    "percentage": 75,
    "message": "Running test 3 of 4"
  }
  // Don't return full submission data unless requested
}
```

## Better Long-term Solutions

### 1. WebSocket Implementation
Replace polling with real-time WebSocket connections:

```javascript
// Frontend WebSocket client
const ws = new WebSocket(`ws://backend/submissions/${jobId}`)
ws.onmessage = (event) => {
  const update = JSON.parse(event.data)
  updateSubmissionStatus(update)
}
```

### 2. Server-Sent Events (SSE)
```javascript
// Frontend SSE client
const eventSource = new EventSource(`/api/submissions/${jobId}/stream`)
eventSource.onmessage = (event) => {
  const update = JSON.parse(event.data)
  updateSubmissionStatus(update)
}
```

### 3. Push Notifications
Use service workers for background updates even when tab is closed.

## Implementation Priority

### Phase 1: Quick Wins
1. Increase polling interval to 5 seconds
2. Add page visibility API to pause polling on hidden tabs
3. Implement exponential backoff for completed submissions

### Phase 2: Backend Optimizations
1. Add Redis caching for submission status
2. Implement rate limiting
3. Add database indexes

### Phase 3: Real-time Solutions
1. Implement WebSocket connections
2. Add fallback to polling for WebSocket failures
3. Service worker integration for offline support

## Monitoring and Metrics

### Key Metrics to Track:
- API response times for submission endpoints
- Database query performance
- Number of concurrent polling connections
- Cache hit/miss ratios
- WebSocket connection stability

### Alerting:
- Alert when API response time > 500ms
- Alert when polling requests > 100/second
- Alert when database connections > 80% of pool

## Testing Strategy

### Load Testing:
- Simulate 100+ concurrent users polling
- Test with various submission statuses
- Measure backend response times under load

### Performance Testing:
- Compare polling vs WebSocket performance
- Test cache effectiveness
- Measure database query performance