# Requirements Document

## Introduction

The Lab Management System for NetGrader is a comprehensive feature that enables lecturers to create, edit, and manage laboratory exercises while providing students with an interactive platform to complete and submit their work. The system includes three main components: Lab Create page for lecturers to design exercises, Lab Edit page for modifying existing labs, and Lab Activity page for students to work on assignments with automated grading integration.

## Requirements

### Requirement 1: Lab Creation Interface

**User Story:** As a lecturer, I want to create new laboratory exercises with multiple parts and tasks, so that I can design comprehensive assignments for my students.

#### Acceptance Criteria

1. WHEN a lecturer accesses the lab create page THEN the system SHALL display a part sidebar on the left and a markdown/HTML text editor on the right
2. WHEN the page loads THEN the system SHALL default to "Part 1" in the sidebar
3. WHEN a lecturer wants to add a new part THEN the system SHALL provide an interface similar to browser tabs in the sidebar
4. WHEN a lecturer writes content THEN the text editor SHALL support markdown/HTML formatting with text color and font size options
5. WHEN a lecturer starts editing a part THEN the system SHALL require a header for the part name at the top of the text editor
6. WHEN a lecturer needs to assign a Play THEN the system SHALL provide a button that opens a modal to select from the Play Bank database
7. WHEN a lecturer finishes creating a lab THEN the system SHALL provide Cancel and Save buttons at the bottom right

### Requirement 2: Lab Editing Interface

**User Story:** As a lecturer, I want to edit existing laboratory exercises, so that I can update and improve my assignments over time.

#### Acceptance Criteria

1. WHEN a lecturer accesses the lab edit page with l_id THEN the system SHALL load the existing lab data from the database
2. WHEN the lab data is loaded THEN the system SHALL populate the part sidebar with existing parts
3. WHEN the lab data is loaded THEN the system SHALL populate the text editor with existing content for each part
4. WHEN a lecturer modifies content THEN the system SHALL maintain the same interface as the lab create page
5. WHEN a lecturer saves changes THEN the system SHALL update the existing lab record in the database

### Requirement 3: Student Lab Activity Interface

**User Story:** As a student, I want to work on laboratory exercises in an organized interface, so that I can complete my assignments efficiently.

#### Acceptance Criteria

1. WHEN a student accesses the lab activity page with l_id THEN the system SHALL display a read-only version of the lab interface
2. WHEN the page loads THEN the system SHALL populate the part sidebar with lab parts from the database
3. WHEN the page loads THEN the system SHALL display task content in a non-editable format
4. WHEN a student views a part THEN the system SHALL display a Grade button at the bottom of the task list
5. WHEN a student has not completed the current part THEN the system SHALL disable access to subsequent parts in the sidebar

### Requirement 4: Grading Workflow Integration

**User Story:** As a student, I want to submit my work for automated grading, so that I can receive immediate feedback on my performance.

#### Acceptance Criteria

1. WHEN a student clicks the Grade button THEN the system SHALL make a POST request to the Elysia backend
2. WHEN the backend receives a grading request THEN the system SHALL update the submission status to "GRADING" in the database
3. WHEN the status is updated THEN the system SHALL create a message queue entry in RabbitMQ
4. WHEN FastAPI processes the queue THEN the system SHALL run the grading based on the queue context
5. WHEN grading is complete THEN FastAPI SHALL update the database with "GRADED" status and task points
6. WHEN grading is in progress THEN the frontend SHALL continuously fetch the grading status from Elysia
7. WHEN grading results are available THEN the system SHALL display the results in the Lab Activity interface

### Requirement 5: Part Progression Control

**User Story:** As a student, I want to complete lab parts sequentially, so that I can build knowledge progressively through the exercise.

#### Acceptance Criteria

1. WHEN a student has not completed the current part THEN the system SHALL disable navigation to subsequent parts
2. WHEN a student completes a part with grading THEN the system SHALL enable access to the next part
3. WHEN a student attempts to access a disabled part THEN the system SHALL prevent navigation and provide appropriate feedback
4. WHEN a student completes all parts THEN the system SHALL mark the entire lab as completed

### Requirement 6: Play Bank Integration with Variable System

**User Story:** As a lecturer, I want to select reusable grading flows from a Play Bank with dynamic variable support, so that I can efficiently assign appropriate grading criteria while maintaining flexibility for different contexts.

#### Acceptance Criteria

1. WHEN a lecturer clicks the Play selection button THEN the system SHALL open a modal displaying available Plays from the database
2. WHEN the modal opens THEN the system SHALL load and display all available Plays with their variable requirements
3. WHEN a lecturer selects a Play THEN the system SHALL associate it with the current lab part and prompt for variable configuration
4. WHEN a Play is selected THEN the system SHALL close the modal and update the interface to reflect the selection with variable bindings
5. IF no Play is selected for a part THEN the system SHALL prevent saving the lab and display an appropriate error message
6. WHEN a Play contains variables THEN the system SHALL allow lecturers to configure variable values or use dynamic generation algorithms

### Requirement 7: Group Management System for Labs

**User Story:** As a lecturer, I want to manage student groups within courses for laboratory work, so that I can organize collaborative lab exercises and assign group-specific configurations.

#### Acceptance Criteria

1. WHEN a lecturer accesses course management THEN the system SHALL provide group management functionality for labs
2. WHEN managing groups THEN the system SHALL support up to 32 groups per course
3. WHEN a lecturer uploads a CSV file for labs THEN the system SHALL parse student IDs and optional group assignments
4. WHEN students are assigned to groups THEN the system SHALL make group_number variable available for lab task configuration
5. WHEN creating lab tasks THEN the system SHALL allow lecturers to use variables like group_number in IP address fields
6. WHEN students work on labs THEN the system SHALL resolve variables based on their group assignment
7. WHEN the same students take exams THEN the system SHALL ignore group assignments and use individual configurations

### Requirement 8: Individual Examination System with Dynamic Subnet Generation

**User Story:** As a lecturer, I want to create individual examination exercises with dynamically generated network configurations, so that each student gets unique configurations and cannot cheat by sharing answers.

#### Acceptance Criteria

1. WHEN a lecturer creates an exam THEN the system SHALL provide a separate exam interface similar to labs
2. WHEN creating exams THEN the system SHALL require student enrollment through CSV upload (individual students, no groups)
3. WHEN examination mode is enabled THEN the system SHALL generate unique VLAN IDs and subnet configurations per individual student
4. WHEN generating subnets THEN the system SHALL use the provided algorithm or allow customization through UI
5. WHEN students access exams THEN the system SHALL provide personalized network configurations based on their student ID
6. WHEN grading exams THEN the system SHALL validate answers against student-specific generated configurations
7. WHEN the outer router configuration is needed THEN the system SHALL maintain the mandatory 10.30.6.xxx IP structure
8. WHEN exams are created THEN the system SHALL support time limits and enhanced security measures
9. WHEN students take exams THEN the system SHALL ensure each student works individually with their unique configuration

### Requirement 9: Database Schema and Backend Integration

**User Story:** As a system administrator, I want a well-structured database schema, so that the lab management system can efficiently store and retrieve data.

#### Acceptance Criteria

1. WHEN lab data is saved THEN the system SHALL store lab information in MongoDB with proper schema structure
2. WHEN grading status is updated THEN the system SHALL maintain accurate submission tracking in the database
3. WHEN students access labs THEN the system SHALL efficiently query and return lab content and progress data
4. WHEN lecturers manage labs THEN the system SHALL support CRUD operations through the Elysia backend
5. WHEN the system handles concurrent users THEN the database SHALL maintain data consistency and integrity

### Requirement 10: User Interface Design and Styling

**User Story:** As a user, I want a consistent and visually appealing interface, so that I can navigate and use the system effectively.

#### Acceptance Criteria

1. WHEN any page loads THEN the system SHALL use colors from the custom Tailwind CSS theme
2. WHEN components are rendered THEN the system SHALL utilize shadcn-vue components for consistency
3. WHEN the interface is displayed THEN the system SHALL maintain responsive design principles
4. WHEN users interact with elements THEN the system SHALL provide appropriate visual feedback
5. WHEN accessibility is considered THEN the system SHALL meet basic accessibility standards
6. WHEN pages are loading data THEN the system SHALL display skeleton components from shadcn-vue to indicate loading state