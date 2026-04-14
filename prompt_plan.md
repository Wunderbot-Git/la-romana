# Ryder Cup Par 00 — Implementation Blueprint

## Executive Summary

This document provides a comprehensive, phased approach to building the Ryder Cup Par 00 application. The implementation is broken into **9 phases** with **~35 discrete prompts** designed for incremental, test-driven development.

---

## High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js PWA (Mobile-First)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Leaderboard │  │ Score Entry │  │     My Flight       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                           │                                  │
│              ┌────────────┴────────────┐                    │
│              │    IndexedDB + Sync     │                    │
│              └────────────┬────────────┘                    │
└───────────────────────────┼─────────────────────────────────┘
                            │ REST API
┌───────────────────────────┼─────────────────────────────────┐
│                     Node.js API (Fastify)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Auth     │  │   Scoring   │  │    Match Engine     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                      PostgreSQL                             │
│   users, events, flights, players, scores, audit_log        │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase Breakdown

| Phase | Focus | Prompts | Key Deliverables |
|-------|-------|---------|------------------|
| 1 | Project Foundation | 1-4 | Monorepo, DB, migrations, basic health endpoint |
| 2 | Authentication | 5-7 | User registration, login, JWT middleware |
| 3 | Event & Course Setup | 8-12 | Event CRUD, course/tees/holes, overrides |
| 4 | Players & Flights | 13-15 | Player management, flight assignment, validation |
| 5 | Scoring Engine | 16-20 | Handicap calc, stroke allocation, net scores |
| 6 | Match Engine | 21-25 | Singles, fourball, scramble, point allocation |
| 7 | API Integration | 26-28 | Score endpoints, leaderboard, authorization |
| 8 | Frontend Foundation | 29-31 | Next.js PWA, routing, API client |
| 9 | Frontend Features & Offline | 32-35 | UI components, IndexedDB, sync |

---

## Detailed Phase Plans

### Phase 1: Project Foundation (Prompts 1-4)

**Goal:** Establish monorepo structure, database connection, and core infrastructure.

**Dependencies:** None

**Deliverables:**
- Monorepo with `packages/api` and `packages/web`
- PostgreSQL connection with migrations framework
- Health check endpoint with tests
- Core database schema (users, events base tables)

---

### Phase 2: Authentication (Prompts 5-7)

**Goal:** Complete user authentication flow with JWT tokens.

**Dependencies:** Phase 1

**Deliverables:**
- User registration with password hashing
- Login with JWT generation
- Auth middleware for protected routes
- Password reset flow

---

### Phase 3: Event & Course Setup (Prompts 8-12)

**Goal:** Event lifecycle management and course configuration.

**Dependencies:** Phase 2

**Deliverables:**
- Event CRUD with state machine
- Course/tees/holes data model
- Stroke index overrides
- Mixed scramble stroke index table

---

### Phase 4: Players & Flights (Prompts 13-15)

**Goal:** Player roster and flight organization.

**Dependencies:** Phase 3

**Deliverables:**
- Player creation with handicap
- Flight assignment with validation (4 per flight, 2v2)
- Event join via code
- Event membership roles

---

### Phase 5: Scoring Engine (Prompts 16-20)

**Goal:** Core scoring calculations as pure functions.

**Dependencies:** Phase 4

**Deliverables:**
- Playing handicap calculation (80% singles/fourball, P% scramble)
- Stroke allocation algorithm
- Net score computation
- Mixed tee handling for scramble

---

### Phase 6: Match Engine (Prompts 21-25)

**Goal:** Match state tracking and point allocation.

**Dependencies:** Phase 5

**Deliverables:**
- Singles match-play logic
- Fourball best-ball logic
- Scramble match logic
- Early clinch detection
- Point allocation and splitting

---

### Phase 7: API Integration (Prompts 26-28)

**Goal:** Wire scoring engine to REST endpoints with authorization.

**Dependencies:** Phase 6

**Deliverables:**
- Score entry endpoints with idempotency
- Leaderboard aggregation endpoint
- Flight-based authorization middleware
- Segment reopen/complete endpoints

---

### Phase 8: Frontend Foundation (Prompts 29-31)

**Goal:** Next.js PWA setup with core infrastructure.

**Dependencies:** Phase 7

**Deliverables:**
- Next.js with PWA configuration
- API client with auth handling
- Core layout and navigation
- Basic routing structure

---

### Phase 9: Frontend Features & Offline (Prompts 32-35)

**Goal:** Complete UI and offline-first capabilities.

**Dependencies:** Phase 8

**Deliverables:**
- Leaderboard component
- Score entry grid
- My Flight history view
- IndexedDB persistence
- Background sync with conflict resolution
- Spectator view

---

## Implementation Prompts

---

### **PROMPT 1: Monorepo and Project Structure**

```text
You are building a golf tournament scoring application called "Ryder Cup Par 00". 

Create the initial monorepo project structure using npm workspaces with the following layout:

ryder-cup-par00/
├── package.json (workspaces root)
├── packages/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts (entry point)
│   │   │   ├── app.ts (Fastify app setup)
│   │   │   └── config/
│   │   │       └── env.ts (environment config)
│   │   └── tests/
│   │       └── setup.ts
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── types/
│               └── index.ts (shared TypeScript types)
├── .env.example
├── .gitignore
└── README.md

Requirements:
1. Use TypeScript for all packages
2. Use Fastify for the API server
3. Configure the shared package to be importable as `@ryder-cup/shared`
4. Configure the api package as `@ryder-cup/api`
5. Set up Vitest for testing in the api package
6. Create a basic Fastify app that listens on PORT from environment (default 3001)
7. Add a GET /health endpoint that returns { status: "ok", timestamp: <ISO string> }
8. Write a test for the health endpoint using Vitest and supertest (or light-my-request)

The shared types package should export these initial types:

export type EventState = 'draft' | 'live' | 'completed' | 'closed';
export type SegmentState = 'open' | 'completed' | 'reopened';
export type Team = 'red' | 'blue';
export type Role = 'organizer' | 'player';
export type MatchType = 'fourball' | 'singles1' | 'singles2' | 'scramble';
export type MatchStatus = 'up' | 'down' | 'as' | 'dormie' | 'final';

Include proper npm scripts:
- `dev` - run api in development mode with hot reload
- `build` - build all packages
- `test` - run all tests
- `test:watch` - run tests in watch mode

Ensure the health endpoint test passes before completing.
```

---

### **PROMPT 2: Database Connection and Migration Setup**

```text
Building on the existing monorepo structure, add PostgreSQL database connectivity and migration infrastructure.

Requirements:

1. Add the following dependencies to @ryder-cup/api:
   - pg (PostgreSQL client)
   - postgres-migrations (for migration management)
   - Add @types/pg as dev dependency

2. Create database configuration in `src/config/database.ts`:
   - Read DATABASE_URL from environment
   - Export a function to get a connection pool
   - Export a function to run migrations
   - Export a function to close the pool

3. Create the migrations directory structure:
   packages/api/
   └── migrations/
       └── 001_initial_schema.sql

4. The initial migration (001_initial_schema.sql) should create:
   -- Users table (basic structure, we'll add auth fields next)
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Events table
   CREATE TABLE events (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(255) NOT NULL,
     event_code VARCHAR(20) UNIQUE NOT NULL,
     state VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'live', 'completed', 'closed')),
     created_by_user_id UUID NOT NULL REFERENCES users(id),
     scramble_percent DECIMAL(5,2) DEFAULT 0.20,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     closed_at TIMESTAMPTZ
   );

   CREATE INDEX idx_events_event_code ON events(event_code);
   CREATE INDEX idx_events_state ON events(state);

5. Modify app startup (src/index.ts) to:
   - Run migrations on startup
   - Gracefully handle database connection errors
   - Close pool on SIGTERM/SIGINT

6. Update the health endpoint to include database connectivity check:
   {
     status: "ok",
     timestamp: "...",
     database: "connected" | "disconnected"
   }

7. Create a test helper in `tests/helpers/db.ts`:
   - Function to set up a test database connection
   - Function to truncate all tables between tests
   - Function to close test database connection

8. Write tests that verify:
   - Database connection succeeds
   - Migrations run successfully
   - Health endpoint reports database status correctly

Add npm script:
- `migrate` - run migrations manually

Environment variables needed (.env.example):
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ryder_cup_dev
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/ryder_cup_test
```

---

### **PROMPT 3: Complete Database Schema - Core Tables**

```text
Building on the existing database setup, create a migration that adds all core domain tables.

Create migration `002_core_tables.sql` with the following tables:

1. **event_members** - Links users to events with roles
   CREATE TABLE event_members (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
     user_id UUID NOT NULL REFERENCES users(id),
     role VARCHAR(20) NOT NULL CHECK (role IN ('organizer', 'player')),
     flight_id UUID, -- Will reference flights table, added as FK later
     created_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(event_id, user_id)
   );

2. **flights** - Groups of 4 players
   CREATE TABLE flights (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
     flight_number INTEGER NOT NULL,
     front_state VARCHAR(20) DEFAULT 'open' CHECK (front_state IN ('open', 'completed', 'reopened')),
     back_state VARCHAR(20) DEFAULT 'open' CHECK (back_state IN ('open', 'completed', 'reopened')),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(event_id, flight_number)
   );

3. **players** - Event-scoped player records
   CREATE TABLE players (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
     user_id UUID REFERENCES users(id), -- Optional link to user account
     display_name VARCHAR(255) NOT NULL,
     handicap_index DECIMAL(4,1) NOT NULL,
     tee_id UUID, -- Will reference tees table
     team VARCHAR(10) NOT NULL CHECK (team IN ('red', 'blue')),
     flight_id UUID REFERENCES flights(id),
     position INTEGER NOT NULL CHECK (position IN (1, 2)), -- Position within team in flight
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   CREATE INDEX idx_players_event ON players(event_id);
   CREATE INDEX idx_players_flight ON players(flight_id);

4. **courses** - Event-scoped course data
   CREATE TABLE courses (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
     name VARCHAR(255) NOT NULL,
     source VARCHAR(20) NOT NULL CHECK (source IN ('api', 'manual')),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(event_id) -- One course per event
   );

5. **tees** - Tee sets for a course
   CREATE TABLE tees (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
     name VARCHAR(100) NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

6. **holes** - Hole data per tee
   CREATE TABLE holes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tee_id UUID NOT NULL REFERENCES tees(id) ON DELETE CASCADE,
     hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
     par INTEGER,
     stroke_index INTEGER NOT NULL CHECK (stroke_index BETWEEN 1 AND 18),
     UNIQUE(tee_id, hole_number)
   );

7. Add foreign key constraints that were deferred:
   ALTER TABLE event_members ADD CONSTRAINT fk_event_members_flight 
     FOREIGN KEY (flight_id) REFERENCES flights(id);
   
   ALTER TABLE players ADD CONSTRAINT fk_players_tee 
     FOREIGN KEY (tee_id) REFERENCES tees(id);

Write tests that:
1. Verify all tables are created with correct columns
2. Verify foreign key constraints work (insert parent, then child)
3. Verify check constraints reject invalid values
4. Verify unique constraints prevent duplicates
```

---

### **PROMPT 4: Database Schema - Scoring and Audit Tables**

```text
Create migration `003_scoring_tables.sql` to add scoring and audit infrastructure.

1. **hole_overrides** - Event-specific stroke index overrides
   CREATE TABLE hole_overrides (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
     tee_id UUID NOT NULL REFERENCES tees(id) ON DELETE CASCADE,
     hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
     stroke_index_override INTEGER NOT NULL CHECK (stroke_index_override BETWEEN 1 AND 18),
     UNIQUE(event_id, tee_id, hole_number)
   );

2. **mixed_scramble_stroke_index** - Global scramble SI for mixed tees
   CREATE TABLE mixed_scramble_stroke_index (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
     hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
     stroke_index INTEGER NOT NULL CHECK (stroke_index BETWEEN 1 AND 18),
     UNIQUE(event_id, hole_number)
   );

3. **hole_scores** - Per-player gross scores (front 9 canonical source)
   CREATE TABLE hole_scores (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
     flight_id UUID NOT NULL REFERENCES flights(id),
     player_id UUID NOT NULL REFERENCES players(id),
     hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
     gross_score INTEGER NOT NULL CHECK (gross_score > 0),
     entered_by_user_id UUID NOT NULL REFERENCES users(id),
     source VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (source IN ('online', 'offline')),
     client_timestamp TIMESTAMPTZ NOT NULL,
     server_timestamp TIMESTAMPTZ DEFAULT NOW(),
     version INTEGER NOT NULL DEFAULT 1,
     mutation_id UUID NOT NULL,
     UNIQUE(event_id, player_id, hole_number),
     UNIQUE(mutation_id)
   );

   CREATE INDEX idx_hole_scores_flight ON hole_scores(flight_id);
   CREATE INDEX idx_hole_scores_player ON hole_scores(player_id);

4. **scramble_team_scores** - Team scores for back 9 scramble
   CREATE TABLE scramble_team_scores (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
     flight_id UUID NOT NULL REFERENCES flights(id),
     team VARCHAR(10) NOT NULL CHECK (team IN ('red', 'blue')),
     hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 10 AND 18),
     gross_score INTEGER NOT NULL CHECK (gross_score > 0),
     entered_by_user_id UUID NOT NULL REFERENCES users(id),
     source VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (source IN ('online', 'offline')),
     client_timestamp TIMESTAMPTZ NOT NULL,
     server_timestamp TIMESTAMPTZ DEFAULT NOW(),
     version INTEGER NOT NULL DEFAULT 1,
     mutation_id UUID NOT NULL,
     UNIQUE(event_id, flight_id, team, hole_number),
     UNIQUE(mutation_id)
   );

   CREATE INDEX idx_scramble_scores_flight ON scramble_team_scores(flight_id);

5. **audit_log** - Organizer-visible audit trail
   CREATE TABLE audit_log (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
     entity_type VARCHAR(50) NOT NULL,
     entity_id UUID NOT NULL,
     action VARCHAR(50) NOT NULL,
     previous_value JSONB,
     new_value JSONB,
     by_user_id UUID NOT NULL REFERENCES users(id),
     source VARCHAR(20) NOT NULL DEFAULT 'online',
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE INDEX idx_audit_log_event ON audit_log(event_id);
   CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

6. **spectator_tokens** - Read-only access tokens
   CREATE TABLE spectator_tokens (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
     token VARCHAR(64) UNIQUE NOT NULL,
     created_by_user_id UUID NOT NULL REFERENCES users(id),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     expires_at TIMESTAMPTZ
   );

   CREATE INDEX idx_spectator_tokens_token ON spectator_tokens(token);

Write tests that:
1. Verify score tables enforce hole number ranges correctly
2. Verify mutation_id uniqueness prevents duplicate submissions
3. Verify audit_log can store JSONB values
4. Test the unique constraint on (event_id, player_id, hole_number) for hole_scores
```

---

### **PROMPT 5: User Registration and Password Hashing**

```text
Implement user registration with secure password hashing.

Requirements:

1. Add dependencies to @ryder-cup/api:
   - bcrypt (for password hashing)
   - @types/bcrypt (dev dependency)

2. Create user repository in `src/repositories/userRepository.ts`:
   interface CreateUserInput {
     email: string;
     password: string;
   }
   
   interface User {
     id: string;
     email: string;
     createdAt: Date;
   }
   
   // Functions:
   // - createUser(input: CreateUserInput): Promise<User>
   // - findByEmail(email: string): Promise<User | null>
   // - findById(id: string): Promise<User | null>
   // - verifyPassword(email: string, password: string): Promise<User | null>

3. Create user service in `src/services/userService.ts`:
   - validateEmail(email: string): boolean - basic email format validation
   - validatePassword(password: string): { valid: boolean; errors: string[] } 
     - Minimum 8 characters
     - At least one number
     - At least one letter
   - registerUser(email: string, password: string): Promise<User>

4. Create auth routes in `src/routes/auth.ts`:
   POST /auth/signup
   Request body: { email: string, password: string }
   
   Success response (201):
   { user: { id, email, createdAt } }
   
   Error responses:
   - 400: { error: "Invalid email format" }
   - 400: { error: "Password must be at least 8 characters" }
   - 409: { error: "Email already registered" }

5. Register the auth routes in the Fastify app.

6. Update shared types to include:
   export interface UserResponse {
     id: string;
     email: string;
     createdAt: string;
   }
   
   export interface SignupRequest {
     email: string;
     password: string;
   }
   
   export interface AuthResponse {
     user: UserResponse;
   }

Write tests:
1. Unit tests for password validation rules
2. Unit tests for email validation
3. Integration tests for POST /auth/signup:
   - Successful registration
   - Duplicate email rejection
   - Invalid email format rejection
   - Weak password rejection
4. Verify password is hashed (not stored plain text)
```

---

### **PROMPT 6: User Login and JWT Authentication**

```text
Implement user login with JWT token generation.

Requirements:

1. Add dependencies:
   - @fastify/jwt (Fastify JWT plugin)

2. Create JWT configuration in `src/config/jwt.ts`:
   - Read JWT_SECRET from environment
   - Set token expiry to 7 days
   - Export typed token payload interface

3. Update shared types:
   export interface LoginRequest {
     email: string;
     password: string;
   }
   
   export interface LoginResponse {
     user: UserResponse;
     token: string;
   }
   
   export interface JWTPayload {
     userId: string;
     email: string;
   }

4. Register @fastify/jwt with Fastify in app.ts

5. Add login endpoint to auth routes:
   POST /auth/login
   Request body: { email: string, password: string }
   
   Success response (200):
   { 
     user: { id, email, createdAt },
     token: "jwt_token_here"
   }
   
   Error responses:
   - 401: { error: "Invalid email or password" }

6. Add logout endpoint (for future token blacklisting, currently just returns success):
   POST /auth/logout
   Headers: Authorization: Bearer <token>
   
   Success response (200):
   { message: "Logged out successfully" }

7. Create auth middleware in `src/middleware/auth.ts`:
   // Fastify preHandler that:
   // - Extracts Bearer token from Authorization header
   // - Verifies JWT
   // - Attaches user info to request
   // - Returns 401 if invalid/missing token

8. Add a protected test endpoint:
   GET /auth/me
   Headers: Authorization: Bearer <token>
   
   Success response (200):
   { user: { id, email, createdAt } }

Write tests:
1. Successful login returns valid JWT
2. Invalid password returns 401
3. Non-existent email returns 401
4. Protected route rejects missing token
5. Protected route rejects invalid token
6. Protected route accepts valid token and returns user
7. Token payload contains correct user info
```

---

### **PROMPT 7: Password Reset Flow**

```text
Implement password reset functionality.

Requirements:

1. Create migration `004_password_reset.sql`:
   CREATE TABLE password_reset_tokens (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     token VARCHAR(64) UNIQUE NOT NULL,
     expires_at TIMESTAMPTZ NOT NULL,
     used_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);

2. Add to userRepository.ts:
   - createPasswordResetToken(userId: string): Promise<string>
   - findValidResetToken(token: string): Promise<{ userId: string } | null>
   - markResetTokenUsed(token: string): Promise<void>
   - updatePassword(userId: string, newPasswordHash: string): Promise<void>

3. Create password reset service in userService.ts:
   - requestPasswordReset(email: string): Promise<{ token: string } | null>
     - Generate secure random token (32 bytes, hex encoded)
     - Token expires in 1 hour
     - Return null if email not found (but don't reveal this to client)
   - resetPassword(token: string, newPassword: string): Promise<boolean>
     - Validate new password meets requirements
     - Verify token is valid and not expired
     - Update password and mark token as used

4. Add password reset endpoints to auth routes:
   POST /auth/reset-request
   Request body: { email: string }
   
   Success response (200):
   { message: "If that email exists, a reset link has been sent" }
   // Note: In v1, we're not actually sending emails
   // For testing, return the token in development mode only
   
   POST /auth/reset-confirm
   Request body: { token: string, newPassword: string }
   
   Success response (200):
   { message: "Password has been reset" }
   
   Error responses:
   - 400: { error: "Invalid or expired reset token" }
   - 400: { error: "Password does not meet requirements" }

5. Update .env.example:
   NODE_ENV=development

Write tests:
1. Request reset for existing email creates token
2. Request reset for non-existent email still returns 200 (security)
3. Valid token allows password reset
4. Expired token rejected
5. Already-used token rejected
6. New password must meet validation rules
7. After reset, user can login with new password
8. After reset, old password no longer works
```

---

### **PROMPT 8: Event Creation and Basic CRUD**

```text
Implement event creation and management endpoints.

Requirements:

1. Create event repository in `src/repositories/eventRepository.ts`:
   interface CreateEventInput {
     name: string;
     createdByUserId: string;
     scramblePercent?: number; // Default 0.20
   }
   
   interface Event {
     id: string;
     name: string;
     eventCode: string;
     state: EventState;
     createdByUserId: string;
     scramblePercent: number;
     createdAt: Date;
     updatedAt: Date;
     closedAt: Date | null;
   }
   
   // Functions:
   // - createEvent(input: CreateEventInput): Promise<Event>
   // - findById(id: string): Promise<Event | null>
   // - findByCode(code: string): Promise<Event | null>
   // - updateState(id: string, newState: EventState): Promise<Event>
   // - updateEvent(id: string, updates: Partial<Event>): Promise<Event>

2. Create event code generator utility in `src/utils/codeGenerator.ts`:
   - generateEventCode(): string
   - 6 alphanumeric characters, uppercase, avoiding ambiguous chars (0/O, 1/I/L)
   - Should be human-readable and easy to type on mobile

3. Create event service in `src/services/eventService.ts`:
   - createEvent(userId: string, name: string, scramblePercent?: number): Promise<Event>
     - Generate unique event code (retry if collision)
     - Create event in draft state
     - Add user as organizer in event_members
   - getEvent(eventId: string): Promise<Event | null>
   - validateStateTransition(currentState: EventState, newState: EventState): boolean
     - draft → live
     - live → completed
     - completed → closed
     - completed → live (reopen)

4. Create event_members repository in `src/repositories/eventMemberRepository.ts`:
   - addMember(eventId: string, userId: string, role: Role): Promise<void>
   - getMember(eventId: string, userId: string): Promise<EventMember | null>
   - isOrganizer(eventId: string, userId: string): Promise<boolean>

5. Create event routes in `src/routes/events.ts`:
   POST /events
   Auth: Required
   Request body: { name: string, scramblePercent?: number }
   
   Response (201):
   { event: { id, name, eventCode, state, scramblePercent, createdAt } }
   
   GET /events/:eventId
   Auth: Required (must be member or organizer)
   
   Response (200):
   { event: { id, name, eventCode, state, scramblePercent, createdAt, updatedAt } }
   
   POST /events/:eventId/state
   Auth: Required (organizer only)
   Request body: { state: EventState }
   
   Response (200):
   { event: { ... updated event } }
   
   Error responses:
   - 400: { error: "Invalid state transition" }
   - 403: { error: "Only organizers can change event state" }

Write tests:
1. Create event generates unique code
2. Create event adds creator as organizer
3. Get event works for organizer
4. State transitions follow valid paths
5. Invalid state transitions rejected
6. Non-organizer cannot change state
7. Event code is URL-safe and readable
```

---

### **PROMPT 9: Event Join and Membership**

```text
Implement the ability for players to join events via event code.

Requirements:

1. Extend event_members repository:
   - getMembers(eventId: string): Promise<EventMember[]>
   - getMemberByUserId(eventId: string, userId: string): Promise<EventMember | null>
   - updateMemberFlight(eventId: string, userId: string, flightId: string): Promise<void>

2. Extend event service:
   - joinEvent(userId: string, eventCode: string): Promise<{ event: Event; membership: EventMember }>
     - Find event by code
     - Verify event is in 'draft' or 'live' state
     - Check user isn't already a member
     - Add user as 'player' role
   - getEventMembers(eventId: string): Promise<EventMember[]>
   - getUserEvents(userId: string): Promise<Event[]>

3. Add join endpoint to event routes:
   POST /events/join
   Auth: Required
   Request body: { eventCode: string }
   
   Response (200):
   { 
     event: { id, name, eventCode, state, ... },
     membership: { role: 'player', flightId: null }
   }
   
   Errors:
   - 404: { error: "Event not found" }
   - 400: { error: "Event is not accepting new players" }
   - 409: { error: "Already a member of this event" }

4. Add endpoint to list user's events:
   GET /events
   Auth: Required
   
   Response (200):
   { 
     events: [
       { id, name, eventCode, state, role: 'organizer' | 'player', ... }
     ]
   }

5. Create authorization middleware in `src/middleware/eventAuth.ts`:
   - requireEventMember(eventId: string, userId: string): Promise<EventMember>
   - requireOrganizer(eventId: string, userId: string): Promise<void>
   - These will be used as preHandlers on routes

6. Update shared types:
   export interface EventMember {
     id: string;
     eventId: string;
     userId: string;
     role: Role;
     flightId: string | null;
     createdAt: string;
   }
   
   export interface JoinEventRequest {
     eventCode: string;
   }
   
   export interface EventWithRole extends Event {
     role: Role;
   }

Write tests:
1. Join event with valid code succeeds
2. Join event creates player membership
3. Join event with invalid code returns 404
4. Join closed event returns 400
5. Joining same event twice returns 409
6. List events shows all user's events with roles
7. Authorization middleware correctly identifies organizers
8. Authorization middleware correctly identifies members
```

---

### **PROMPT 10: Course and Tees Setup**

```text
Implement course configuration with tees and holes.

Requirements:

1. Create course repository in `src/repositories/courseRepository.ts`:
   interface CreateCourseInput {
     eventId: string;
     name: string;
     source: 'api' | 'manual';
   }
   
   interface CreateTeeInput {
     courseId: string;
     name: string;
   }
   
   interface CreateHoleInput {
     teeId: string;
     holeNumber: number;
     par: number | null;
     strokeIndex: number;
   }
   
   // Functions:
   // - createCourse(input: CreateCourseInput): Promise<Course>
   // - getCourseByEventId(eventId: string): Promise<Course | null>
   // - createTee(input: CreateTeeInput): Promise<Tee>
   // - getTeesByCourseId(courseId: string): Promise<Tee[]>
   // - createHoles(holes: CreateHoleInput[]): Promise<Hole[]>
   // - getHolesByTeeId(teeId: string): Promise<Hole[]>
   // - updateHole(teeId: string, holeNumber: number, updates: Partial<Hole>): Promise<Hole>

2. Create course service in `src/services/courseService.ts`:
   - createCourseManually(eventId: string, name: string, tees: TeeSetup[]): Promise<Course>
     - TeeSetup includes tee name and 18 holes with SI and optional par
   - validateTeeSetup(tees: TeeSetup[]): { valid: boolean; errors: string[] }
     - Each tee must have 18 holes
     - Stroke index must be 1-18 with no duplicates per tee
   - getCourseWithTees(eventId: string): Promise<CourseWithTees | null>

3. Create course routes in `src/routes/courses.ts`:
   POST /events/:eventId/course
   Auth: Organizer only
   Request body: {
     name: string,
     source: 'manual',
     tees: [
       {
         name: string,
         holes: [
           { holeNumber: 1, par: 4, strokeIndex: 7 },
           // ... 18 holes
         ]
       }
     ]
   }
   
   Response (201):
   { 
     course: { id, name, source },
     tees: [{ id, name, holes: [...] }]
   }
   
   Errors:
   - 400: { error: "Each tee must have exactly 18 holes" }
   - 400: { error: "Stroke index must be unique 1-18 per tee" }
   - 409: { error: "Course already exists for this event" }
   
   GET /events/:eventId/course
   Auth: Event member
   
   Response (200):
   { 
     course: { id, name, source },
     tees: [{ id, name, holes: [...] }]
   }

4. Update shared types:
   export interface Course {
     id: string;
     eventId: string;
     name: string;
     source: 'api' | 'manual';
     createdAt: string;
   }
   
   export interface Tee {
     id: string;
     courseId: string;
     name: string;
   }
   
   export interface Hole {
     id: string;
     teeId: string;
     holeNumber: number;
     par: number | null;
     strokeIndex: number;
   }
   
   export interface TeeWithHoles extends Tee {
     holes: Hole[];
   }
   
   export interface CourseWithTees extends Course {
     tees: TeeWithHoles[];
   }

Write tests:
1. Create course with valid tee data succeeds
2. Reject course with missing holes
3. Reject course with duplicate stroke indexes
4. Reject stroke index outside 1-18 range
5. Get course returns full structure with tees and holes
6. Only organizer can create course
7. Cannot create second course for same event
```

---

### **PROMPT 11: Stroke Index Overrides**

```text
Implement stroke index override functionality for organizers.

Requirements:

1. Create override repository in `src/repositories/overrideRepository.ts`:
   interface HoleOverride {
     id: string;
     eventId: string;
     teeId: string;
     holeNumber: number;
     strokeIndexOverride: number;
   }
   
   // Functions:
   // - setHoleOverride(eventId: string, teeId: string, holeNumber: number, strokeIndex: number): Promise<HoleOverride>
   // - getHoleOverrides(eventId: string): Promise<HoleOverride[]>
   // - getHoleOverridesForTee(eventId: string, teeId: string): Promise<HoleOverride[]>
   // - deleteHoleOverride(eventId: string, teeId: string, holeNumber: number): Promise<void>

2. Extend course service with override logic:
   - setStrokeIndexOverrides(eventId: string, overrides: OverrideInput[]): Promise<void>
     - OverrideInput: { teeId: string, holeNumber: number, strokeIndex: number }
   - getEffectiveStrokeIndex(eventId: string, teeId: string, holeNumber: number): Promise<number>
     - Returns override if exists, otherwise base hole stroke index
   - getEffectiveHoles(eventId: string, teeId: string): Promise<EffectiveHole[]>
     - Returns holes with overrides applied

3. Add override endpoints to course routes:
   PUT /events/:eventId/course/overrides
   Auth: Organizer only
   Request body: {
     overrides: [
       { teeId: string, holeNumber: number, strokeIndex: number }
     ]
   }
   
   Response (200):
   { overrides: [...] }
   
   Errors:
   - 400: { error: "Invalid stroke index value" }
   - 400: { error: "Tee does not belong to this event's course" }
   - 400: { error: "Cannot modify overrides when event is live" }
   
   GET /events/:eventId/course/overrides
   Auth: Event member
   
   Response (200):
   { overrides: [...] }

4. Add validation:
   - Overrides can only be set in 'draft' state
   - Stroke index must be 1-18
   - Tee must belong to the event's course

5. Update shared types:
   export interface HoleOverride {
     eventId: string;
     teeId: string;
     holeNumber: number;
     strokeIndexOverride: number;
   }
   
   export interface EffectiveHole extends Hole {
     effectiveStrokeIndex: number; // After override applied
     isOverridden: boolean;
   }

Write tests:
1. Set override for valid hole succeeds
2. Override replaces base stroke index in effective holes
3. Delete override restores base stroke index
4. Cannot set override when event is live
5. Reject invalid tee ID
6. Reject stroke index outside 1-18
7. Multiple overrides for same event work correctly
```

---

### **PROMPT 12: Mixed Scramble Stroke Index**

```text
Implement the mixed scramble stroke index table for events with mixed tees.

Requirements:

1. Create mixed scramble repository in `src/repositories/mixedScrambleRepository.ts`:
   interface MixedScrambleSI {
     eventId: string;
     holeNumber: number;
     strokeIndex: number;
   }
   
   // Functions:
   // - setMixedScrambleSI(eventId: string, entries: { holeNumber: number, strokeIndex: number }[]): Promise<void>
   // - getMixedScrambleSI(eventId: string): Promise<MixedScrambleSI[]>
   // - getMixedScrambleSIForHole(eventId: string, holeNumber: number): Promise<number | null>

2. Extend course service:
   - setMixedScrambleStrokeIndex(eventId: string, entries: { holeNumber: number, strokeIndex: number }[]): Promise<void>
     - Must provide all 18 holes (or update individual holes)
     - Validate stroke indexes are 1-18 with no duplicates
   - getMixedScrambleStrokeIndex(eventId: string): Promise<MixedScrambleSI[]>
   - validateMixedScrambleSI(entries: { holeNumber: number, strokeIndex: number }[]): { valid: boolean; errors: string[] }

3. Add mixed scramble endpoints:
   PUT /events/:eventId/mixed-scramble-si
   Auth: Organizer only
   Request body: {
     entries: [
       { holeNumber: 1, strokeIndex: 10 },
       { holeNumber: 2, strokeIndex: 4 },
       // ... all 18 holes
     ]
   }
   
   Response (200):
   { 
     mixedScrambleSI: [
       { holeNumber: 1, strokeIndex: 10 },
       // ...
     ]
   }
   
   Errors:
   - 400: { error: "Must provide stroke index for all 18 holes" }
   - 400: { error: "Stroke indexes must be unique 1-18" }
   - 400: { error: "Cannot modify when event is live" }
   
   GET /events/:eventId/mixed-scramble-si
   Auth: Event member
   
   Response (200):
   { mixedScrambleSI: [...] }

4. Create utility function to determine if a scramble team is "mixed":
   // In src/utils/scrambleUtils.ts
   function isScrambleMixed(player1TeeId: string, player2TeeId: string): boolean {
     return player1TeeId !== player2TeeId;
   }

5. Update shared types:
   export interface MixedScrambleSI {
     eventId: string;
     holeNumber: number;
     strokeIndex: number;
   }
   
   export interface SetMixedScrambleSIRequest {
     entries: { holeNumber: number; strokeIndex: number }[];
   }

Write tests:
1. Set full 18-hole mixed scramble SI succeeds
2. Reject partial entries (must have all 18)
3. Reject duplicate stroke indexes
4. Reject stroke index outside 1-18
5. Cannot set when event is live
6. Get returns all 18 holes sorted by hole number
7. isScrambleMixed utility correctly identifies mixed teams
```

---

### **PROMPT 13: Player Creation and Management**

```text
Implement player roster management for events.

Requirements:

1. Create player repository in `src/repositories/playerRepository.ts`:
   interface CreatePlayerInput {
     eventId: string;
     userId?: string; // Optional link to user account
     displayName: string;
     handicapIndex: number;
     teeId: string;
     team: Team;
     flightId?: string;
     position?: 1 | 2;
   }
   
   interface Player {
     id: string;
     eventId: string;
     userId: string | null;
     displayName: string;
     handicapIndex: number;
     teeId: string;
     team: Team;
     flightId: string | null;
     position: number | null;
     createdAt: Date;
   }
   
   // Functions:
   // - createPlayer(input: CreatePlayerInput): Promise<Player>
   // - createPlayersBulk(inputs: CreatePlayerInput[]): Promise<Player[]>
   // - getPlayerById(id: string): Promise<Player | null>
   // - getPlayersByEventId(eventId: string): Promise<Player[]>
   // - getPlayersByFlightId(flightId: string): Promise<Player[]>
   // - updatePlayer(id: string, updates: Partial<Player>): Promise<Player>
   // - deletePlayer(id: string): Promise<void>

2. Create player service in `src/services/playerService.ts`:
   - createPlayers(eventId: string, players: CreatePlayerInput[]): Promise<Player[]>
     - Validate handicap index is reasonable (0-54)
     - Validate tee exists for this event's course
   - validatePlayerCount(count: number): { valid: boolean; error?: string }
     - Minimum 8 players
     - Must be divisible by 4
   - getPlayersWithTees(eventId: string): Promise<PlayerWithTee[]>
     - Include tee name for display

3. Create player routes in `src/routes/players.ts`:
   POST /events/:eventId/players
   Auth: Organizer only
   Request body: {
     players: [
       {
         displayName: string,
         handicapIndex: number,
         teeId: string,
         team: 'red' | 'blue',
         userId?: string // Optional link to existing user
       }
     ]
   }
   
   Response (201):
   { players: [...] }
   
   Errors:
   - 400: { error: "Handicap index must be between 0 and 54" }
   - 400: { error: "Invalid tee ID" }
   - 400: { error: "Cannot add players when event is closed" }
   
   GET /events/:eventId/players
   Auth: Event member
   
   Response (200):
   { 
     players: [
       { id, displayName, handicapIndex, teeId, teeName, team, flightId, position, ... }
     ]
   }
   
   PUT /events/:eventId/players/:playerId
   Auth: Organizer only
   Request body: { displayName?, handicapIndex?, teeId?, team? }
   
   Response (200):
   { player: {...} }
   
   DELETE /events/:eventId/players/:playerId
   Auth: Organizer only
   
   Response (200):
   { message: "Player deleted" }

4. Update shared types:
   export interface Player {
     id: string;
     eventId: string;
     userId: string | null;
     displayName: string;
     handicapIndex: number;
     teeId: string;
     team: Team;
     flightId: string | null;
     position: number | null;
     createdAt: string;
   }
   
   export interface PlayerWithTee extends Player {
     teeName: string;
   }
   
   export interface CreatePlayerRequest {
     displayName: string;
     handicapIndex: number;
     teeId: string;
     team: Team;
     userId?: string;
   }

Write tests:
1. Create single player succeeds
2. Create bulk players succeeds
3. Reject invalid handicap index
4. Reject invalid tee ID
5. Get players includes tee name
6. Update player modifies correct fields
7. Delete player removes from database
8. Cannot add players to closed event
```

---

### **PROMPT 14: Flight Creation and Assignment**

```text
Implement flight creation and player assignment to flights.

Requirements:

1. Create flight repository in `src/repositories/flightRepository.ts`:
   interface CreateFlightInput {
     eventId: string;
     flightNumber: number;
   }
   
   interface Flight {
     id: string;
     eventId: string;
     flightNumber: number;
     frontState: SegmentState;
     backState: SegmentState;
     createdAt: Date;
   }
   
   // Functions:
   // - createFlight(input: CreateFlightInput): Promise<Flight>
   // - createFlightsBulk(inputs: CreateFlightInput[]): Promise<Flight[]>
   // - getFlightById(id: string): Promise<Flight | null>
   // - getFlightsByEventId(eventId: string): Promise<Flight[]>
   // - updateFlightState(id: string, segment: 'front' | 'back', state: SegmentState): Promise<Flight>

2. Create flight service in `src/services/flightService.ts`:
   - createFlights(eventId: string, count: number): Promise<Flight[]>
     - Creates numbered flights 1 to count
   - assignPlayersToFlights(eventId: string, assignments: FlightAssignment[]): Promise<void>
     - FlightAssignment: { flightId: string, players: { playerId: string, position: 1 | 2 }[] }
   - validateFlightAssignments(eventId: string, assignments: FlightAssignment[]): { valid: boolean; errors: string[] }
     - Each flight must have exactly 4 players
     - Each flight must have 2 red, 2 blue
     - Each team must have positions 1 and 2
     - All players must belong to the event
   - getFlightWithPlayers(flightId: string): Promise<FlightWithPlayers>

3. Extend player repository:
   - assignToFlight(playerId: string, flightId: string, position: 1 | 2): Promise<Player>
   - clearFlightAssignments(eventId: string): Promise<void>

4. Create flight routes in `src/routes/flights.ts`:
   POST /events/:eventId/flights
   Auth: Organizer only
   Request body: {
     count: number // Number of flights to create
   }
   
   Response (201):
   { flights: [...] }
   
   PUT /events/:eventId/flights/assignments
   Auth: Organizer only
   Request body: {
     assignments: [
       {
         flightId: string,
         players: [
           { playerId: string, position: 1 },
           { playerId: string, position: 2 },
           { playerId: string, position: 1 }, // Different team
           { playerId: string, position: 2 }
         ]
       }
     ]
   }
   
   Response (200):
   { 
     flights: [
       { 
         id, flightNumber, 
         players: [
           { id, displayName, team, position, ... }
         ]
       }
     ]
   }
   
   Errors:
   - 400: { error: "Each flight must have exactly 4 players" }
   - 400: { error: "Each flight must have 2 red and 2 blue players" }
   - 400: { error: "Each team must have positions 1 and 2" }
   
   GET /events/:eventId/flights
   Auth: Event member
   
   Response (200):
   { 
     flights: [
       { id, flightNumber, frontState, backState, players: [...] }
     ]
   }
   
   GET /events/:eventId/flights/:flightId
   Auth: Event member
   
   Response (200):
   { flight: { id, flightNumber, frontState, backState, players: [...] } }

5. Update shared types:
   export interface Flight {
     id: string;
     eventId: string;
     flightNumber: number;
     frontState: SegmentState;
     backState: SegmentState;
     createdAt: string;
   }
   
   export interface FlightWithPlayers extends Flight {
     players: Player[];
   }
   
   export interface FlightAssignment {
     flightId: string;
     players: { playerId: string; position: 1 | 2 }[];
   }

Write tests:
1. Create flights generates sequential flight numbers
2. Assign players validates 4 per flight
3. Assign players validates 2 red, 2 blue per flight
4. Assign players validates positions 1 and 2 per team
5. Get flights includes players sorted by team and position
6. Reject assignment if player doesn't exist
7. Reject assignment if player from different event
8. Clear assignments removes all flight associations
```

---

### **PROMPT 15: Flight-Based Authorization**

```text
Implement flight-based authorization for score entry.

Requirements:

1. Extend event auth middleware in `src/middleware/eventAuth.ts`:
   // New functions:
   
   // Check if user is in a specific flight
   async function isFlightMember(userId: string, flightId: string): Promise<boolean>
   
   // Get user's flight in an event (returns null if not assigned)
   async function getUserFlight(userId: string, eventId: string): Promise<Flight | null>
   
   // Middleware: require user to be member of the specified flight OR organizer
   function requireFlightAccess(paramName: string = 'flightId'): FastifyPreHandler
   
   // Middleware: require user to be organizer
   function requireOrganizerAccess(): FastifyPreHandler

2. Update player repository to support user-based queries:
   - getPlayerByUserId(eventId: string, userId: string): Promise<Player | null>
   - getFlightByUserId(eventId: string, userId: string): Promise<Flight | null>

3. Create request context type in `src/types/request.ts`:
   interface AuthenticatedRequest extends FastifyRequest {
     user: {
       userId: string;
       email: string;
     };
     eventMember?: EventMember;
     flight?: Flight;
     player?: Player;
   }

4. Add authorization info to relevant routes:
   - Score entry routes (next phase) will use requireFlightAccess
   - Flight management routes use requireOrganizerAccess
   - Event read routes use basic membership check

5. Create test fixtures:
   - Create helper to set up full event with flights and players
   - Create helper to create users and assign them as players

6. Update shared types:
   export interface FlightAccessContext {
     userId: string;
     eventId: string;
     flightId: string;
     isOrganizer: boolean;
     isFlightMember: boolean;
   }

Write tests:
1. Flight member can access their own flight
2. Flight member cannot access other flights
3. Organizer can access any flight
4. Non-member cannot access any flight
5. User without flight assignment has no flight access
6. getUserFlight returns correct flight for assigned user
7. getUserFlight returns null for unassigned user
8. Middleware correctly populates request context
```

---

### **PROMPT 16: Handicap Calculation Module**

```text
Create the core handicap calculation module as pure functions.

Requirements:

1. Create handicap module in `src/scoring/handicap.ts`:
   // Constants
   const SINGLES_FOURBALL_ALLOWANCE = 0.80; // 80%
   const DEFAULT_SCRAMBLE_ALLOWANCE = 0.20; // 20% - configurable per event
   
   // Types
   interface PlayingHandicapInput {
     handicapIndex: number;
     allowancePercent: number;
   }
   
   interface ScrambleTeamHandicapInput {
     player1HandicapIndex: number;
     player2HandicapIndex: number;
     scramblePercent: number;
   }
   
   // Functions:
   
   /**
    * Calculate playing handicap for singles/fourball
    * Formula: round(handicapIndex * 0.80)
    * Rounding: nearest integer, .5 rounds up
    */
   function calculatePlayingHandicap(input: PlayingHandicapInput): number
   
   /**
    * Calculate team playing handicap for scramble
    * Formula: round((hcp1 + hcp2) * scramblePercent)
    */
   function calculateScrambleTeamHandicap(input: ScrambleTeamHandicapInput): number
   
   /**
    * Standard rounding: nearest integer, .5 rounds up
    */
   function roundHalfUp(value: number): number

2. Create stroke allocation module in `src/scoring/strokeAllocation.ts`:
   interface StrokeAllocationInput {
     playingHandicap: number;
     holeStrokeIndexes: { holeNumber: number; strokeIndex: number }[];
   }
   
   interface HoleStrokesResult {
     holeNumber: number;
     strokesReceived: number;
   }
   
   /**
    * Calculate strokes received per hole based on playing handicap
    * 
    * Rules:
    * - Receive strokes on holes with lowest SI first
    * - If PH = 10: 1 stroke on SI 1-10
    * - If PH = 18: 1 stroke on SI 1-18
    * - If PH = 19: 2 strokes on SI 1, 1 stroke on SI 2-18
    * - If PH = 36: 2 strokes on all holes
    * - If PH > 36: 3+ strokes on lowest SI holes
    */
   function calculateStrokeAllocation(input: StrokeAllocationInput): HoleStrokesResult[]
   
   /**
    * Get strokes received for a specific hole
    */
   function getStrokesForHole(playingHandicap: number, holeStrokeIndex: number): number

3. Create net score module in `src/scoring/netScore.ts`:
   interface NetScoreInput {
     grossScore: number;
     strokesReceived: number;
   }
   
   /**
    * Calculate net score for a hole
    * Formula: gross - strokes_received
    */
   function calculateNetScore(input: NetScoreInput): number
   
   /**
    * Calculate net scores for all holes
    */
   function calculateNetScoresForRound(
     grossScores: { holeNumber: number; grossScore: number }[],
     strokeAllocation: HoleStrokesResult[]
   ): { holeNumber: number; grossScore: number; netScore: number; strokesReceived: number }[]

4. Export all from `src/scoring/index.ts`

5. Add to shared types:
   export interface PlayingHandicap {
     playerId: string;
     handicapIndex: number;
     playingHandicap: number;
   }
   
   export interface HoleNetScore {
     holeNumber: number;
     grossScore: number;
     netScore: number;
     strokesReceived: number;
   }

Write comprehensive unit tests:
1. Playing handicap calculation:
   - HCP 10 * 0.80 = 8
   - HCP 15 * 0.80 = 12
   - HCP 11 * 0.80 = 8.8 → 9 (rounds up from .8)
   - HCP 0 * 0.80 = 0
2. Scramble team handicap:
   - (10 + 15) * 0.20 = 5
   - (5 + 7) * 0.20 = 2.4 → 2
3. Rounding:
   - 4.5 → 5 (rounds up)
   - 4.4 → 4
   - 4.6 → 5
4. Stroke allocation:
   - PH 10: strokes on SI 1-10
   - PH 18: strokes on SI 1-18
   - PH 20: 2 strokes on SI 1-2, 1 stroke on SI 3-18
   - PH 36: 2 strokes on all holes
5. Net score:
   - Gross 5, strokes 1 → Net 4
   - Gross 4, strokes 0 → Net 4
```

---

### **PROMPT 17: Match-Play Scoring Logic**

```text
Create the match-play scoring logic for tracking hole-by-hole results.

Requirements:

1. Create match status module in `src/scoring/matchStatus.ts`:
   interface HoleResult {
     holeNumber: number;
     redScore: number; // Net score for red
     blueScore: number; // Net score for blue
   }
   
   interface MatchState {
     status: MatchStatus; // 'up' | 'down' | 'as' | 'dormie' | 'final'
     lead: number; // Positive = Red leads, Negative = Blue leads, 0 = A/S
     leadingTeam: Team | null;
     holesPlayed: number;
     holesRemaining: number;
     isFinal: boolean;
     isDecided: boolean; // Can be final early due to clinch
   }
   
   /**
    * Calculate match state from hole results
    */
   function calculateMatchState(
     holeResults: HoleResult[],
     totalHoles: number
   ): MatchState
   
   /**
    * Determine if match is mathematically decided (early clinch)
    * Match is decided when lead > holes remaining
    */
   function isMatchDecided(lead: number, holesRemaining: number): boolean
   
   /**
    * Get match status string
    * Examples: "2 UP", "3 DOWN", "A/S", "DORMIE", "3&2", "1 UP"
    */
   function formatMatchStatus(state: MatchState): string
   
   /**
    * Compare two net scores for a hole
    * Returns: 1 (red wins), -1 (blue wins), 0 (halve)
    */
   function compareHoleScores(redNet: number, blueNet: number): number

2. Create match result module in `src/scoring/matchResult.ts`:
   interface MatchResult {
     matchType: MatchType;
     redPoints: number;
     bluePoints: number;
     finalStatus: string; // e.g., "3&2", "1 UP", "A/S"
     decidedAtHole: number | null; // Hole where match was decided (if early)
   }
   
   /**
    * Calculate final match result and points
    * 
    * Point rules:
    * - 1-point match: winner gets 1, or 0.5 each on tie
    * - 2-point match (scramble): winner gets 2, or 1 each on tie
    */
   function calculateMatchResult(
     state: MatchState,
     pointValue: number
   ): MatchResult

3. Add match formatting utilities:
   /**
    * Format match result for display
    * Examples:
    * - "Red 3&2" (Red won 3 up with 2 to play)
    * - "Blue 1 UP" (Blue won 1 up at final hole)
    * - "HALVED" (Tie)
    */
   function formatFinalResult(result: MatchResult): string

4. Update shared types:
   export type MatchStatus = 'up' | 'down' | 'as' | 'dormie' | 'final';
   
   export interface MatchState {
     status: MatchStatus;
     lead: number;
     leadingTeam: Team | null;
     holesPlayed: number;
     holesRemaining: number;
     isFinal: boolean;
     isDecided: boolean;
   }
   
   export interface MatchResult {
     matchType: MatchType;
     redPoints: number;
     bluePoints: number;
     finalStatus: string;
     decidedAtHole: number | null;
   }

Write comprehensive unit tests:
1. Match state calculations:
   - All halves → A/S, lead 0
   - Red wins first 3 holes → Red 3 UP
   - Blue wins 5, Red wins 2 → Blue 3 UP
2. Early clinch detection:
   - 4 up with 3 to play → decided
   - 3 up with 3 to play → dormie (not decided)
   - 3 up with 2 to play → decided (3&2)
3. Point allocation:
   - 1-point match, Red wins → Red 1, Blue 0
   - 1-point match, tie → Red 0.5, Blue 0.5
   - 2-point match, Blue wins → Red 0, Blue 2
   - 2-point match, tie → Red 1, Blue 1
4. Status formatting:
   - Lead 3, 2 remaining, decided → "3&2"
   - Lead 1, 0 remaining → "1 UP"
   - Lead 0, 0 remaining → "A/S"
```

---

### **PROMPT 18: Singles Match Engine**

```text
Create the singles match engine that calculates match state from scores.

Requirements:

1. Create singles match engine in `src/scoring/singlesMatch.ts`:
   interface SinglesMatchInput {
     matchType: 'singles1' | 'singles2';
     redPlayer: {
       playerId: string;
       handicapIndex: number;
       teeId: string;
     };
     bluePlayer: {
       playerId: string;
       handicapIndex: number;
       teeId: string;
     };
     holes: {
       holeNumber: number;
       strokeIndex: number;
       redGross: number | null;
       blueGross: number | null;
     }[];
   }
   
   interface SinglesMatchOutput {
     matchType: 'singles1' | 'singles2';
     redPlayingHandicap: number;
     bluePlayingHandicap: number;
     holeResults: {
       holeNumber: number;
       redGross: number;
       redNet: number;
       redStrokes: number;
       blueGross: number;
       blueNet: number;
       blueStrokes: number;
       holeWinner: Team | null; // null = halve
     }[];
     matchState: MatchState;
     result: MatchResult | null; // null if not finished
   }
   
   /**
    * Calculate complete singles match state
    */
   function calculateSinglesMatch(input: SinglesMatchInput): SinglesMatchOutput

2. Create a service that ties scoring modules together in `src/services/scoringService.ts`:
   interface CalculateSinglesInput {
     eventId: string;
     flightId: string;
     matchType: 'singles1' | 'singles2';
   }
   
   /**
    * Load data and calculate singles match for a flight
    */
   async function calculateSinglesMatchForFlight(
     input: CalculateSinglesInput
   ): Promise<SinglesMatchOutput>

3. Add helpers for loading effective stroke indexes:
   /**
    * Get effective stroke index for a hole, considering overrides
    */
   async function getEffectiveStrokeIndexes(
     eventId: string,
     teeId: string
   ): Promise<{ holeNumber: number; strokeIndex: number }[]>

4. Export from scoring index

Write comprehensive unit tests:
1. Singles match with no strokes difference:
   - Both players same handicap
   - Lower gross wins each hole
2. Singles match with stroke advantage:
   - Higher handicap player receives strokes
   - Strokes applied on correct SI holes
3. Singles match progression:
   - Track lead through all 9 holes
   - Verify status at each point
4. Early clinch:
   - Player goes 5 up after 4 holes
   - Match marked decided/final
5. Full 9-hole scenarios:
   - Tie match
   - 1 UP finish
   - 3&2 finish
6. Integration test with real data loading
```

---

### **PROMPT 19: Fourball Match Engine**

```text
Create the fourball (best-ball) match engine.

Requirements:

1. Create fourball match engine in `src/scoring/fourballMatch.ts`:
   interface FourballMatchInput {
     redPlayers: {
       player1: { playerId: string; handicapIndex: number; teeId: string };
       player2: { playerId: string; handicapIndex: number; teeId: string };
     };
     bluePlayers: {
       player1: { playerId: string; handicapIndex: number; teeId: string };
       player2: { playerId: string; handicapIndex: number; teeId: string };
     };
     holes: {
       holeNumber: number;
       strokeIndex: number; // Need both tees' SI if different
       red1Gross: number | null;
       red2Gross: number | null;
       blue1Gross: number | null;
       blue2Gross: number | null;
     }[];
   }
   
   interface FourballHoleResult {
     holeNumber: number;
     redTeam: {
       player1: { gross: number; net: number; strokes: number };
       player2: { gross: number; net: number; strokes: number };
       bestNet: number;
       bestBallPlayer: 'player1' | 'player2';
     };
     blueTeam: {
       player1: { gross: number; net: number; strokes: number };
       player2: { gross: number; net: number; strokes: number };
       bestNet: number;
       bestBallPlayer: 'player1' | 'player2';
     };
     holeWinner: Team | null;
   }
   
   interface FourballMatchOutput {
     playingHandicaps: {
       red1: number;
       red2: number;
       blue1: number;
       blue2: number;
     };
     holeResults: FourballHoleResult[];
     matchState: MatchState;
     result: MatchResult | null;
   }
   
   /**
    * Calculate complete fourball match state
    * 
    * Best ball rules:
    * - Each team's hole score is the lower net of their two players
    * - Compare team scores to determine hole winner
    */
   function calculateFourballMatch(input: FourballMatchInput): FourballMatchOutput

2. Handle mixed tees in fourball:
   /**
    * When players in same team have different tees,
    * each player uses their own tee's stroke index for stroke allocation
    */
   interface FourballMixedTeeHole {
     holeNumber: number;
     red1SI: number;
     red2SI: number;
     blue1SI: number;
     blue2SI: number;
   }

3. Extend scoring service:
   async function calculateFourballMatchForFlight(
     eventId: string,
     flightId: string
   ): Promise<FourballMatchOutput>

Write comprehensive unit tests:
1. Basic fourball:
   - One player carries team on a hole
   - Different player carries on next hole
2. Best ball selection:
   - Both players have same net → either selected
   - One player better → that player selected
3. Mixed tees handling:
   - Player A (harder tee, more strokes) vs Player B (easier tee)
   - Each uses their own SI for strokes
4. Match progression:
   - Full 9 holes
   - Early clinch (5 up after 4)
5. Tie scenarios:
   - Teams tie a hole (same best net)
   - Match ends tied
6. Edge cases:
   - One player picks up (no score) - other player's score counts
```

---

### **PROMPT 20: Scramble Match Engine**

```text
Create the scramble match engine for back 9.

Requirements:

1. Create scramble match engine in `src/scoring/scrambleMatch.ts`:
   interface ScrambleMatchInput {
     scramblePercent: number; // Event's configurable percent (default 0.20)
     redTeam: {
       player1: { playerId: string; handicapIndex: number; teeId: string };
       player2: { playerId: string; handicapIndex: number; teeId: string };
     };
     blueTeam: {
       player1: { playerId: string; handicapIndex: number; teeId: string };
       player2: { playerId: string; handicapIndex: number; teeId: string };
     };
     holes: {
       holeNumber: number; // 10-18
       strokeIndex: number; // From tee or mixed scramble SI
       redGross: number | null;
       blueGross: number | null;
     }[];
     useMixedScrambleSI: {
       red: boolean; // True if red team has mixed tees
       blue: boolean; // True if blue team has mixed tees
     };
   }
   
   interface ScrambleHoleResult {
     holeNumber: number;
     redTeam: { gross: number; net: number; strokes: number };
     blueTeam: { gross: number; net: number; strokes: number };
     holeWinner: Team | null;
   }
   
   interface ScrambleMatchOutput {
     teamHandicaps: {
       red: number;
       blue: number;
     };
     isMixed: {
       red: boolean;
       blue: boolean;
     };
     holeResults: ScrambleHoleResult[];
     matchState: MatchState;
     result: MatchResult | null; // Worth 2 points
   }
   
   /**
    * Calculate scramble match state
    * 
    * Scramble rules:
    * - Team handicap = (player1_hcp + player2_hcp) * scramblePercent
    * - If team has mixed tees: use mixed scramble SI
    * - If team has same tees: use that tee's SI
    * - Match is worth 2 points
    */
   function calculateScrambleMatch(input: ScrambleMatchInput): ScrambleMatchOutput

2. Create helper for determining SI to use:
   /**
    * Determine which stroke index table to use for a scramble team
    */
   function getScrambleStrokeIndexSource(
     player1TeeId: string,
     player2TeeId: string
   ): 'shared_tee' | 'mixed_scramble'

3. Extend scoring service:
   async function calculateScrambleMatchForFlight(
     eventId: string,
     flightId: string
   ): Promise<ScrambleMatchOutput>

4. Update shared types:
   export interface ScrambleTeamScores {
     red: { holeNumber: number; gross: number }[];
     blue: { holeNumber: number; gross: number }[];
   }

Write comprehensive unit tests:
1. Team handicap calculation:
   - (15 + 20) * 0.20 = 7
   - (10 + 10) * 0.20 = 4
2. Mixed vs same tee SI selection:
   - Both players same tee → use tee's SI
   - Players different tees → use mixed scramble SI
3. Stroke allocation:
   - Team with 7 handicap gets strokes on SI 1-7
4. Match progression (holes 10-18):
   - Full back 9
   - Early clinch (5&4)
5. Point value:
   - Winner gets 2 points
   - Tie gives 1 point each
6. Edge case:
   - Different scramble percentages (e.g., 0.25)
```

---

### **PROMPT 21: Flight Match Calculator**

```text
Create a unified flight match calculator that computes all matches for a flight.

Requirements:

1. Create flight match calculator in `src/scoring/flightMatchCalculator.ts`:
   interface FlightMatchesInput {
     eventId: string;
     flightId: string;
     event: {
       scramblePercent: number;
     };
     players: {
       red1: { playerId: string; handicapIndex: number; teeId: string };
       red2: { playerId: string; handicapIndex: number; teeId: string };
       blue1: { playerId: string; handicapIndex: number; teeId: string };
       blue2: { playerId: string; handicapIndex: number; teeId: string };
     };
     strokeIndexes: {
       red1Tee: { holeNumber: number; strokeIndex: number }[];
       red2Tee: { holeNumber: number; strokeIndex: number }[];
       blue1Tee: { holeNumber: number; strokeIndex: number }[];
       blue2Tee: { holeNumber: number; strokeIndex: number }[];
       mixedScramble: { holeNumber: number; strokeIndex: number }[];
     };
     frontNineScores: {
       red1: { holeNumber: number; gross: number | null }[];
       red2: { holeNumber: number; gross: number | null }[];
       blue1: { holeNumber: number; gross: number | null }[];
       blue2: { holeNumber: number; gross: number | null }[];
     };
     backNineScrambleScores: {
       red: { holeNumber: number; gross: number | null }[];
       blue: { holeNumber: number; gross: number | null }[];
     };
   }
   
   interface FlightMatchesOutput {
     singles1: SinglesMatchOutput;
     singles2: SinglesMatchOutput;
     fourball: FourballMatchOutput;
     scramble: ScrambleMatchOutput;
     totalPoints: {
       red: number;
       blue: number;
     };
     completedMatches: number;
     totalMatches: 4;
   }
   
   /**
    * Calculate all four matches for a flight
    */
   function calculateFlightMatches(input: FlightMatchesInput): FlightMatchesOutput

2. Create flight score aggregator:
   /**
    * Aggregate scores from database into calculator input format
    */
   async function getFlightScoreData(
     eventId: string,
     flightId: string
   ): Promise<FlightMatchesInput>

3. Create flight service method:
   // In src/services/flightService.ts
   
   async function getFlightMatchResults(
     eventId: string,
     flightId: string
   ): Promise<FlightMatchesOutput>

4. Update shared types:
   export interface FlightMatchSummary {
     flightId: string;
     flightNumber: number;
     matches: {
       fourball: MatchSummary;
       singles1: MatchSummary;
       singles2: MatchSummary;
       scramble: MatchSummary;
     };
     totalPoints: { red: number; blue: number };
   }
   
   export interface MatchSummary {
     matchType: MatchType;
     status: string;
     lead: number;
     leadingTeam: Team | null;
     holesPlayed: number;
     redPoints: number;
     bluePoints: number;
     isFinal: boolean;
   }

Write tests:
1. Calculate all matches for a flight with partial data
2. Calculate all matches for completed flight
3. Verify total points aggregation
4. Verify front 9 scores feed into all three front 9 matches
5. Verify back 9 scores only feed into scramble
6. Handle missing scores gracefully (incomplete rounds)
```

---

### **PROMPT 22: Point Allocation and Tournament Totals**

```text
Create point allocation and tournament-level aggregation.

Requirements:

1. Create point allocation module in `src/scoring/pointAllocation.ts`:
   interface PointRules {
     singlesPointValue: 1;
     fourballPointValue: 1;
     scramblePointValue: 2;
   }
   
   interface TournamentPointsInput {
     flightResults: FlightMatchesOutput[];
   }
   
   interface TournamentPoints {
     red: number;
     blue: number;
     totalPoints: number;
     winThreshold: number; // Points needed to win
     leadingTeam: Team | null;
     isDecided: boolean; // One team has reached threshold
   }
   
   /**
    * Calculate tournament-wide points from all flights
    */
   function calculateTournamentPoints(input: TournamentPointsInput): TournamentPoints
   
   /**
    * Calculate total points available and win threshold
    * totalPoints = numFlights * 5
    * winThreshold = totalPoints / 2 + 0.5
    */
   function calculateWinThreshold(numFlights: number): { total: number; threshold: number }

2. Create tournament service in `src/services/tournamentService.ts`:
   interface TournamentSummary {
     eventId: string;
     eventName: string;
     state: EventState;
     points: TournamentPoints;
     flights: FlightMatchSummary[];
     momentum: MomentumIndicator;
   }
   
   /**
    * Get complete tournament status
    */
   async function getTournamentSummary(eventId: string): Promise<TournamentSummary>

3. Create momentum calculator in `src/scoring/momentum.ts`:
   interface MomentumInput {
     recentHoleResults: {
       holeNumber: number;
       matchType: MatchType;
       winner: Team | null;
     }[];
     lookbackHoles: number; // Default 3
   }
   
   interface MomentumIndicator {
     score: number; // Positive = Red momentum, Negative = Blue
     direction: 'red' | 'blue' | 'neutral';
     strength: 'strong' | 'moderate' | 'slight' | 'neutral';
   }
   
   /**
    * Calculate momentum based on last N holes across all active matches
    */
   function calculateMomentum(input: MomentumInput): MomentumIndicator

4. Update shared types:
   export interface TournamentPoints {
     red: number;
     blue: number;
     totalPoints: number;
     winThreshold: number;
     leadingTeam: Team | null;
     isDecided: boolean;
   }
   
   export interface MomentumIndicator {
     score: number;
     direction: 'red' | 'blue' | 'neutral';
     strength: 'strong' | 'moderate' | 'slight' | 'neutral';
   }

Write tests:
1. Tournament points aggregation:
   - 2 flights = 10 total points, 5.5 to win
   - 8 flights = 40 total points, 20.5 to win
2. Point allocation:
   - Singles/fourball win = 1 point
   - Scramble win = 2 points
   - Ties split correctly
3. Win threshold:
   - Team at exactly 5.5 with 10 total = winner
   - Team at 5.0 with 10 total = not decided
4. Momentum calculation:
   - Red wins last 3 holes = strong red momentum
   - Mixed results = neutral
   - Blue wins 2 of 3 = moderate blue momentum
```

---

### **PROMPT 23: Score Entry Repository**

```text
Create the score entry data layer with idempotency support.

Requirements:

1. Create hole score repository in `src/repositories/holeScoreRepository.ts`:
   interface CreateHoleScoreInput {
     eventId: string;
     flightId: string;
     playerId: string;
     holeNumber: number;
     grossScore: number;
     enteredByUserId: string;
     source: 'online' | 'offline';
     clientTimestamp: Date;
     mutationId: string;
   }
   
   interface HoleScore {
     id: string;
     eventId: string;
     flightId: string;
     playerId: string;
     holeNumber: number;
     grossScore: number;
     enteredByUserId: string;
     source: string;
     clientTimestamp: Date;
     serverTimestamp: Date;
     version: number;
     mutationId: string;
   }
   
   // Functions:
   
   /**
    * Upsert a hole score (idempotent by mutationId)
    * - If mutationId exists, return existing (idempotent)
    * - If score exists for (player, hole), update and increment version
    * - Otherwise, insert new
    */
   async function upsertHoleScore(input: CreateHoleScoreInput): Promise<HoleScore>
   
   /**
    * Batch upsert scores (for offline sync)
    */
   async function upsertHoleScoresBatch(inputs: CreateHoleScoreInput[]): Promise<HoleScore[]>
   
   /**
    * Get scores for a flight
    */
   async function getFlightHoleScores(flightId: string): Promise<HoleScore[]>
   
   /**
    * Get scores for a player
    */
   async function getPlayerHoleScores(playerId: string): Promise<HoleScore[]>

2. Create scramble score repository in `src/repositories/scrambleScoreRepository.ts`:
   interface CreateScrambleScoreInput {
     eventId: string;
     flightId: string;
     team: Team;
     holeNumber: number; // 10-18
     grossScore: number;
     enteredByUserId: string;
     source: 'online' | 'offline';
     clientTimestamp: Date;
     mutationId: string;
   }
   
   // Similar functions to hole scores:
   async function upsertScrambleScore(input: CreateScrambleScoreInput): Promise<ScrambleScore>
   async function upsertScrambleScoresBatch(inputs: CreateScrambleScoreInput[]): Promise<ScrambleScore[]>
   async function getFlightScrambleScores(flightId: string): Promise<ScrambleScore[]>

3. Create audit logging helper in `src/repositories/auditRepository.ts`:
   interface CreateAuditLogInput {
     eventId: string;
     entityType: string;
     entityId: string;
     action: string;
     previousValue: any;
     newValue: any;
     byUserId: string;
     source: 'online' | 'offline';
   }
   
   async function createAuditLog(input: CreateAuditLogInput): Promise<void>
   
   async function getAuditLogs(eventId: string, filters?: { entityType?: string }): Promise<AuditLog[]>

4. Integrate audit logging with score upserts:
   - When score is updated (not created), log previous value
   - Include source (online/offline) in audit

Write tests:
1. Create new score succeeds
2. Same mutationId returns same score (idempotent)
3. Different mutationId for same (player, hole) updates score
4. Version increments on update
5. Audit log created on update (not create)
6. Batch upsert handles mixed create/update
7. Scramble scores enforce hole 10-18 range
```

---

### **PROMPT 24: Score Entry API Endpoints**

```text
Create the score entry REST endpoints with authorization.

Requirements:

1. Create score routes in `src/routes/scores.ts`:
   /**
    * Get all scores for a flight
    */
   GET /events/:eventId/flights/:flightId/scores
   Auth: Event member (flight member or organizer)
   
   Response (200):
   {
     holeScores: [
       {
         playerId: string,
         playerName: string,
         team: Team,
         scores: [
           { holeNumber: 1, grossScore: 5, version: 1 },
           // ... up to 18
         ]
       }
     ],
     scrambleScores: {
       red: [{ holeNumber: 10, grossScore: 4 }, ...],
       blue: [{ holeNumber: 10, grossScore: 5 }, ...]
     },
     lastUpdated: string
   }
   
   /**
    * Submit/update scores (batch, idempotent)
    */
   PUT /events/:eventId/flights/:flightId/scores
   Auth: Flight member or organizer
   Request body: {
     holeScores: [
       {
         playerId: string,
         holeNumber: number,
         grossScore: number,
         mutationId: string,
         clientTimestamp: string
       }
     ],
     source: 'online' | 'offline'
   }
   
   Response (200):
   {
     accepted: number,
     updated: number,
     conflicts: [
       { playerId, holeNumber, serverVersion, serverScore }
     ]
   }
   
   /**
    * Get scramble scores for a flight
    */
   GET /events/:eventId/flights/:flightId/scramble-scores
   Auth: Event member
   
   Response (200):
   {
     red: [{ holeNumber: 10, grossScore: 4, version: 1 }, ...],
     blue: [{ holeNumber: 10, grossScore: 5, version: 1 }, ...]
   }
   
   /**
    * Submit/update scramble scores
    */
   PUT /events/:eventId/flights/:flightId/scramble-scores
   Auth: Flight member or organizer
   Request body: {
     scores: [
       {
         team: Team,
         holeNumber: number,
         grossScore: number,
         mutationId: string,
         clientTimestamp: string
       }
     ],
     source: 'online' | 'offline'
   }

2. Create score service in `src/services/scoreService.ts`:
   interface SubmitScoresInput {
     eventId: string;
     flightId: string;
     userId: string;
     holeScores: ScoreSubmission[];
     source: 'online' | 'offline';
   }
   
   interface SubmitScoresResult {
     accepted: number;
     updated: number;
     conflicts: ConflictInfo[];
   }
   
   async function submitHoleScores(input: SubmitScoresInput): Promise<SubmitScoresResult>
   
   async function submitScrambleScores(input: SubmitScrambleInput): Promise<SubmitScoresResult>

3. Add validation:
   - Event must be in 'live' state to accept scores
   - Hole numbers must be valid (1-18 for hole scores, 10-18 for scramble)
   - Gross scores must be positive integers
   - Player must belong to the specified flight

4. Handle conflicts:
   - If server has newer version, return conflict info
   - Client can decide to retry with updated data

Write tests:
1. Submit single score succeeds
2. Submit batch scores succeeds
3. Idempotent submission (same mutationId)
4. Reject submission when event not live
5. Reject invalid hole numbers
6. Flight member can submit for any player in flight
7. Non-flight member (except organizer) rejected
8. Conflict detected when version mismatch
```

---

### **PROMPT 25: Leaderboard and Match History API**

```text
Create the leaderboard and match history endpoints.

Requirements:

1. Create leaderboard routes in `src/routes/leaderboard.ts`:
   /**
    * Get tournament leaderboard
    */
   GET /events/:eventId/leaderboard
   Auth: Event member or spectator token
   
   Response (200):
   {
     tournament: {
       eventId: string,
       eventName: string,
       state: EventState,
       points: {
         red: number,
         blue: number,
         total: number,
         winThreshold: number,
         leadingTeam: Team | null,
         isDecided: boolean
       },
       momentum: MomentumIndicator
     },
     flights: [
       {
         flightId: string,
         flightNumber: number,
         matches: {
           fourball: {
             status: string,
             lead: number,
             leadingTeam: Team | null,
             holesPlayed: number,
             redPoints: number,
             bluePoints: number,
             isFinal: boolean
           },
           singles1: { ... },
           singles2: { ... },
           scramble: { ... }
         },
         flightPoints: { red: number, blue: number }
       }
     ]
   }

2. Create match history routes in `src/routes/history.ts`:
   /**
    * Get detailed match history for a flight
    */
   GET /events/:eventId/flights/:flightId/history
   Auth: Event member or spectator token
   
   Response (200):
   {
     flight: {
       flightId: string,
       flightNumber: number,
       players: {
         red1: PlayerInfo,
         red2: PlayerInfo,
         blue1: PlayerInfo,
         blue2: PlayerInfo
       }
     },
     matches: {
       fourball: {
         playingHandicaps: { red1, red2, blue1, blue2 },
         holes: [
           {
             holeNumber: 1,
             red1: { gross, net, strokes },
             red2: { gross, net, strokes },
             blue1: { gross, net, strokes },
             blue2: { gross, net, strokes },
             redBestBall: number,
             blueBestBall: number,
             holeWinner: Team | null,
             matchStatus: string
           },
           // ... holes 1-9
         ],
         result: MatchResult | null
       },
       singles1: {
         redPlayer: PlayerInfo,
         bluePlayer: PlayerInfo,
         playingHandicaps: { red, blue },
         holes: [...],
         result: MatchResult | null
       },
       singles2: { ... },
       scramble: {
         teamHandicaps: { red, blue },
         isMixed: { red, blue },
         holes: [
           {
             holeNumber: 10,
             red: { gross, net, strokes },
             blue: { gross, net, strokes },
             holeWinner: Team | null,
             matchStatus: string
           },
           // ... holes 10-18
         ],
         result: MatchResult | null
       }
     }
   }

3. Implement caching layer in `src/services/leaderboardService.ts`:
   // Cache leaderboard computation results
   // Invalidate on score updates
   
   async function getLeaderboard(eventId: string): Promise<LeaderboardResponse>
   
   async function invalidateLeaderboardCache(eventId: string): Promise<void>

4. Wire score submission to invalidate cache:
   - After successful score submission, invalidate leaderboard cache

Write tests:
1. Leaderboard aggregates all flight results
2. Leaderboard shows correct point totals
3. Leaderboard shows momentum indicator
4. Match history shows all hole details
5. Match history includes playing handicaps and strokes
6. Match history handles incomplete rounds
7. Cache invalidation on score update
```

---

### **PROMPT 26: Segment Management and Reopening**

```text
Create segment state management and reopening functionality.

Requirements:

1. Create segment service in `src/services/segmentService.ts`:
   type Segment = 'front' | 'back';
   
   interface SegmentInfo {
     flightId: string;
     segment: Segment;
     state: SegmentState;
     holesWithScores: number;
     totalHoles: number; // 9
     matchesInSegment: MatchType[];
     anyMatchFinal: boolean;
   }
   
   /**
    * Get segment status for a flight
    */
   async function getSegmentStatus(flightId: string, segment: Segment): Promise<SegmentInfo>
   
   /**
    * Complete a segment (mark matches as final, allocate points)
    */
   async function completeSegment(
     eventId: string,
     flightId: string,
     segment: Segment,
     userId: string
   ): Promise<{ success: boolean; matchesFinalized: MatchType[] }>
   
   /**
    * Reopen a segment (clear finals, recalculate)
    */
   async function reopenSegment(
     eventId: string,
     flightId: string,
     segment: Segment,
     userId: string
   ): Promise<{ success: boolean; message: string }>

2. Create segment routes in `src/routes/segments.ts`:
   /**
    * Get segment status
    */
   GET /events/:eventId/flights/:flightId/segment/:segment
   Auth: Event member
   segment: 'front' | 'back'
   
   Response (200):
   {
     segment: SegmentInfo
   }
   
   /**
    * Complete a segment
    */
   POST /events/:eventId/flights/:flightId/segment/:segment/complete
   Auth: Organizer only
   
   Response (200):
   {
     message: "Segment completed",
     matchesFinalized: ['fourball', 'singles1', 'singles2']
   }
   
   Errors:
   - 400: { error: "Segment already completed" }
   - 400: { error: "Not all holes have scores" }
   
   /**
    * Reopen a segment
    */
   POST /events/:eventId/flights/:flightId/segment/:segment/reopen
   Auth: Organizer only
   
   Response (200):
   {
     message: "Segment reopened",
     previousState: 'completed'
   }
   
   Errors:
   - 400: { error: "Segment is not completed" }

3. Update flight repository:
   async function updateSegmentState(
     flightId: string,
     segment: Segment,
     state: SegmentState
   ): Promise<Flight>

4. Create audit entries for segment actions:
   - Log segment completion
   - Log segment reopening with reason

5. Handle score edits that affect finalized segments:
   /**
    * Check if editing a score requires segment reopen
    */
   function checkRequiresReopen(
     flight: Flight,
     holeNumber: number
   ): { requiresReopen: boolean; segment: Segment | null }

Write tests:
1. Complete segment with all scores succeeds
2. Cannot complete segment with missing scores
3. Reopen segment changes state to 'reopened'
4. Cannot reopen segment that isn't completed
5. Score edit to completed segment returns reopen flag
6. Audit log captures segment actions
7. Point recalculation after reopen
```

---

### **PROMPT 27: Spectator Access**

```text
Create spectator access with tokenized URLs.

Requirements:

1. Create spectator repository in `src/repositories/spectatorRepository.ts`:
   interface SpectatorToken {
     id: string;
     eventId: string;
     token: string;
     createdByUserId: string;
     createdAt: Date;
     expiresAt: Date | null;
   }
   
   async function createSpectatorToken(
     eventId: string,
     createdByUserId: string,
     expiresAt?: Date
   ): Promise<SpectatorToken>
   
   async function findByToken(token: string): Promise<SpectatorToken | null>
   
   async function revokeToken(tokenId: string): Promise<void>
   
   async function getTokensForEvent(eventId: string): Promise<SpectatorToken[]>

2. Create spectator service in `src/services/spectatorService.ts`:
   /**
    * Generate a secure spectator token
    */
   function generateToken(): string // 32 bytes, hex encoded
   
   /**
    * Create spectator link
    */
   async function createSpectatorLink(
     eventId: string,
     userId: string
   ): Promise<{ url: string; token: string }>
   
   /**
    * Validate spectator token and return event
    */
   async function validateSpectatorToken(token: string): Promise<Event | null>

3. Create spectator routes in `src/routes/spectator.ts`:
   /**
    * Create spectator link (organizer only)
    */
   POST /events/:eventId/spectator-link
   Auth: Organizer only
   
   Response (201):
   {
     url: "https://app.example.com/spectate/abc123...",
     token: "abc123..."
   }
   
   /**
    * Get spectator leaderboard (no auth, just token)
    */
   GET /spectate/:token/leaderboard
   Auth: None (token in URL)
   
   Response (200):
   { ... same as authenticated leaderboard ... }
   
   Errors:
   - 404: { error: "Invalid or expired spectator link" }
   
   /**
    * Get spectator flight history (no auth, just token)
    */
   GET /spectate/:token/flights/:flightId/history
   Auth: None (token in URL)
   
   Response (200):
   { ... same as authenticated history ... }

4. Create spectator middleware:
   /**
    * Middleware that validates spectator token and attaches event to request
    * Does not require JWT authentication
    */
   function spectatorAuth(): FastifyPreHandler

5. Update shared types:
   export interface SpectatorLink {
     url: string;
     token: string;
     createdAt: string;
     expiresAt: string | null;
   }

Write tests:
1. Create spectator link generates valid token
2. Valid token returns leaderboard
3. Invalid token returns 404
4. Expired token returns 404
5. Spectator cannot access score entry endpoints
6. Spectator can view full match history
7. Multiple spectator links can exist for same event
```

---

### **PROMPT 28: API Integration and Wiring**

```text
Wire all API components together and create final integration tests.

Requirements:

1. Create main router in `src/routes/index.ts`:
   // Register all routes with proper prefixes
   export function registerRoutes(app: FastifyInstance) {
     app.register(authRoutes, { prefix: '/auth' });
     app.register(eventRoutes, { prefix: '/events' });
     app.register(courseRoutes); // Nested under /events/:eventId
     app.register(playerRoutes); // Nested under /events/:eventId
     app.register(flightRoutes); // Nested under /events/:eventId
     app.register(scoreRoutes);  // Nested under /events/:eventId/flights/:flightId
     app.register(leaderboardRoutes); // Nested under /events/:eventId
     app.register(historyRoutes); // Nested under /events/:eventId/flights/:flightId
     app.register(segmentRoutes); // Nested under /events/:eventId/flights/:flightId
     app.register(spectatorRoutes, { prefix: '/spectate' });
   }

2. Create comprehensive error handling:
   // src/plugins/errorHandler.ts
   
   interface ApiError {
     statusCode: number;
     error: string;
     message: string;
   }
   
   // Custom error classes
   class NotFoundError extends Error { statusCode = 404 }
   class UnauthorizedError extends Error { statusCode = 401 }
   class ForbiddenError extends Error { statusCode = 403 }
   class ValidationError extends Error { statusCode = 400 }
   class ConflictError extends Error { statusCode = 409 }
   
   // Global error handler plugin

3. Add request validation schemas using Fastify schema:
   // For each route, add JSON schema for request/response validation

4. Create API documentation endpoint:
   GET /api/docs
   // Return OpenAPI spec or simple endpoint list

5. Write full integration tests for complete workflows:

   **Test: Complete Tournament Flow**
   // 1. Organizer creates account
   // 2. Organizer creates event
   // 3. Organizer sets up course with 2 tees
   // 4. Organizer creates 8 players (4 red, 4 blue)
   // 5. Organizer creates 2 flights and assigns players
   // 6. 4 Players join event via code
   // 7. Organizer transitions event to 'live'
   // 8. Player in flight 1 enters front 9 scores
   // 9. Verify leaderboard updates
   // 10. Player enters back 9 scramble scores
   // 11. Organizer completes segments
   // 12. Verify final points
   // 13. Create spectator link and verify access

   **Test: Offline Sync Scenario**
   // 1. Device A enters scores for holes 1-3
   // 2. Device B enters different score for hole 2
   // 3. Device A syncs (offline scores)
   // 4. Verify last-write-wins
   // 5. Verify audit log shows both changes

   **Test: Segment Reopen Flow**
   // 1. Enter all front 9 scores
   // 2. Complete front segment
   // 3. Organizer notices error
   // 4. Reopen segment
   // 5. Correct score
   // 6. Re-complete segment
   // 7. Verify points recalculated

6. Performance test:
   - Leaderboard endpoint with 8 flights, all scores entered
   - Target: < 500ms response time

Write tests that verify:
1. Full tournament workflow end-to-end
2. All error responses match expected format
3. Authorization works correctly across all endpoints
4. Idempotency keys prevent duplicate submissions
5. Audit log captures all score changes
```

---

### **PROMPT 29: Next.js Project Setup**

```text
Create the Next.js frontend application with PWA configuration.

Requirements:

1. Add web package to monorepo:
   packages/web/
   ├── package.json
   ├── tsconfig.json
   ├── next.config.js
   ├── public/
   │   ├── manifest.json
   │   ├── sw.js (service worker placeholder)
   │   └── icons/
   │       ├── icon-192.png
   │       └── icon-512.png
   ├── src/
   │   ├── app/
   │   │   ├── layout.tsx
   │   │   ├── page.tsx
   │   │   └── globals.css
   │   ├── components/
   │   │   └── ui/
   │   ├── lib/
   │   │   ├── api.ts
   │   │   └── auth.ts
   │   └── hooks/
   └── tailwind.config.js

2. Configure package.json:
   {
     "name": "@ryder-cup/web",
     "dependencies": {
       "next": "^14",
       "react": "^18",
       "react-dom": "^18",
       "@ryder-cup/shared": "workspace:*"
     }
   }

3. Configure Next.js for PWA:
   // next.config.js
   const withPWA = require('next-pwa')({
     dest: 'public',
     disable: process.env.NODE_ENV === 'development'
   });
   
   module.exports = withPWA({
     // config
   });

4. Create manifest.json:
   {
     "name": "Ryder Cup Par 00",
     "short_name": "Ryder Cup",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#ffffff",
     "theme_color": "#1a1a2e",
     "icons": [...]
   }

5. Set up Tailwind CSS with mobile-first design system:
   // tailwind.config.js
   module.exports = {
     theme: {
       extend: {
         colors: {
           red: { team: '#dc2626' },
           blue: { team: '#2563eb' },
         }
       }
     }
   }

6. Create basic layout with mobile-first navigation:
   // src/app/layout.tsx
   // Bottom tab navigation
   // Tabs: Leaderboard, Score Entry, My Flight

7. Create placeholder pages:
   - `/` - Redirect to leaderboard or login
   - `/login` - Login page
   - `/signup` - Signup page
   - `/events` - Event list
   - `/events/[eventId]` - Event detail (leaderboard)
   - `/events/[eventId]/scores` - Score entry
   - `/events/[eventId]/flight` - My flight

8. Verify dev server starts and renders placeholder content

Write tests (using Playwright):
1. App loads without errors
2. Navigation tabs are visible
3. Basic routing works
```

---

### **PROMPT 30: API Client and Authentication**

```text
Create the API client and authentication flow for the frontend.

Requirements:

1. Create API client in `src/lib/api.ts`:
   const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
   
   class ApiClient {
     private token: string | null = null;
     
     setToken(token: string) { this.token = token; }
     clearToken() { this.token = null; }
     
     async get<T>(path: string): Promise<T>
     async post<T>(path: string, body: any): Promise<T>
     async put<T>(path: string, body: any): Promise<T>
     async delete<T>(path: string): Promise<T>
     
     // Handle 401 responses by clearing token and redirecting
   }
   
   export const api = new ApiClient();

2. Create auth context in `src/lib/auth.tsx`:
   interface AuthContextType {
     user: User | null;
     isLoading: boolean;
     login: (email: string, password: string) => Promise<void>;
     signup: (email: string, password: string) => Promise<void>;
     logout: () => void;
   }
   
   export const AuthProvider: React.FC<{ children: React.ReactNode }>
   export const useAuth = () => useContext(AuthContext);

3. Create auth hook in `src/hooks/useAuth.ts`:
   - Persist token in localStorage
   - Auto-restore session on mount
   - Handle token expiry

4. Create login page at `src/app/login/page.tsx`:
   // Mobile-friendly login form
   // Email and password fields
   // Login button
   // Link to signup
   // Error display

5. Create signup page at `src/app/signup/page.tsx`:
   // Mobile-friendly signup form
   // Email and password fields
   // Password requirements hint
   // Signup button
   // Link to login
   // Error display

6. Create protected route wrapper:
   // src/components/ProtectedRoute.tsx
   // Redirects to login if not authenticated

7. Wire auth provider into root layout:
   // src/app/layout.tsx
   <AuthProvider>
     {children}
   </AuthProvider>

8. Add environment variables:
   NEXT_PUBLIC_API_URL=http://localhost:3001

Write tests:
1. Login form submits credentials
2. Successful login stores token and redirects
3. Failed login shows error message
4. Signup validates password requirements
5. Logout clears token and redirects
6. Protected routes redirect to login when unauthenticated
```

---

### **PROMPT 31: Event Management UI**

```text
Create the event management UI for joining and viewing events.

Requirements:

1. Create event API hooks in `src/hooks/useEvents.ts`:
   function useMyEvents(): { events: EventWithRole[], isLoading: boolean, refetch: () => void }
   function useEvent(eventId: string): { event: Event | null, isLoading: boolean }
   function useJoinEvent(): { join: (code: string) => Promise<void>, isLoading: boolean, error: string | null }

2. Create events list page at `src/app/events/page.tsx`:
   // List user's events
   // Each event shows: name, role, state badge
   // Tap to navigate to event
   // "Join Event" button

3. Create join event modal/page at `src/app/events/join/page.tsx`:
   // Event code input (6 characters)
   // Auto-capitalize, filter to alphanumeric
   // Join button
   // Error display
   // Success redirects to event

4. Create event detail layout at `src/app/events/[eventId]/layout.tsx`:
   // Bottom tab navigation for this event:
   // - Leaderboard (default)
   // - Score Entry
   // - My Flight
   
   // Top bar with event name and status badge

5. Create event context for sharing event data:
   // src/lib/eventContext.tsx
   interface EventContextType {
     event: Event;
     membership: EventMember;
     isOrganizer: boolean;
     myFlight: Flight | null;
   }

6. Create UI components:
   // src/components/ui/Badge.tsx - Status badges
   // src/components/ui/Button.tsx - Styled buttons
   // src/components/ui/Input.tsx - Form inputs
   // src/components/ui/Card.tsx - Card containers

7. Style event state badges:
   - Draft: Gray
   - Live: Green pulse
   - Completed: Blue
   - Closed: Gray muted

Write tests:
1. Events list shows user's events
2. Join event with valid code succeeds
3. Join event with invalid code shows error
4. Event detail loads correct data
5. Tab navigation switches views
```

---

### **PROMPT 32: Leaderboard Component**

```text
Create the leaderboard UI component with real-time data display.

Requirements:

1. Create leaderboard hooks in `src/hooks/useLeaderboard.ts`:
   function useLeaderboard(eventId: string): {
     leaderboard: LeaderboardResponse | null;
     isLoading: boolean;
     error: string | null;
     refetch: () => void;
   }

2. Create leaderboard page at `src/app/events/[eventId]/page.tsx`:
   // Tournament header with total points
   // Red vs Blue score display (large, prominent)
   // Win threshold indicator
   // Momentum indicator
   // Manual refresh button (pull-to-refresh on mobile)
   
   // Flight list (expanded by default)
   // For each flight:
   //   - Flight number header
   //   - Four match lines (fourball, singles1, singles2, scramble)
   //   - Flight points subtotal

3. Create match status component at `src/components/MatchStatusLine.tsx`:
   interface MatchStatusLineProps {
     matchType: MatchType;
     status: string;
     lead: number;
     leadingTeam: Team | null;
     holesPlayed: number;
     isFinal: boolean;
     redPoints: number;
     bluePoints: number;
   }
   
   // Display format examples:
   // "Fourball    Red 2 UP thru 6"
   // "Singles #1  A/S thru 9"
   // "Scramble    Blue 3&2 FINAL"

4. Create tournament score header at `src/components/TournamentHeader.tsx`:
   // Large Red vs Blue score
   // "RED 12.5 - 7.5 BLUE"
   // Progress bar showing position
   // "5.5 points to win" indicator

5. Create momentum indicator at `src/components/MomentumIndicator.tsx`:
   // Small visual indicator
   // Arrow direction based on momentum
   // Color intensity based on strength

6. Implement pull-to-refresh:
   // Use native pull-to-refresh or custom implementation
   // Show loading indicator during refresh

7. Add "last updated" timestamp display

8. Style with team colors:
   - Red team: red-600
   - Blue team: blue-600
   - Neutral: gray-500

Write tests:
1. Leaderboard displays total points correctly
2. Flight list shows all flights
3. Match status lines show correct format
4. Refresh button triggers data reload
5. Loading state shows skeleton
```

---

### **PROMPT 33: Score Entry Grid**

```text
Create the score entry grid component for entering hole-by-hole scores.

Requirements:

1. Create score hooks in `src/hooks/useScores.ts`:
   function useFlightScores(eventId: string, flightId: string): {
     scores: FlightScores;
     isLoading: boolean;
     refetch: () => void;
   }
   
   function useSubmitScores(): {
     submit: (scores: ScoreSubmission[]) => Promise<SubmitResult>;
     isSubmitting: boolean;
   }

2. Create score entry page at `src/app/events/[eventId]/scores/page.tsx`:
   // If user has no flight: "You're not assigned to a flight"
   // If user has flight: Show score entry grid
   
   // Two segments clearly divided:
   // Front 9 (holes 1-9): Player scores
   // Back 9 (holes 10-18): Scramble team scores

3. Create score grid component at `src/components/ScoreGrid.tsx`:
   interface ScoreGridProps {
     segment: 'front' | 'back';
     players?: Player[]; // For front 9
     teams?: Team[]; // For back 9 scramble
     scores: Map<string, Map<number, number>>; // playerId/team -> hole -> score
     onScoreChange: (id: string, hole: number, score: number) => void;
     editable: boolean;
   }
   
   // Grid layout:
   // Rows: Hole numbers (1-9 or 10-18)
   // Columns: Players (front) or Teams (back)
   // Each cell: Score input

4. Create score input cell at `src/components/ScoreCell.tsx`:
   // Tap to edit
   // Show gross score
   // Indicate if unsaved changes
   // Show net score (computed) below

5. Create header row showing:
   - Player name (abbreviated if long)
   - Team color indicator
   - Playing handicap

6. Create score entry state management:
   // src/hooks/useScoreEntry.ts
   // Track pending changes
   // Debounce submissions
   // Handle offline queueing
   // Show sync status

7. Add confirmation dialog for overwriting existing scores

8. Show derived match results in sidebar/footer:
   - Real-time calculation of match status from entered scores

9. Add "Save" button and unsaved changes indicator

Write tests:
1. Score grid renders correct number of cells
2. Entering score updates local state
3. Save button submits scores to API
4. Overwrite confirmation appears for existing scores
5. Match status updates as scores are entered
6. Unsaved indicator shows pending changes
```

---

### **PROMPT 34: My Flight and Match History**

```text
Create the My Flight view with detailed match history.

Requirements:

1. Create flight history hooks in `src/hooks/useFlightHistory.ts`:
   function useFlightHistory(eventId: string, flightId: string): {
     history: FlightHistoryResponse;
     isLoading: boolean;
     error: string | null;
   }

2. Create My Flight page at `src/app/events/[eventId]/flight/page.tsx`:
   // If no flight: "You're not assigned to a flight"
   
   // Flight header with players
   // Four match accordions (tap to expand)
   // Default: Show summary, expand for hole-by-hole

3. Create flight header component at `src/components/FlightHeader.tsx`:
   // Red team: Player1, Player2 (with handicaps)
   // vs
   // Blue team: Player1, Player2 (with handicaps)

4. Create match accordion component at `src/components/MatchAccordion.tsx`:
   interface MatchAccordionProps {
     matchType: MatchType;
     matchData: MatchHistoryData;
     defaultExpanded?: boolean;
   }
   
   // Collapsed: Match type, current status, points
   // Expanded: Full hole-by-hole breakdown

5. Create hole-by-hole table at `src/components/HoleByHoleTable.tsx`:
   // Table showing:
   // Hole | Red (gross/net) | Blue (gross/net) | Result
   // 1    | 5/4             | 6/5              | Red
   // 2    | 4/4             | 4/4              | Halve
   // ...
   // Cumulative match status after each hole

6. Create singles hole detail:
   - Show stroke allocation (circle indicates stroke received)
   - Highlight winning score

7. Create fourball hole detail:
   - Show all 4 player scores
   - Indicate which player contributed best ball
   - Highlight team winner

8. Create scramble hole detail:
   - Show team gross and net
   - Indicate strokes received

9. Add match timeline visualization:
   // Visual representation of match progression
   // Show lead changes over holes
   // Mark where match was decided (if early clinch)

Write tests:
1. Flight header shows correct players
2. Match accordions expand/collapse
3. Hole-by-hole shows correct scores and results
4. Stroke indicators display correctly
5. Timeline shows match progression
6. Early clinch is clearly marked
```

---

### **PROMPT 35: Offline Support and Sync**

```text
Implement offline-first functionality with IndexedDB and background sync.

Requirements:

1. Create IndexedDB wrapper in `src/lib/db.ts`:
   interface LocalDatabase {
     // Stores
     events: Event[];
     flights: FlightWithPlayers[];
     scores: PendingScore[];
     syncQueue: SyncOperation[];
     
     // Operations
     saveEvent(event: Event): Promise<void>;
     getEvent(id: string): Promise<Event | null>;
     saveScores(flightId: string, scores: any): Promise<void>;
     getScores(flightId: string): Promise<any>;
     addToSyncQueue(op: SyncOperation): Promise<void>;
     getSyncQueue(): Promise<SyncOperation[]>;
     clearSyncQueue(): Promise<void>;
   }
   
   export const db = new LocalDatabase();

2. Create sync service in `src/lib/sync.ts`:
   interface SyncStatus {
     isOnline: boolean;
     pendingOperations: number;
     lastSyncTime: Date | null;
     isSyncing: boolean;
   }
   
   class SyncService {
     // Monitor online/offline status
     // Process sync queue when online
     // Handle conflicts with last-write-wins
     
     async sync(): Promise<SyncResult>;
     getStatus(): SyncStatus;
     addPendingScore(score: PendingScore): Promise<void>;
   }

3. Create sync context in `src/lib/syncContext.tsx`:
   interface SyncContextType {
     status: SyncStatus;
     triggerSync: () => Promise<void>;
   }
   
   export const SyncProvider: React.FC;
   export const useSync = () => useContext(SyncContext);

4. Create offline indicator component at `src/components/OfflineIndicator.tsx`:
   // Shows when offline
   // Shows pending sync count
   // Tap to manually trigger sync

5. Create service worker at `public/sw.js`:
   // Cache app shell
   // Cache API responses for offline viewing
   // Background sync for score submissions

6. Update score entry to work offline:
   - Save to IndexedDB immediately
   - Add to sync queue
   - Show "Saved locally" indicator
   - Sync when online

7. Update leaderboard for offline:
   - Cache last fetched leaderboard
   - Show cached data when offline
   - Indicate data may be stale

8. Handle sync conflicts:
   - Last-write-wins (as per spec)
   - Show notification if local score was overwritten
   - Log to local audit trail

9. Create sync status banner:
   - "Online - All synced"
   - "Offline - 3 pending changes"
   - "Syncing..."
   - "Sync error - tap to retry"

Write tests:
1. Scores save to IndexedDB when offline
2. Sync queue processes when coming online
3. Last-write-wins applies to conflicts
4. Cached leaderboard shows when offline
5. Service worker caches app shell
6. Offline indicator shows correct status
7. Manual sync trigger works
```

---

## Summary Checklist

### Phase 1: Foundation (Prompts 1-4)
- [ ] Monorepo structure with workspaces
- [ ] Database connection and migrations
- [ ] Core schema (users, events)
- [ ] Scoring and audit tables

### Phase 2: Authentication (Prompts 5-7)
- [ ] User registration with password hashing
- [ ] JWT login and token management
- [ ] Password reset flow

### Phase 3: Event & Course (Prompts 8-12)
- [ ] Event CRUD with state machine
- [ ] Event join via code
- [ ] Course/tees/holes setup
- [ ] Stroke index overrides
- [ ] Mixed scramble SI

### Phase 4: Players & Flights (Prompts 13-15)
- [ ] Player creation and management
- [ ] Flight creation and assignment
- [ ] Flight-based authorization

### Phase 5: Scoring Engine (Prompts 16-20)
- [ ] Handicap calculations
- [ ] Stroke allocation
- [ ] Singles match engine
- [ ] Fourball match engine
- [ ] Scramble match engine

### Phase 6: Match Engine (Prompts 21-25)
- [ ] Flight match calculator
- [ ] Point allocation
- [ ] Tournament aggregation
- [ ] Score entry repository
- [ ] Score entry API

### Phase 7: API Integration (Prompts 26-28)
- [ ] Leaderboard endpoint
- [ ] Segment management
- [ ] Spectator access
- [ ] Full API wiring

### Phase 8: Frontend Foundation (Prompts 29-31)
- [ ] Next.js PWA setup
- [ ] API client and auth
- [ ] Event management UI

### Phase 9: Frontend Features (Prompts 32-35)
- [ ] Leaderboard component
- [ ] Score entry grid
- [ ] My Flight / Match history
- [ ] Offline support and sync

---

## Notes for Implementation

1. **Test-Driven Development**: Each prompt expects tests to be written alongside implementation. Run tests before considering the prompt complete.

2. **Incremental Commits**: After each prompt, the codebase should be in a working state. Avoid leaving broken or orphaned code.

3. **Shared Types**: The `@ryder-cup/shared` package ensures type consistency between frontend and backend. Update it as you add new types.

4. **Database Migrations**: Each migration builds on previous ones. Run all migrations in sequence when setting up a new environment.

5. **Authorization**: Pay careful attention to the authorization rules. Players can only edit scores for their own flight, while organizers can access everything.

6. **Offline-First**: The offline functionality is critical for golf courses with poor connectivity. Prioritize reliability of local storage and sync.
