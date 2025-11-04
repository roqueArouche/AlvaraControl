# Control360

## Overview

This is a municipal permit (Alvarás) management system built as a full-stack web application for local government use. The system allows municipal employees to manage business permits, track their statuses, and monitor compliance deadlines. It features a modern React frontend with a Node.js/Express backend, using PostgreSQL for data persistence. The application supports CRUD operations for permits, various filtering and search capabilities, dashboard analytics, data export functionality, and automatic status updates based on Brazilian regulatory deadline compliance.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Shadcn/ui component library with Radix UI primitives providing accessible, customizable components
- **Styling**: Tailwind CSS with custom design system supporting light/dark themes
- **State Management**: TanStack Query for server state management and caching, React Context for authentication and theme state
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Layout**: Responsive sidebar layout with collapsible navigation and mobile support

### Backend Architecture
- **Runtime**: Node.js with TypeScript and ES modules
- **Framework**: Express.js for HTTP server and API routes
- **Database ORM**: Drizzle ORM for type-safe database operations and schema management
- **Authentication**: Session-based authentication with basic username/password validation
- **API Design**: RESTful API structure with consistent error handling and response formatting
- **Development**: Hot reloading with Vite integration and TSX for TypeScript execution

### Data Storage
- **Primary Database**: PostgreSQL with connection via Neon Database serverless driver
- **Schema Design**: Normalized relational schema with separate tables for users, permits (alvaras), permit types, and status categories
- **Database Migrations**: Drizzle Kit for schema migrations and database management
- **Session Storage**: Connect-pg-simple for PostgreSQL-backed session storage
- **Development Fallback**: In-memory storage implementation for development/testing scenarios

### Authentication & Authorization
- **Authentication Method**: Session-based authentication using express-session
- **User Management**: Basic user system with username/password credentials
- **Session Persistence**: PostgreSQL-backed session storage with configurable expiration
- **Authorization**: Route-level protection with React Context for user state management
- **Security**: CSRF protection considerations and secure session configuration

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting for production database
- **PostgreSQL**: Primary relational database for all application data

### UI/UX Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Shadcn/ui**: Pre-built component library built on top of Radix UI
- **Lucide React**: Icon library providing consistent iconography
- **TanStack Query**: Server state management with caching, background updates, and optimistic updates

### Development Tools
- **Vite**: Frontend build tool with fast hot module replacement
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **TypeScript**: Static type checking across frontend and backend
- **Drizzle Kit**: Database schema management and migration tool

### Backend Dependencies
- **Express.js**: Web application framework for Node.js
- **Zod**: TypeScript-first schema validation library
- **Date-fns**: Date utility library for formatting and manipulation
- **Connect-pg-simple**: PostgreSQL session store for Express sessions

### Deployment & Infrastructure
- **Replit**: Development and hosting platform with integrated tooling
- **Node.js**: Server runtime environment
- **ESBuild**: Fast JavaScript bundler for production builds

## Business Logic Features

### Automatic Deadline Verification System
A comprehensive automated system for managing Brazilian municipal permit compliance deadlines and status updates:

#### Two-Phase Deadline System
- **First Deadline (Primeiro Prazo)**: Initial compliance deadline after notification  
- **Second Deadline (Segundo Prazo)**: Regularization deadline for permits under process (REQUIRED field)
- **Legacy Compatibility**: Automatic fallback to deprecated `prazoRegularizacao` for existing records
- **Automatic Status Transitions**: Data-driven status updates based on deadline expiry

#### Business Rules Implementation
1. **Notification Phase**: When `dataNotificacao` and `primeiroPrazo` are set:
   - Before first deadline expiry → Status: "Notificado"
   - After first deadline expiry → Status: "1º Prazo Vencido"

2. **Regularization Phase**: When `dataVisita` and effective second deadline are set:
   - During second deadline period → Status: "Em Processo de Regularização"
   - After second deadline expiry → Status: "2º Prazo Vencido"
   - **Effective Second Deadline**: `segundoPrazo || prazoRegularizacao` for backward compatibility

3. **Fallback Rule**: When legacy `prazoRegularizacao` expires without specific deadlines:
   - Status: "Inapto"

#### Recent Changes (October 2025)
- **Complete Alvarás Module Refactoring (Critical Fix)**: Resolved persistent 500 error in production
  - **Problem**: Production environment returned 500 error when loading all records without status filter
  - **Root Cause Analysis**: 
    1. Initially suspected automatic `verificarEAtualizarPrazos()` call causing timeout
    2. After detailed investigation, identified image normalization function as potential failure point
  - **Solution - Multi-Layer Error Protection**:
    - Added try-catch protection in `normalizeImagemLocal()` function
    - Added try-catch protection in `mapDbResultToAlvara()` function with fallback for corrupted images
    - Modified `getAllAlvaras()` to use individual record mapping with error isolation
    - Now skips problematic records instead of failing entire request
  - **Performance**: Significantly reduced list endpoint latency by eliminating heavyweight deadline calculation on every request
  - **Data Integrity**: System continues functioning even if individual records have corrupted image data
  - **Robustness**: Added 11-step detailed logging throughout API request flow for debugging
  - **Code Quality**: Simplified filtering and sorting logic for better production reliability
  
- **Status Filter Enhancement**: Restored "Todos os Status" option
  - **Added**: "Todos os Status" (value="all") as first item in status filter dropdown
  - **Behavior**: When "Todos os Status" is selected, backend receives status="all" and returns all records
  - **Backend Logic**: `if (status !== 'all')` check ensures filter only applies for specific statuses
  - **UX**: Clear visual option for users to explicitly show all records
  - **Testing**: Validated with automated tests - all filter combinations work correctly

- **Production Database Initialization Fix**: Fixed 500 error in published app when accessed without authentication
  - Added automatic `storage.initializeDefaultData()` call in server startup (server/index.ts)
  - Ensures production database has required initial data (users, status types, permit types)
  - Prevents errors when production database is empty after publishing
  - Initialization creates default user (valderlan/01012025) and all required status/type records

- **Sort Functionality**: Added sort dropdown to Alvarás page
  - "Cadastro (mais recente)": Sorts by creation date descending (newest first)
  - "Nome (A-Z)": Sorts alphabetically by contributor name ascending
  - Backend accepts `sortBy` (data/nome) and `sortOrder` (asc/desc) query parameters
  - Frontend uses combined value format (e.g., "data-desc", "nome-asc") to ensure correct mapping
  - Fixed sorting logic bug: date comparison now correctly ascending base, then negated for desc

- **Filter Logic Enhancement**: Multiple filters work simultaneously
  - Combined filter pipeline in server/routes.ts supports search + status + date + sort together
  - Date filter works with only startDate (doesn't require endDate)
  - All filters can be combined and applied sequentially
  
#### Recent Changes (September 2025)
- **Field Migration**: Replaced "Prazo para Regularização*" with "Prazo para Regularização (2º Prazo)" as optional field
- **Optionality Change**: Made segundoPrazo optional since it only applies when client appears or first deadline expires
- **Backward Compatibility**: Maintained support for existing records with legacy `prazoRegularizacao` data
- **Safe Schema Migration**: Used effectiveSegundoPrazo logic to prevent data loss during transition
- **Frontend Update**: Updated form to make segundoPrazo optional (removed asterisk)
- **Backend Processing**: Enhanced data processing to handle empty strings correctly for optional vs required fields

#### Technical Implementation
- **Data-Driven Logic**: Status determination based on date comparison rather than current status state
- **Automatic Execution**: Integrated into API endpoints (`/api/alvaras`, `/api/dashboard/stats`)
- **Manual Trigger**: Available via `/api/verificar-prazos` endpoint
- **Idempotent Operations**: Multiple executions produce consistent results
- **Dual Storage Support**: Both PostgreSQL and in-memory storage implementations

#### Status Categories
- **Regular**: Compliant permits
- **Notificado**: Permits within first deadline period
- **1º Prazo Vencido**: Permits with expired first deadline
- **Em Processo de Regularização**: Permits under regularization process
- **2º Prazo Vencido**: Permits with expired regularization deadline
- **Inapto**: Non-compliant permits with expired general deadline

### Multiple Image Upload System
A robust system for uploading and managing up to 3 images per permit record, implemented in October 2025:

#### Features
- **Multiple Image Support**: Up to 3 images per alvará record (5MB each)
- **Image Display**: Images appear in permit cards without needing to edit
- **Image Persistence**: Editing permits without modifying images preserves existing images
- **Gallery View**: Grid display of multiple images in card expansion area
- **Image Viewer**: Click to view enlarged images in modal dialog
- **Validation**: Client and server-side validation for image count and size limits

#### Implementation Details

**Frontend Components**:
- `MultipleImageUpload.tsx`: Main upload component with preview, validation, and removal
- `alvara-modal.tsx`: Form integration with image preservation logic
- `alvaras.tsx`: Card display with image gallery grid

**Storage Format**:
- Images stored as JSON array in `imagemLocal` field: `["data:image/png;base64,...", "data:image/jpeg;base64,..."]`
- Supports Data URLs (base64), object storage paths, and legacy single-image strings
- Backend automatically normalizes all formats to JSON arrays for consistency

**Validation**:
- Client: Max 3 images, 5MB per image, image format validation
- Server: `validateImagemLocal()` enforces 3-image limit and 5MB size check
- Backend validation prevents bypassing client-side restrictions

**Data Migration**:
- Legacy single-image strings automatically converted to single-item arrays
- `normalizeImagemLocal()` ensures consistent JSON array format across all records
- Backward compatible with existing data

#### Recent Changes (October 2025)
- **Fixed Image Persistence**: Corrected `safeParseImagemLocal` to accept Data URLs as valid images
- **Edit Preservation**: Modal now preserves existing images when editing without modifications
- **Backend Normalization**: All image data normalized to JSON arrays on read
- **Server Validation**: Added validation in `createAlvara` and `updateAlvara` for limits enforcement
- **End-to-End Testing**: Comprehensive tests validating upload, display, edit, and removal workflows