# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Rules

* Always read entire files. Otherwise, you don’t know what you don’t know, and will end up making mistakes, duplicating code that already exists, or misunderstanding the architecture.  
* Commit early and often. When working on large tasks, your task could be broken down into multiple logical milestones. After a certain milestone is completed and confirmed to be ok by the user, you should commit it. If you do not, if something goes wrong in further steps, we would need to end up throwing away all the code, which is expensive and time consuming.  
* Your internal knowledgebase of libraries might not be up to date. When working with any external library, unless you are 100% sure that the library has a super stable interface, you will look up the latest syntax and usage via either Perplexity (first preference) or web search (less preferred, only use if Perplexity is not available)  
* Do not say things like: “x library isn’t working so I will skip it”. Generally, it isn’t working because you are using the incorrect syntax or patterns. This applies doubly when the user has explicitly asked you to use a specific library, if the user wanted to use another library they wouldn’t have asked you to use a specific one in the first place.  
* Always run linting after making major changes. Otherwise, you won’t know if you’ve corrupted a file or made syntax errors, or are using the wrong methods, or using methods in the wrong way.   
* Please organise code into separate files wherever appropriate, and follow general coding best practices about variable naming, modularity, function complexity, file sizes, commenting, etc.  
* Code is read more often than it is written, make sure your code is always optimised for readability  
* Unless explicitly asked otherwise, the user never wants you to do a “dummy” implementation of any given task. Never do an implementation where you tell the user: “This is how it *would* look like”. Just implement the thing.  
* Whenever you are starting a new task, it is of utmost importance that you have clarity about the task. You should ask the user follow up questions if you do not, rather than making incorrect assumptions.  
* Do not carry out large refactors unless explicitly instructed to do so.  
* When starting on a new task, you should first understand the current architecture, identify the files you will need to modify, and come up with a Plan. In the Plan, you will think through architectural aspects related to the changes you will be making, consider edge cases, and identify the best approach for the given task. Get your Plan approved by the user before writing a single line of code.   
* If you are running into repeated issues with a given task, figure out the root cause instead of throwing random things at the wall and seeing what sticks, or throwing in the towel by saying “I’ll just use another library / do a dummy implementation”.   
* You are an incredibly talented and experienced polyglot with decades of experience in diverse areas such as software architecture, system design, development, UI & UX, copywriting, and more.  
* When doing UI & UX work, make sure your designs are both aesthetically pleasing, easy to use, and follow UI / UX best practices. You pay attention to interaction patterns, micro-interactions, and are proactive about creating smooth, engaging user interfaces that delight users.   
* When you receive a task that is very large in scope or too vague, you will first try to break it down into smaller subtasks. If that feels difficult or still leaves you with too many open questions, push back to the user and ask them to consider breaking down the task for you, or guide them through that process. This is important because the larger the task, the more likely it is that things go wrong, wasting time and energy for everyone involved.

## Development Commands

**Development Server**: `bun run dev` - Starts development server on http://localhost:3000
**Build**: `bun run build` - Build for production  
**Preview**: `bun run preview` - Preview production build locally

## Architecture Overview

NetGrader Frontend is a Nuxt 3 SPA that provides a web interface for creating and managing network testing labs and exams. The application follows a multi-layered architecture with clear separation of concerns.

### Core Concepts

**Labs vs Exams**: Both use the same underlying structure but differ in scope:
- Labs: Group-based IP allocation, collaborative work
- Exams: Individual student IP allocation, isolated testing

**Multi-Part Structure**: Labs/Exams are divided into Parts → Plays → Tasks
- **Part**: Major section with instructions (markdown) and IP schema
- **Play**: Collection of related network tasks with device context
- **Task**: Individual automated test using Ansible templates

**IP Schema Management**: Dynamic IP allocation system
- Base network configuration (CIDR, gateway)
- Device IP mapping with host offsets
- Student/group-based allocation strategies
- Auto-generated IP variables for task templates

### Key Type Definitions

Primary interfaces in `types/lab.ts`:
- `Lab`: Complete lab/exam structure with parts
- `LabPart`: Section with instructions and plays
- `Play`: Task collection with device context
- `AnsibleTask`: Individual test with parameters and validation
- `IpSchema`: Network configuration and allocation strategy
- `DeviceIpMapping`: Device-to-IP variable mappings

### Authentication & Authorization

Two-tier auth system via global middleware:
- **Global auth** (`authguard.global.ts`): Session validation, redirects to login
- **Course roles** (`course-role.global.ts`): Per-course permissions (STUDENT/TA/INSTRUCTOR)

Role-based access managed through `useAuth()` and `useRoleGuard()` composables.

### State Management

Reactive state via composables in `composables/states.ts`:
- `useUserState()`: Current user session
- `useCourseRoleState()`: Course-specific permissions
- Uses persistent state across navigation

### Component Organization

**Lab Management**: `components/lab/`
- `IPSchemaManager.vue`: Network configuration with device presets
- `DeviceIPMapping.vue`: Device configuration and IP variables
- `PlayCreationModal.vue`: Multi-step play creation wizard

**Play & Task System**: `components/play/`
- `PlayCreationModal.vue`: 3-step wizard (Info → Tasks → Review)
- `TaskCreationModal.vue`: Task creation with template selection
- Device selection happens at task level, not play level

**Student Interface**: `components/student/`
- `LabPartViewer.vue`: Instructions and task execution
- `DeviceInfoPanel.vue`: IP assignments and network info
- `GradingInterface.vue`: Task submission and results

### Task Template System

Defined in `composables/useTaskTemplates.ts`:
- Template-based task creation (ping, traceroute, SSH, HTTP, etc.)
- Parameters include device variables, URLs, numbers, strings
- `source_device` parameter added to all templates for device context
- Default test cases provided per template

### IP Schema Workflow

1. **Network Config**: Base network, subnet mask, gateway
2. **Device Mapping**: Define devices with host offsets (PC=×10, Router=+1, Switch=+1)  
3. **Student Data**: CSV upload with optional group assignments
4. **IP Generation**: Automatic IP assignment based on strategy
5. **Variable Resolution**: `{{device_ip}}` variables resolved at runtime

### Device Preset System

Auto-incrementing device presets in `IPSchemaManager`:
- Dynamic button text shows next device (PC 1, PC 2, etc.)
- Smart conflict resolution for host offsets
- Template-based device generation with incremental naming

### Backend Integration

API calls through `$fetch` with runtime config:
- Backend URL via `NUXT_BACKENDURL` environment variable
- Cookie-based authentication with `credentials: "include"`
- Error handling via `useApiErrorHandler()` composable

### UI Framework

- **shadcn-vue**: Primary UI component library
- **TailwindCSS v4**: Styling with CSS variables
- **Lucide Icons**: Icon system via @nuxt/icon
- **Vue Sonner**: Toast notifications
- **TipTap**: Rich text editor for instructions

### File Upload & Processing

CSV processing via `useCSVProcessor()`:
- Student roster uploads with group assignments
- Validation and preview before import
- Support for group-based and individual allocation strategies

### Important Development Notes

- **SSR Disabled**: `ssr: false` in nuxt.config.ts - runs as SPA
- **Device Selection Architecture**: Source/destination devices selected at task level using Device IP Mapping, not at play level
- **Modal State Management**: Use proper `handleOpenChange` for dialog components
- **IP Variable Format**: Device IPs use `{{device_ip}}` format in task parameters
- **Preset Incrementation**: Device presets auto-increment (PC 1 → PC 2) with dynamic button text

### Common Patterns

**Form Validation**: Use `useFormValidation()` with reactive validation rules
**Loading States**: `useLoadingStates()` for async operations  
**Notifications**: `useNotifications()` for user feedback
**Variable Resolution**: `useVariableResolver()` for IP variable substitution in task execution