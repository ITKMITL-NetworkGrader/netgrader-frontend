# NetGrader Lab Management System - Backend Requirements

## Overview

This document outlines the backend requirements for the NetGrader Lab Management System, focusing on the FastAPI backend service that handles grading automation, variable resolution, and integration with RabbitMQ message queues. The backend must support both laboratory exercises (group-based) and examinations (individual-based) with dynamic network configuration generation.

## System Architecture

The backend consists of:
- **ElysiaJS API Server**: Main REST API for frontend communication
- **FastAPI Grading Service**: Automated grading processor with RabbitMQ integration
- **MongoDB Database**: Data persistence layer
- **RabbitMQ Message Queue**: Asynchronous grading job processing

## Backend Requirements

### Requirement 1: ElysiaJS API Server

**User Story:** As a frontend application, I need a REST API server to handle lab and exam management operations.

#### Acceptance Criteria

1. WHEN the frontend makes API requests THEN the server SHALL respond with proper HTTP status codes and JSON responses
2. WHEN handling CORS THEN the server SHALL allow requests from the configured frontend domain
3. WHEN authentication is required THEN the server SHALL validate JWT tokens
4. WHEN rate limiting is needed THEN the server SHALL implement request throttling
5. WHEN errors occur THEN the server SHALL return structured error responses with appropriate error codes

### Requirement 2: Lab Management API Endpoints

**User Story:** As a lecturer, I need API endpoints to create, read, update, and delete laboratory exercises.

#### Acceptance Criteria

1. WHEN creating a lab THEN the API SHALL validate required fields and save to MongoDB
   - `POST /v0/api/courses/{c_id}/labs`
   - Required: title, description, parts array
   - Optional: groupsRequired boolean

2. WHEN retrieving a lab THEN the API SHALL return lab data with populated parts
   - `GET /v0/api/courses/{c_id}/labs/{l_id}`
   - Include: lab metadata, parts with content, associated plays

3. WHEN updating a lab THEN the API SHALL validate changes and update MongoDB
   - `PUT /v0/api/courses/{c_id}/labs/{l_id}`
   - Support partial updates, maintain data integrity

4. WHEN deleting a lab THEN the API SHALL soft delete and clean up related data
   - `DELETE /v0/api/courses/{c_id}/labs/{l_id}`
   - Soft delete, preserve submission history

5. WHEN listing labs THEN the API SHALL return paginated results with filtering
   - `GET /v0/api/courses/{c_id}/labs`
   - Support pagination, filtering by status/date

### Requirement 3: Exam Management API Endpoints

**User Story:** As a lecturer, I need API endpoints to create and manage individual examination exercises.

#### Acceptance Criteria

1. WHEN creating an exam THEN the API SHALL validate exam-specific requirements
   - `POST /v0/api/courses/{c_id}/exams`
   - Required: title, description, parts, timeLimit
   - Generate student configurations on creation

2. WHEN retrieving an exam THEN the API SHALL return exam data with student configurations
   - `GET /v0/api/courses/{c_id}/exams/{e_id}`
   - Include: exam metadata, parts, student-specific configurations

3. WHEN updating an exam THEN the API SHALL regenerate configurations if needed
   - `PUT /v0/api/courses/{c_id}/exams/{e_id}`
   - Regenerate student configs if subnet algorithm changes

4. WHEN generating student configurations THEN the API SHALL create unique configs per student
   - `POST /v0/api/courses/{c_id}/exams/{e_id}/generate-configs`
   - Use subnet generation algorithm for each enrolled student

### Requirement 4: Group Management API Endpoints

**User Story:** As a lecturer, I need to manage student groups for collaborative laboratory work.

#### Acceptance Criteria

1. WHEN uploading student CSV THEN the API SHALL parse and validate student data
   - `POST /v0/api/courses/{c_id}/students/upload`
   - Support CSV with columns: student_id, group_number (optional)
   - Validate student IDs, group numbers (1-32)

2. WHEN managing groups THEN the API SHALL provide CRUD operations
   - `GET /v0/api/courses/{c_id}/groups` - List all groups
   - `POST /v0/api/courses/{c_id}/groups` - Create new group
   - `PUT /v0/api/courses/{c_id}/students/{s_id}/group` - Assign student to group

3. WHEN retrieving group information THEN the API SHALL return group membership
   - Include: group number, student list, creation date
   - Support filtering and pagination

### Requirement 5: Play Bank API Endpoints

**User Story:** As a lecturer, I need to access and manage reusable grading flows (Plays) from a centralized bank.

#### Acceptance Criteria

1. WHEN retrieving plays THEN the API SHALL return available plays with variable definitions
   - `GET /v0/api/plays`
   - Include: play metadata, variable definitions, grading flow

2. WHEN creating plays THEN the API SHALL validate variable definitions
   - `POST /v0/api/plays`
   - Validate variable types, required fields, grading steps

3. WHEN a play has variables THEN the API SHALL return variable schema
   - Include: variable name, type, description, default value, required flag
   - Support types: string, number, ip_address, group_number

### Requirement 6: Variable Resolution System

**User Story:** As a system, I need to resolve Play variables based on context (lab vs exam mode).

#### Acceptance Criteria

1. WHEN resolving lab variables THEN the system SHALL use group-based resolution
   - Replace `{group_number}` with student's assigned group number
   - Example: `192.168.{group_number}.5` → `192.168.3.5`

2. WHEN resolving exam variables THEN the system SHALL use student ID-based generation
   - Use subnet generation algorithm for unique configurations
   - Example: `172.{dec2}.{dec3}.65` → `172.15.232.65`

3. WHEN variable resolution fails THEN the system SHALL return appropriate errors
   - Handle missing variables, invalid types, resolution failures

4. WHEN caching resolved variables THEN the system SHALL store for performance
   - Cache resolved variables per student/context
   - Invalidate cache when configurations change

### Requirement 7: Subnet Generation Algorithm

**User Story:** As an examination system, I need to generate unique network configurations per student to prevent cheating.

#### Acceptance Criteria

1. WHEN generating exam configurations THEN the system SHALL use the provided algorithm
   ```javascript
   // Input: student_id (number), exam_number (number)
   // Output: ExamConfiguration object
   ```

2. WHEN calculating network parameters THEN the system SHALL follow the algorithm:
   - `dec2 = floor((student_id / 1000000 - 61) * 10 + (student_id % 1000) / 250)`
   - `dec3 = floor((student_id % 1000) % 250)`
   - `vlan1 = floor((student_id / 1000000 - 61) * 400 + (student_id % 1000))`
   - `vlan2 = floor((student_id / 1000000 - 61) * 500 + (student_id % 1000))`

3. WHEN generating IP addresses THEN the system SHALL create structured configurations
   - IPv4 subnet: `172.{dec2}.{dec3}.64/26`
   - IPv6 subnet: `2001:{dec2}:{dec3}::/48`
   - Outer interface IPv4: `10.30.6.{190 + exam_number}`
   - Outer interface IPv6: `2001:db8:dada:aaaa::{190 + exam_number}`

4. WHEN generating detailed answers THEN the system SHALL create complete configuration objects
   - Router configurations (VLAN interfaces, routing)
   - Switch configurations (IP, VLAN assignments)
   - PC configurations (IP, gateway, DNS)
   - Both IPv4 and IPv6 configurations

5. WHEN the algorithm is customized THEN the system SHALL support custom JavaScript code
   - Allow lecturers to modify the generation algorithm
   - Validate custom code for security
   - Maintain backward compatibility

### Requirement 8: Grading Submission API

**User Story:** As a student, I need to submit my work for automated grading.

#### Acceptance Criteria

1. WHEN submitting for grading THEN the API SHALL create a grading job
   - `POST /v0/api/courses/{c_id}/labs/{l_id}/parts/{p_id}/grade`
   - `POST /v0/api/courses/{c_id}/exams/{e_id}/parts/{p_id}/grade`
   - Update submission status to "GRADING" in database

2. WHEN creating grading jobs THEN the API SHALL enqueue to RabbitMQ
   - Create message with: submission_id, student_id, play_data (full play object), resolved_variables
   - Include complete play grading flow data in message
   - Set appropriate queue priorities and timeouts

3. WHEN checking grading status THEN the API SHALL return current status
   - `GET /v0/api/courses/{c_id}/labs/{l_id}/submissions/status`
   - `GET /v0/api/courses/{c_id}/exams/{e_id}/submissions/status`
   - Return: status, progress, task_results, total_score

### Requirement 9: Grading Callback API

**User Story:** As a FastAPI grading service, I need to send grading results back to ElysiaJS for database updates.

#### Acceptance Criteria

1. WHEN FastAPI completes grading THEN it SHALL callback to ElysiaJS
   - `POST /v0/api/internal/grading/callback`
   - Include: submission_id, status ("GRADED" or "ERROR"), results

2. WHEN receiving grading callbacks THEN ElysiaJS SHALL update the database
   - Update submission status and results in MongoDB
   - Store task_results, total_score, graded_at timestamp
   - Handle both success and error callbacks

3. WHEN callback authentication is needed THEN the API SHALL validate internal requests
   - Use internal API key or JWT for FastAPI callbacks
   - Ensure only authorized grading service can send callbacks

4. WHEN callback fails THEN FastAPI SHALL implement retry logic
   - Retry failed callbacks with exponential backoff
   - Log callback failures for monitoring

### Requirement 10: FastAPI Grading Service

**User Story:** As a grading system, I need a FastAPI service to process grading jobs from RabbitMQ.

#### Acceptance Criteria

1. WHEN starting the service THEN FastAPI SHALL connect to RabbitMQ only
   - Establish persistent RabbitMQ connection with retry logic
   - Configure queue consumers with appropriate concurrency
   - NO direct database access - all data operations via ElysiaJS callbacks

2. WHEN receiving grading messages THEN the service SHALL process grading jobs
   - Parse message payload (submission_id, student_id, play_data, resolved_variables)
   - Play grading flow data included in message (no database access needed)
   - Execute grading steps with resolved variables

3. WHEN grading is complete THEN the service SHALL callback to ElysiaJS with results
   - Send POST request to ElysiaJS callback endpoint with grading results
   - Include: submission_id, status, task_results, total_score, feedback
   - ElysiaJS will handle database updates

4. WHEN grading fails THEN the service SHALL callback with error status
   - Send error callback to ElysiaJS with failure details
   - Include: submission_id, error_code, error_message
   - ElysiaJS will update submission status to "ERROR"
   - Implement retry logic for transient failures

5. WHEN processing exam grading THEN the service SHALL use student-specific configurations
   - Validate answers against generated configurations
   - Use personalized answer keys per student

### Requirement 11: Database Schema and Operations

**User Story:** As a backend system, I need efficient database operations with proper schema design.

#### Acceptance Criteria

1. WHEN designing schemas THEN the database SHALL support all required collections
   - Labs, Exams, Plays, StudentGroups, StudentEnrollments, Submissions, StudentProgress

2. WHEN performing queries THEN the database SHALL have proper indexing
   - Index frequently queried fields: courseId, studentId, labId, examId
   - Compound indexes for complex queries

3. WHEN handling concurrent operations THEN the database SHALL maintain consistency
   - Use transactions for multi-document operations
   - Implement optimistic locking where needed

4. WHEN storing large data THEN the database SHALL optimize storage
   - Compress large text content (lab descriptions)
   - Use GridFS for file attachments if needed

### Requirement 12: Authentication and Authorization

**User Story:** As a secure system, I need proper authentication and authorization controls.

#### Acceptance Criteria

1. WHEN validating requests THEN the API SHALL verify JWT tokens
   - Validate token signature and expiration
   - Extract user role and permissions

2. WHEN authorizing operations THEN the API SHALL enforce role-based access
   - Lecturers: Can create/edit labs and exams
   - Students: Can view and submit assignments
   - Admins: Full system access

3. WHEN accessing course resources THEN the API SHALL verify enrollment
   - Students can only access courses they're enrolled in
   - Lecturers can only access courses they teach

### Requirement 13: Error Handling and Logging

**User Story:** As a system administrator, I need comprehensive error handling and logging.

#### Acceptance Criteria

1. WHEN errors occur THEN the system SHALL log with appropriate detail
   - Include: timestamp, user_id, operation, error_message, stack_trace
   - Use structured logging (JSON format)

2. WHEN returning errors THEN the API SHALL use consistent error format
   ```json
   {
     "success": false,
     "error": {
       "code": "LAB_NOT_FOUND",
       "message": "Lab with specified ID does not exist",
       "details": {}
     }
   }
   ```

3. WHEN monitoring performance THEN the system SHALL track metrics
   - API response times, database query performance
   - Grading job processing times and success rates
   - Queue depth and processing throughput

### Requirement 14: Performance and Scalability

**User Story:** As a system under load, I need to handle multiple concurrent users efficiently.

#### Acceptance Criteria

1. WHEN handling concurrent requests THEN the API SHALL maintain performance
   - Support at least 100 concurrent users
   - Response times under 500ms for standard operations

2. WHEN processing grading jobs THEN the system SHALL scale horizontally
   - Support multiple FastAPI worker instances
   - Distribute grading load across workers

3. WHEN caching data THEN the system SHALL improve response times
   - Cache frequently accessed data (plays, course info)
   - Implement cache invalidation strategies

### Requirement 15: Data Migration and Backup

**User Story:** As a system administrator, I need data migration and backup capabilities.

#### Acceptance Criteria

1. WHEN migrating data THEN the system SHALL provide migration scripts
   - Database schema migrations
   - Data transformation utilities

2. WHEN backing up data THEN the system SHALL support automated backups
   - Regular database backups
   - Point-in-time recovery capabilities

## API Response Formats

### Success Response Format
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2025-01-20T10:30:00Z",
    "version": "1.0"
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional error context
    }
  },
  "meta": {
    "timestamp": "2025-01-20T10:30:00Z",
    "version": "1.0"
  }
}
```

## Environment Configuration

### Required Environment Variables
```bash
# ElysiaJS Database Configuration
MONGODB_URI=mongodb://localhost:27017/netgrader
MONGODB_DATABASE=netgrader

# Message Queue (Both ElysiaJS and FastAPI)
RABBITMQ_URL=amqp://localhost:5672
GRADING_QUEUE_NAME=grading_jobs

# FastAPI Configuration (No database access)
ELYSIA_CALLBACK_URL=http://localhost:4000/v0/api/internal/grading/callback
INTERNAL_API_KEY=your-internal-api-key

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=24h

# API Configuration
API_PORT=4000
API_HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000

# Grading Service
GRADING_WORKERS=4
GRADING_TIMEOUT=300

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Testing Requirements

### Unit Testing
- Test all API endpoints with various input scenarios
- Test variable resolution logic with different contexts
- Test subnet generation algorithm with edge cases
- Test error handling and validation

### Integration Testing
- Test end-to-end grading workflow
- Test database operations and transactions
- Test RabbitMQ message processing
- Test authentication and authorization

### Performance Testing
- Load testing with concurrent users
- Stress testing grading job processing
- Database performance under load
- Memory and CPU usage monitoring

## Security Considerations

### Input Validation
- Sanitize all user inputs
- Validate file uploads (CSV)
- Prevent SQL/NoSQL injection
- Rate limiting on API endpoints

### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement proper session management
- Audit logging for sensitive operations

### Network Security
- Firewall configuration
- VPN access for administrative operations
- Secure database connections
- Message queue authentication