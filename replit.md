# Student Leave Management System

## Overview

This is a comprehensive student leave management system built for educational institutions to streamline the leave request and approval process. The application provides role-based dashboards for students to submit leave requests and for various authorities (mentors, HODs, principals, wardens, parents, and security) to manage approvals. The system includes features like multi-step approval workflows, QR code generation for campus exit, real-time status tracking, and notification management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client is built using **React 18** with **TypeScript** for type safety. The frontend follows a component-based architecture with:

- **State Management**: Uses TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with custom CSS variables for theming support
- **Form Handling**: React Hook Form with Zod schema validation
- **Build Tool**: Vite for fast development and optimized production builds

The frontend is organized into clear directories:
- `/components` - Reusable UI components and business logic components
- `/pages` - Route-specific page components
- `/hooks` - Custom React hooks for shared logic
- `/lib` - Utility functions and configuration

### Backend Architecture
The server is built with **Express.js** and follows a RESTful API design:

- **Framework**: Express.js with TypeScript support
- **Database Layer**: Drizzle ORM for type-safe database operations
- **Authentication**: Header-based authentication system with role-based access control
- **API Structure**: Organized routes with middleware for authentication and error handling
- **Services**: Dedicated service classes for QR code generation and notification management

### Database Design
Uses **PostgreSQL** as the primary database with Drizzle ORM for schema management:

- **Schema**: Centralized schema definitions in `/shared/schema.ts` for type sharing between client and server
- **Tables**: Users, leave requests, approvals, QR codes, and notifications
- **Relationships**: Proper foreign key relationships between entities
- **Enums**: PostgreSQL enums for status fields and user roles
- **Migrations**: Drizzle Kit for database schema migrations

### Authentication & Authorization
Implements a role-based access control system:

- **Roles**: Student, Mentor, HOD, Principal, Warden, Parent, Security
- **Session Management**: Header-based authentication using user ID and role
- **Route Protection**: Middleware-based authorization for API endpoints
- **Frontend Guards**: Route-level authentication checks with role-based redirects

### Workflow Management
Multi-step approval process with configurable workflow:

- **Sequential Approvals**: Mentor → Parent → HOD → Principal → Warden (for hostel students)
- **Status Tracking**: Real-time status updates through the approval chain
- **Conditional Logic**: Different approval paths for day scholars vs hostel students
- **Approval History**: Complete audit trail of all approval actions

### QR Code System
Secure QR code generation for campus exit authorization:

- **Dynamic Generation**: Unique QR codes per leave request with cryptographic hashing
- **Time-bound Validity**: QR codes expire at the end of the leave period
- **Security Features**: One-time use validation and tamper-proof generation
- **Mobile Integration**: WhatsApp sharing and download capabilities

### Notification System
Automated notification management for stakeholders:

- **Multi-channel Support**: Email and SMS notification types
- **Event-driven**: Notifications triggered by workflow state changes
- **Parent Communication**: Dedicated parent confirmation workflow
- **Overdue Alerts**: Automated notifications for students who haven't returned

## External Dependencies

### Database Services
- **Neon Database**: PostgreSQL-compatible serverless database using `@neondatabase/serverless`
- **Connection Pooling**: Built-in connection management for serverless environments

### UI Framework
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives including dialogs, dropdowns, forms, and navigation components
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Lucide React**: Icon library providing consistent iconography

### Development Tools
- **Vite**: Modern build tool with hot module replacement and optimized bundling
- **TypeScript**: Static type checking across the entire application
- **Drizzle Kit**: Database migration and schema management tool
- **ESBuild**: Fast JavaScript bundler for production builds

### Form & Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation library
- **@hookform/resolvers**: Integration layer between React Hook Form and Zod

### Development Environment
- **Replit Integration**: Custom plugins for Replit development environment including runtime error overlay and cartographer
- **WebSocket Support**: For real-time features using the `ws` library

The system is designed to be scalable and maintainable, with clear separation of concerns between the frontend and backend, comprehensive type safety throughout the application, and a flexible workflow system that can be adapted to different institutional requirements.