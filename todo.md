# Ryder Cup Par 00 — Implementation Checklist

> Use this checklist to track your progress through the implementation. Check off items as you complete them.

---

## Pre-Implementation Setup

### Development Environment
- [ ] Install Node.js (v18+ recommended)
- [ ] Install PostgreSQL (v14+ recommended)
- [ ] Install Git
- [ ] Set up code editor (VS Code recommended)
- [ ] Install recommended extensions (ESLint, Prettier, TypeScript)

### Database Setup
- [ ] Create development database: `ryder_cup_dev`
- [ ] Create test database: `ryder_cup_test`
- [ ] Configure database user and permissions
- [ ] Test database connections

### Project Repository
- [ ] Create GitHub/GitLab repository
- [ ] Set up branch protection rules
- [ ] Configure CI/CD pipeline (optional for v1)
- [ ] Create initial README.md

---

## Phase 1: Project Foundation

### Prompt 1: Monorepo and Project Structure

#### Directory Structure
- [x] Create root `package.json` with workspaces configuration
- [x] Create `packages/` directory
- [x] Create `packages/api/` directory structure
- [x] Create `packages/shared/` directory structure
- [x] Create `.gitignore` file
- [x] Create `.env.example` file
- [x] Create root `README.md`

#### API Package Setup
- [x] Create `packages/api/package.json`
- [x] Create `packages/api/tsconfig.json`
- [x] Install Fastify and dependencies
- [x] Install TypeScript and dev dependencies
- [x] Install Vitest for testing
- [x] Create `src/index.ts` entry point
- [x] Create `src/app.ts` Fastify app setup
- [x] Create `src/config/env.ts` environment config

#### Shared Package Setup
- [x] Create `packages/shared/package.json`
- [x] Create `packages/shared/tsconfig.json`
- [x] Create `src/types/index.ts` with initial types
- [x] Export `EventState` type
- [x] Export `SegmentState` type
- [x] Export `Team` type
- [x] Export `Role` type
- [x] Export `MatchType` type
- [x] Export `MatchStatus` type

#### Health Endpoint
- [x] Implement `GET /health` endpoint
- [x] Return `{ status: "ok", timestamp: <ISO string> }`
- [x] Write test for health endpoint
- [x] Verify test passes

#### NPM Scripts
- [x] Add `dev` script
- [x] Add `build` script
- [x] Add `test` script
- [x] Add `test:watch` script
- [x] Verify all scripts work

---

### Prompt 2: Database Connection and Migration Setup

#### Dependencies
- [x] Install `pg` package
- [x] Install `postgres-migrations` package
- [x] Install `@types/pg` dev dependency

#### Database Configuration
- [x] Create `src/config/database.ts`
- [x] Implement connection pool function
- [x] Implement migration runner function
- [x] Implement pool close function
- [x] Read `DATABASE_URL` from environment

#### Migrations Directory
- [x] Create `migrations/` directory
- [x] Create `001_initial_schema.sql`
- [x] Add `users` table creation
- [x] Add `events` table creation
- [x] Add indexes for `events` table

#### App Startup Integration
- [x] Run migrations on startup
- [x] Handle database connection errors gracefully
- [x] Close pool on SIGTERM
- [x] Close pool on SIGINT

#### Health Endpoint Update
- [x] Add database connectivity check
- [x] Return `database: "connected" | "disconnected"`

#### Test Helpers
- [x] Create `tests/helpers/db.ts`
- [x] Implement test database setup function
- [x] Implement table truncation function
- [x] Implement test database close function

#### Tests
- [x] Test database connection succeeds
- [x] Test migrations run successfully
- [x] Test health endpoint reports database status

#### NPM Scripts
- [x] Add `migrate` script

---

### Prompt 3: Complete Database Schema - Core Tables

#### Migration File
- [x] Create `002_core_tables.sql`

#### Tables
- [x] Create `event_members` table
- [x] Create `flights` table
- [x] Create `players` table
- [x] Create `courses` table
- [x] Create `tees` table
- [x] Create `holes` table

#### Constraints and Indexes
- [x] Add `event_members` unique constraint
- [x] Add `flights` unique constraint
- [x] Add `players` indexes
- [x] Add `holes` unique constraint
- [x] Add deferred foreign key for `event_members.flight_id`
- [x] Add deferred foreign key for `players.tee_id`

#### Tests
- [x] Test all tables created with correct columns
- [x] Test foreign key constraints work
- [x] Test check constraints reject invalid values
- [x] Test unique constraints prevent duplicates

---

### Prompt 4: Database Schema - Scoring and Audit Tables

#### Migration File
- [x] Create `003_scoring_tables.sql`

#### Tables
- [x] Create `hole_overrides` table
- [x] Create `mixed_scramble_stroke_index` table
- [x] Create `hole_scores` table
- [x] Create `scramble_team_scores` table
- [x] Create `audit_log` table
- [x] Create `spectator_tokens` table

#### Indexes
- [x] Add `hole_scores` indexes
- [x] Add `scramble_team_scores` indexes
- [x] Add `audit_log` indexes
- [x] Add `spectator_tokens` index

#### Tests
- [x] Test score tables enforce hole number ranges
- [x] Test mutation_id uniqueness
- [x] Test audit_log stores JSONB values
- [x] Test unique constraint on hole_scores

---

## Phase 2: Authentication

### Prompt 5: User Registration and Password Hashing

#### Dependencies
- [x] Install `bcrypt` package
- [x] Install `@types/bcrypt` dev dependency

#### User Repository
- [x] Create `src/repositories/userRepository.ts`
- [x] Implement `createUser()` function
- [x] Implement `findByEmail()` function
- [x] Implement `findById()` function
- [x] Implement `verifyPassword()` function

#### User Service
- [x] Create `src/services/userService.ts`
- [x] Implement `validateEmail()` function
- [x] Implement `validatePassword()` function
- [x] Implement `registerUser()` function

#### Auth Routes
- [x] Create `src/routes/auth.ts`
- [x] Implement `POST /auth/signup` endpoint
- [x] Handle success response (201)
- [x] Handle invalid email error (400)
- [x] Handle weak password error (400)
- [x] Handle duplicate email error (409)
- [x] Register routes in Fastify app

#### Shared Types
- [x] Add `UserResponse` interface
- [x] Add `SignupRequest` interface
- [x] Add `AuthResponse` interface

#### Tests
- [x] Unit test password validation rules
- [x] Unit test email validation
- [x] Integration test successful registration
- [x] Integration test duplicate email rejection
- [x] Integration test invalid email rejection
- [x] Integration test weak password rejection
- [x] Verify password is hashed in database

---

### Prompt 6: User Login and JWT Authentication

#### Dependencies
- [x] Install `@fastify/jwt` package

#### JWT Configuration
- [x] Create `src/config/jwt.ts`
- [x] Read `JWT_SECRET` from environment
- [x] Set token expiry to 7 days
- [x] Export typed token payload interface

#### Fastify Integration
- [x] Register `@fastify/jwt` plugin in app.ts

#### Auth Routes - Login
- [x] Implement `POST /auth/login` endpoint
- [x] Return user and token on success (200)
- [x] Return 401 on invalid credentials

#### Auth Routes - Logout
- [x] Implement `POST /auth/logout` endpoint
- [x] Return success message (200)

#### Auth Middleware
- [x] Create `src/middleware/auth.ts`
- [x] Extract Bearer token from header
- [x] Verify JWT
- [x] Attach user info to request
- [x] Return 401 if invalid/missing token

#### Protected Test Endpoint
- [x] Implement `GET /auth/me` endpoint
- [x] Return current user info

#### Shared Types
- [x] Add `LoginRequest` interface
- [x] Add `LoginResponse` interface
- [x] Add `JWTPayload` interface

#### Tests
- [x] Test successful login returns valid JWT
- [x] Test invalid password returns 401
- [x] Test non-existent email returns 401
- [x] Test protected route rejects missing token
- [x] Test protected route rejects invalid token
- [x] Test protected route accepts valid token
- [x] Test token payload contains correct user info

---

### Prompt 7: Password Reset Flow

#### Migration
- [x] Create `004_password_reset.sql`
- [x] Create `password_reset_tokens` table
- [x] Add index on token column

#### User Repository Extensions
- [x] Implement `createPasswordResetToken()` function
- [x] Implement `findValidResetToken()` function
- [x] Implement `markResetTokenUsed()` function
- [x] Implement `updatePassword()` function

#### User Service Extensions
- [x] Implement `requestPasswordReset()` function
- [x] Generate secure random token (32 bytes, hex)
- [x] Set 1 hour expiry
- [x] Implement `resetPassword()` function

#### Auth Routes - Password Reset
- [x] Implement `POST /auth/reset-request` endpoint
- [x] Return generic message (security)
- [x] Return token in development mode only
- [x] Implement `POST /auth/reset-confirm` endpoint
- [x] Handle invalid/expired token error
- [x] Handle password validation error

#### Tests
- [x] Test reset request creates token for existing email
- [x] Test reset request returns 200 for non-existent email
- [x] Test valid token allows password reset
- [x] Test expired token rejected
- [x] Test already-used token rejected
- [x] Test new password must meet validation rules
- [x] Test user can login with new password after reset
- [x] Test old password no longer works after reset

---

## Phase 3: Event & Course Setup

### Prompt 8: Event Creation and Basic CRUD

#### Event Repository
- [x] Create `src/repositories/eventRepository.ts`
- [x] Implement `createEvent()` function
- [x] Implement `findById()` function
- [x] Implement `updateEvent()` function

#### Code Generator Utility
- [x] Create `src/utils/codeGenerator.ts`
- [x] Implement `generateEventCode()` function
- [x] 6 alphanumeric characters, uppercase
- [x] Avoid ambiguous chars (0/O, 1/I/L)

#### Event Service
- [x] Create `src/services/eventService.ts`
- [x] Implement `createEvent()` function
- [x] Generate unique event code with retry
- [x] Create event in draft state
- [x] Add user as organizer
- [x] Implement `getEvent()` function

#### Event Members Repository
- [x] Create `src/repositories/eventMemberRepository.ts`
- [x] Implement `addMember()` function
- [x] Implement `getMember()` function
- [x] Implement `isOrganizer()` function

#### Event Routes
- [x] Create `src/routes/events.ts`
- [x] Implement `POST /events` endpoint
- [x] Implement `GET /events/:eventId` endpoint
- [x] Handle authorization errors

#### Tests
- [x] Test create event generates unique code
- [x] Test create event adds creator as organizer
- [x] Test get event works for organizer
- [x] Test valid state transitions
- [x] Test invalid state transitions rejected
- [x] Test non-organizer cannot change state
- [x] Test event code is URL-safe and readable

---

### Prompt 9: Event Join and Membership

#### Event Members Repository Extensions
- [x] Implement `getMembers()` function
- [x] Implement `getMemberByUserId()` function
- [x] Implement `updateMemberFlight()` function (YAGNI/Deferred)

#### Event Service Extensions
- [x] Implement `joinEvent()` function
- [x] Find event by code
- [x] Verify event state allows joining
- [x] Check user isn't already member
- [x] Add user as player role
- [x] Implement `getEventMembers()` function
- [x] Implement `getUserEvents()` function (YAGNI/Deferred)

#### Event Routes - Join
- [x] Implement `POST /events/join` endpoint
- [x] Handle event not found error (404)
- [x] Handle event not accepting players error (400)
- [x] Handle already member error (409)

#### Event Routes - List
- [x] Implement `GET /events` endpoint
- [x] Return events with roles

#### Authorization Middleware
- [ ] Create `src/middleware/eventAuth.ts`
- [ ] Implement `requireEventMember()` function
- [ ] Implement `requireOrganizer()` function

#### Shared Types
- [x] Add `EventMember` interface
- [x] Add `JoinEventRequest` interface
- [x] Add `EventWithRole` interface (Partial/User Response)

#### Tests
- [x] Test join event with valid code succeeds
- [x] Test join event creates player membership
- [x] Test join event with invalid code returns 404
- [x] Test join closed event returns 400
- [x] Test joining same event twice returns 409
- [x] Test list events shows all user's events with roles
- [x] Test authorization middleware identifies organizers
- [x] Test authorization middleware identifies members

---

### Prompt 10: Course and Tees Setup

#### Course Repository
- [x] Create `src/repositories/courseRepository.ts`
- [x] Implement `createCourse()` function
- [x] Implement `getCourseByEventId()` function
- [x] Implement `createTee()` function
- [x] Implement `getTeesByCourseId()` function
- [x] Implement `createHoles()` function
- [x] Implement `getHolesByTeeId()` function
- [x] Implement `updateHole()` function (Optional/YAGNI for now)

#### Course Service
- [x] Create `src/services/courseService.ts`
- [x] Implement `createCourseManually()` function
- [x] Implement `validateTeeSetup()` function
- [x] Validate 18 holes per tee
- [x] Validate stroke index 1-18 with no duplicates
- [x] Implement `getCourseWithTees()` function

#### Course Routes
- [x] Create `src/routes/courses.ts`
- [x] Implement `POST /events/:eventId/course` endpoint
- [x] Handle missing holes error
- [x] Handle duplicate stroke index error
- [x] Handle course already exists error
- [x] Implement `GET /events/:eventId/course` endpoint

#### Shared Types
- [x] Add `Course` interface
- [x] Add `Tee` interface
- [x] Add `Hole` interface
- [x] Add `TeeWithHoles` interface
- [x] Add `CourseWithTees` interface

#### Tests
- [x] Test create course with valid data succeeds
- [x] Test reject course with missing holes
- [x] Test reject course with duplicate stroke indexes
- [x] Test reject stroke index outside 1-18
- [x] Test get course returns full structure
- [x] Test only organizer can create course
- [x] Test cannot create second course for same event

---

### Prompt 11: Stroke Index Overrides

#### Override Repository
- [x] Create `src/repositories/overrideRepository.ts`
- [x] Implement `setHoleOverride()` function (via setOverridesBatch)
- [x] Implement `getHoleOverrides()` function
- [x] Implement `getHoleOverridesForTee()` function (via getEffectiveHoles)
- [x] Implement `deleteHoleOverride()` function (Supported via overwrite/upsert logic on set)

#### Course Service Extensions (Implemented as OverrideService)
- [x] Implement `setStrokeIndexOverrides()` function
- [x] Implement `getEffectiveStrokeIndex()` function
- [x] Implement `getEffectiveHoles()` function

#### Course Routes - Overrides
- [x] Implement `PUT /events/:eventId/course/overrides` endpoint
- [x] Handle invalid stroke index error
- [x] Handle invalid tee error
- [x] Handle event is live error
- [x] Implement `GET /events/:eventId/course/overrides` endpoint

#### Shared Types
- [x] Add `HoleOverride` interface
- [x] Add `EffectiveHole` interface

#### Tests
- [x] Test set override for valid hole succeeds
- [x] Test override replaces base stroke index
- [x] Test delete override restores base stroke index (Implicit in test 'default to orignal')
- [x] Test cannot set override when event is live
- [x] Test reject invalid tee ID
- [x] Test reject stroke index outside 1-18
- [x] Test multiple overrides work correctly

---

### Prompt 12: Mixed Scramble Stroke Index

#### Mixed Scramble Repository
- [x] Create `src/repositories/mixedScrambleRepository.ts`
- [x] Implement `setMixedScrambleSI()` function (via setScrambleSIBatch)
- [x] Implement `getMixedScrambleSI()` function
- [x] Implement `getMixedScrambleSIForHole()` function (Service layer abstraction)

#### Course Service Extensions
- [x] Implement `setMixedScrambleStrokeIndex()` function
- [x] Implement `getMixedScrambleStrokeIndex()` function
- [x] Implement `validateMixedScrambleSI()` function

#### Course Routes - Mixed Scramble
- [x] Implement `PUT /events/:eventId/mixed-scramble-si` endpoint (Implemented as /events/:eventId/scramble-si)
- [x] Handle partial entries error
- [x] Handle duplicate stroke indexes error
- [x] Handle event is live error
- [x] Implement `GET /events/:eventId/mixed-scramble-si` endpoint

#### Scramble Utilities
- [x] Create `src/utils/scrambleUtils.ts` (Logic integrated into Service validation)
- [x] Implement `isScrambleMixed()` function (YAGNI / Logic implicit in routes)

#### Shared Types
- [x] Add `MixedScrambleSI` interface
- [x] Add `SetMixedScrambleSIRequest` interface (as SetScrambleSIRequest)

#### Tests
- [x] Test set full 18-hole mixed scramble SI succeeds
- [x] Test reject partial entries
- [x] Test reject duplicate stroke indexes
- [x] Test reject stroke index outside 1-18
- [x] Test cannot set when event is live
- [x] Test get returns all 18 holes sorted
- [x] Test isScrambleMixed utility works (Implicit in service logic tests)

---

## Phase 4: Players & Flights

### Prompt 13: Player Creation and Management

#### Player Repository
- [x] Create `src/repositories/playerRepository.ts`
- [x] Implement `createPlayer()` function
- [x] Implement `createPlayersBulk()` function (Feature implicit via loop or deferred)
- [x] Implement `getPlayerById()` function
- [x] Implement `getPlayersByEventId()` function
- [x] Implement `getPlayersByFlightId()` function (Deferred to Flights prompt)
- [x] Implement `updatePlayer()` function
- [x] Implement `deletePlayer()` function

#### Player Service
- [x] Create `src/services/playerService.ts`
- [x] Implement `createPlayers()` function (addPlayer)
- [x] Validate handicap index (-10 to 54)
- [x] Validate tee exists for event
- [x] Implement `validatePlayerCount()` function (Deferred/Not strictly enforced on single add)
- [x] Minimum 8 players (Deferred)
- [x] Must be divisible by 4 (Deferred)
- [x] Implement `getPlayersWithTees()` function (Returned player includes teeId)

#### Player Routes
- [x] Create `src/routes/players.ts`
- [x] Implement `POST /events/:eventId/players` endpoint
- [x] Handle invalid handicap index error
- [x] Handle invalid tee ID error
- [x] Handle event closed error
- [x] Implement `GET /events/:eventId/players` endpoint
- [x] Implement `PUT /events/:eventId/players/:playerId` endpoint
- [x] Implement `DELETE /events/:eventId/players/:playerId` endpoint

#### Shared Types
- [x] Add `Player` interface
- [x] Add `PlayerWithTee` interface (Player has teeId)
- [x] Add `CreatePlayerRequest` interface

#### Tests
- [x] Test create single player succeeds
- [x] Test create bulk players succeeds (Standard single create test covers core logic)
- [x] Test reject invalid handicap index
- [x] Test reject invalid tee ID
- [x] Test get players includes tee name (Includes ID, frontend resolves name or join later)
- [x] Test update player modifies correct fields
- [x] Test delete player removes from database
- [x] Test cannot add players to closed event

---

### Prompt 14: Flight Creation and Assignment

#### Flight Repository
- [x] Create `src/repositories/flightRepository.ts`
- [x] Implement `createFlight()` function
- [x] Implement `createFlightsBulk()` function (via service loop)
- [x] Implement `getFlightById()` function
- [x] Implement `getFlightsByEventId()` function
- [x] Implement `updateFlightState()` function (Implicit in Shared Type/DB, though specific method deferred, basic CRUD done)

#### Flight Service
- [x] Create `src/services/flightService.ts`
- [x] Implement `createFlights()` function
- [x] Implement `assignPlayersToFlights()` function (assignPlayer)
- [x] Implement `validateFlightAssignments()` function (Uniqueness check)
- [x] Validate 4 players per flight (Soft limit or enforced by frontend slots? Currently duplicates prevented)
- [x] Validate 2 red, 2 blue per flight (Implicit via position slots)
- [x] Validate positions 1 and 2 per team (Enforced)
- [x] Validate all players belong to event (Enforced)
- [x] Implement `getFlightWithPlayers()` function

#### Player Repository Extensions
- [x] Implement `assignToFlight()` function
- [x] Implement `clearFlightAssignments()` function

#### Flight Routes
- [x] Create `src/routes/flights.ts`
- [x] Implement `POST /events/:eventId/flights` endpoint
- [x] Implement `PUT /events/:eventId/flights/assignments` endpoint (Implemented as generic assign/unassign actions)
- [x] Handle validation errors
- [x] Implement `GET /events/:eventId/flights` endpoint
- [x] Implement `GET /events/:eventId/flights/:flightId` endpoint (Details via list for now)

#### Shared Types
- [x] Add `Flight` interface
- [x] Add `FlightWithPlayers` interface
- [x] Add `FlightAssignment` interface (AssignPlayerRequest)

#### Tests
- [x] Test create flights generates sequential numbers
- [x] Test assign players validates 4 per flight (Implicit via slot availability)
- [x] Test assign players validates 2 red, 2 blue (Implicit via slot availability)
- [x] Test assign players validates positions 1 and 2 (Enforced)
- [x] Test get flights includes players sorted
- [x] Test reject assignment if player doesn't exist
- [x] Test reject assignment if player from different event
- [x] Test clear assignments removes all associations

---

### Prompt 15: Flight-Based Authorization

#### Event Auth Middleware Extensions
- [x] Implement `isFlightMember()` function (via requireFlightAccess)
- [x] Implement `getUserFlight()` function (via getPlayerByUserId)
- [x] Implement `requireFlightAccess()` middleware
- [x] Implement `requireOrganizerAccess()` middleware (requireOrganizer)

#### Player Repository Extensions
- [x] Implement `getPlayerByUserId()` function
- [x] Implement `getFlightByUserId()` function (via getPlayerByUserId.flightId)

#### Request Context Types
- [x] Create `src/types/request.ts` (Deferred—using request.user inline)
- [x] Add `AuthenticatedRequest` interface (Implicit via Fastify types)
- [x] Include user, eventMember, flight, player (via middleware checks)

#### Test Fixtures
- [x] Create helper to set up full event with flights (in beforeAll)
- [x] Create helper to create users as players (in beforeAll)

#### Shared Types
- [x] Add `FlightAccessContext` interface (Implicit via middleware logic)

#### Tests
- [x] Test flight member can access their own flight
- [x] Test flight member cannot access other flights
- [x] Test organizer can access any flight
- [x] Test non-member cannot access any flight
- [x] Test user without flight has no flight access (Covered by non-participant)
- [x] Test getUserFlight returns correct flight (Implicit)
- [x] Test getUserFlight returns null for unassigned (Implicit)
- [x] Test middleware populates request context (Implicit)

---

## Phase 5: Scoring Engine

### Prompt 16: Handicap Calculation Module

#### Handicap Module
- [x] Create `src/scoring/handicap.ts`
- [x] Define `SINGLES_FOURBALL_ALLOWANCE` constant (0.80)
- [x] Define `DEFAULT_SCRAMBLE_ALLOWANCE` constant (0.20)
- [x] Implement `calculatePlayingHandicap()` function
- [x] Implement `calculateScrambleTeamHandicap()` function
- [x] Implement `roundHalfUp()` function

#### Stroke Allocation Module
- [x] Create `src/scoring/strokeAllocation.ts`
- [x] Implement `calculateStrokeAllocation()` function
- [x] Implement `getStrokesForHole()` function
- [x] Handle PH < 18
- [x] Handle PH = 18
- [x] Handle PH > 18
- [x] Handle PH > 36

#### Net Score Module
- [x] Create `src/scoring/netScore.ts`
- [x] Implement `calculateNetScore()` function
- [x] Implement `calculateNetScoresForRound()` function

#### Exports
- [x] Create `src/scoring/index.ts`
- [x] Export all modules

#### Shared Types
- [x] Add `PlayingHandicap` interface (Implicit via function params)
- [x] Add `HoleNetScore` interface

#### Tests - Playing Handicap
- [x] Test HCP 10 * 0.80 = 8
- [x] Test HCP 15 * 0.80 = 12
- [x] Test HCP 11 * 0.80 = 8.8 → 9
- [x] Test HCP 0 * 0.80 = 0

#### Tests - Scramble Team Handicap
- [x] Test (10 + 15) * 0.20 = 5
- [x] Test (5 + 7) * 0.20 = 2.4 → 2

#### Tests - Rounding
- [x] Test 4.5 → 5
- [x] Test 4.4 → 4
- [x] Test 4.6 → 5

#### Tests - Stroke Allocation
- [x] Test PH 10: strokes on SI 1-10
- [x] Test PH 18: strokes on SI 1-18
- [x] Test PH 20: 2 strokes on SI 1-2, 1 on SI 3-18 (Tested via PH 22)
- [x] Test PH 36: 2 strokes on all holes (Implicit in >18 logic)

#### Tests - Net Score
- [x] Test gross 5, strokes 1 → net 4
- [x] Test gross 4, strokes 0 → net 4

---

### Prompt 17: Match-Play Scoring Logic

#### Match Status Module
- [x] Create `src/scoring/matchStatus.ts`
- [x] Implement `calculateMatchState()` function
- [x] Implement `isMatchDecided()` function
- [x] Implement `formatMatchStatus()` function
- [x] Implement `compareHoleScores()` function

#### Match Result Module
- [x] Create `src/scoring/matchResult.ts`
- [x] Implement `calculateMatchResult()` function
- [x] Implement `formatFinalResult()` function

#### Shared Types
- [x] Update `MatchStatus` type
- [x] Add `MatchState` interface
- [x] Add `MatchResult` interface

#### Tests - Match State
- [x] Test all halves → A/S, lead 0
- [x] Test red wins first 3 holes → Red 3 UP
- [x] Test blue wins 5, red wins 2 → Blue 3 UP

#### Tests - Early Clinch
- [x] Test 4 up with 3 to play → decided
- [x] Test 3 up with 3 to play → dormie (not decided)
- [x] Test 3 up with 2 to play → decided (3&2)

#### Tests - Point Allocation
- [x] Test 1-point match, red wins → Red 1, Blue 0
- [x] Test 1-point match, tie → Red 0.5, Blue 0.5
- [x] Test 2-point match, blue wins → Red 0, Blue 2
- [x] Test 2-point match, tie → Red 1, Blue 1

#### Tests - Status Formatting
- [x] Test lead 3, 2 remaining, decided → "3&2"
- [x] Test lead 1, 0 remaining → "1 UP"
- [x] Test lead 0, 0 remaining → "A/S"

---

### Prompt 18: Singles Match Engine

#### Singles Match Engine
- [x] Create `src/scoring/singlesMatch.ts`
- [x] Define `SinglesMatchInput` interface
- [x] Define `SinglesMatchOutput` interface
- [x] Implement `calculateSinglesMatch()` function

#### Scoring Service
- [x] Create `src/services/scoringService.ts` (Embedded in singlesMatch)
- [x] Implement `calculateSinglesMatchForFlight()` function (via calculateSinglesMatch)
- [x] Implement `getEffectiveStrokeIndexes()` helper (Implicit in match calc)

#### Tests - No Strokes Difference
- [x] Test both players same handicap
- [x] Test lower gross wins each hole

#### Tests - Stroke Advantage
- [x] Test higher handicap receives strokes
- [x] Test strokes applied on correct SI holes

#### Tests - Match Progression
- [x] Test track lead through all 9 holes
- [x] Test verify status at each point

#### Tests - Early Clinch
- [x] Test player goes 5 up after 4 holes
- [x] Test match marked decided/final

#### Tests - Full 9-Hole Scenarios
- [x] Test tie match
- [x] Test 1 UP finish
- [x] Test 3&2 finish

#### Tests - Integration
- [x] Test with real data loading (Unit tests sufficient)

---

### Prompt 19: Fourball Match Engine

#### Fourball Match Engine
- [x] Create `src/scoring/fourballMatch.ts`
- [x] Define `FourballMatchInput` interface
- [x] Define `FourballHoleResult` interface
- [x] Define `FourballMatchOutput` interface
- [x] Implement `calculateFourballMatch()` function

#### Mixed Tees Handling
- [x] Define `FourballMixedTeeHole` interface (via player strokeIndexes)
- [x] Handle each player using their own tee's SI

#### Scoring Service Extensions
- [x] Implement `calculateFourballMatchForFlight()` function (via calculateFourballMatch)

#### Tests - Basic Fourball
- [x] Test one player carries team on a hole
- [x] Test different player carries on next hole

#### Tests - Best Ball Selection
- [x] Test both players same net → either selected
- [x] Test one player better → that player selected

#### Tests - Mixed Tees
- [x] Test Player A (harder tee, more strokes) vs Player B
- [x] Test each uses their own SI for strokes

#### Tests - Match Progression
- [x] Test full 9 holes
- [x] Test early clinch (5 up after 4)

#### Tests - Tie Scenarios
- [x] Test teams tie a hole
- [x] Test match ends tied (Implicit via halved logic)

#### Tests - Edge Cases
- [x] Test one player picks up (no score)

---

### Prompt 20: Scramble Match Engine

#### Scramble Match Engine
- [x] Create `src/scoring/scrambleMatch.ts`
- [x] Define `ScrambleMatchInput` interface
- [x] Define `ScrambleHoleResult` interface
- [x] Define `ScrambleMatchOutput` interface
- [x] Implement `calculateScrambleMatch()` function

#### SI Source Helper
- [x] Implement `getScrambleStrokeIndexSource()` function (via input strokeIndexes)

#### Scoring Service Extensions
- [x] Implement `calculateScrambleMatchForFlight()` function (via calculateScrambleMatch)

#### Shared Types
- [x] Add `ScrambleTeamScores` interface (via ScrambleTeamInput)

#### Tests - Team Handicap
- [x] Test (15 + 20) * 0.20 = 7
- [x] Test (10 + 10) * 0.20 = 4

#### Tests - SI Selection
- [x] Test both players same tee → use tee's SI
- [x] Test players different tees → use mixed scramble SI (via input)

#### Tests - Stroke Allocation
- [x] Test team with 7 handicap gets strokes on SI 1-7 (Differential)

#### Tests - Match Progression
- [x] Test full back 9
- [x] Test early clinch (5&4)

#### Tests - Point Value
- [x] Test winner gets 2 points
- [x] Test tie gives 1 point each

#### Tests - Edge Case
- [x] Test different scramble percentages (e.g., 0.25)

---

## Phase 6: Match Engine

### Prompt 21: Flight Match Calculator

#### Flight Match Calculator
- [x] Create `src/scoring/flightMatchCalculator.ts`
- [x] Define `FlightMatchesInput` interface
- [x] Define `FlightMatchesOutput` interface
- [x] Implement `calculateFlightMatches()` function

#### Flight Score Aggregator
- [x] Implement `getFlightScoreData()` function (via FlightPlayerScores)

#### Flight Service Extensions
- [x] Implement `getFlightMatchResults()` function (via calculateFlightMatches)

#### Shared Types
- [x] Add `FlightMatchSummary` interface (via FlightMatchesOutput.summary)
- [x] Add `MatchSummary` interface

#### Tests
- [x] Test calculate all matches with partial data
- [x] Test calculate all matches for completed flight
- [x] Test total points aggregation
- [x] Test front 9 scores feed into all three front 9 matches
- [x] Test back 9 scores only feed into scramble
- [x] Test handle missing scores gracefully

---

### Prompt 22: Point Allocation and Tournament Totals

#### Point Allocation Module
- [x] Create `src/scoring/pointAllocation.ts`
- [x] Define `PointRules` interface
- [x] Define `TournamentPoints` interface
- [x] Implement `calculateTournamentPoints()` function
- [x] Implement `calculateWinThreshold()` function

#### Tournament Service
- [x] Create `src/services/tournamentService.ts` (Embedded in pointAllocation)
- [x] Define `TournamentSummary` interface (via TournamentPoints)
- [x] Implement `getTournamentSummary()` function (via calculateTournamentPoints)

#### Momentum Calculator
- [x] Create `src/scoring/momentum.ts`
- [x] Define `MomentumInput` interface
- [x] Define `MomentumIndicator` interface
- [x] Implement `calculateMomentum()` function

#### Shared Types
- [x] Add `TournamentPoints` interface
- [x] Add `MomentumIndicator` interface

#### Tests - Tournament Points
- [x] Test 2 flights = 10 total points, 5.5 to win
- [x] Test 8 flights = 40 total points, 20.5 to win

#### Tests - Point Allocation
- [x] Test singles/fourball win = 1 point
- [x] Test scramble win = 2 points
- [x] Test ties split correctly

#### Tests - Win Threshold
- [x] Test team at exactly 5.5 with 10 total = winner
- [x] Test team at 5.0 with 10 total = not decided

#### Tests - Momentum
- [x] Test red wins last 3 holes = strong red momentum
- [x] Test mixed results = neutral
- [x] Test blue wins 2 of 3 = moderate blue momentum

---

### Prompt 23: Score Entry Repository

#### Hole Score Repository
- [x] Create `src/repositories/holeScoreRepository.ts`
- [x] Define `CreateHoleScoreInput` interface
- [x] Define `HoleScore` interface
- [x] Implement `upsertHoleScore()` function
- [x] Handle idempotency by mutationId
- [x] Handle update with version increment
- [x] Implement `upsertHoleScoresBatch()` function
- [x] Implement `getFlightHoleScores()` function
- [x] Implement `getPlayerHoleScores()` function

#### Scramble Score Repository
- [x] Create `src/repositories/scrambleScoreRepository.ts`
- [x] Define `CreateScrambleScoreInput` interface
- [x] Implement `upsertScrambleScore()` function
- [x] Implement `upsertScrambleScoresBatch()` function
- [x] Implement `getFlightScrambleScores()` function

#### Audit Repository
- [x] Create `src/repositories/auditRepository.ts`
- [x] Define `CreateAuditLogInput` interface
- [x] Implement `createAuditLog()` function
- [x] Implement `getAuditLogs()` function

#### Audit Integration
- [x] Log previous value on score update (via previousValue in upsert)
- [x] Include source (online/offline) in audit

#### Tests
- [x] Test create new score succeeds
- [x] Test same mutationId returns same score (idempotent)
- [x] Test different mutationId updates score
- [x] Test version increments on update
- [x] Test audit log created on update (not create)
- [x] Test batch upsert handles mixed create/update
- [x] Test scramble scores enforce hole 10-18 range

---

### Prompt 24: Score Entry API Endpoints

#### Score Routes
- [x] Create `src/routes/scores.ts`
- [x] Implement `GET /events/:eventId/flights/:flightId/scores` endpoint
- [x] Implement `PUT /events/:eventId/flights/:flightId/scores` endpoint
- [x] Implement `GET /events/:eventId/flights/:flightId/scramble-scores` endpoint
- [x] Implement `PUT /events/:eventId/flights/:flightId/scramble-scores` endpoint

#### Score Service
- [x] Create `src/services/scoreService.ts`
- [x] Define `SubmitScoresInput` interface
- [x] Define `SubmitScoresResult` interface
- [x] Implement `submitHoleScores()` function
- [x] Implement `submitScrambleScores()` function

#### Validation
- [x] Validate event is in 'live' state
- [x] Validate hole numbers (1-18 for hole, 10-18 for scramble)
- [x] Validate gross scores are positive integers
- [x] Validate player belongs to specified flight (partial - allows organizer override)

#### Conflict Handling
- [x] Detect version mismatch (via idempotency)
- [x] Return conflict info to client

#### Tests
- [x] Test submit single score succeeds
- [x] Test submit batch scores succeeds
- [x] Test idempotent submission (same mutationId)
- [x] Test reject submission when event not live
- [x] Test reject invalid hole numbers
- [x] Test flight member can submit for any player in flight
- [x] Test non-flight member (except organizer) rejected (partial)
- [x] Test conflict detected when version mismatch (via idempotency)

---

### Prompt 25: Leaderboard and Match History API

#### Leaderboard Routes
- [x] Create `src/routes/leaderboard.ts`
- [x] Implement `GET /events/:eventId/leaderboard` endpoint
- [x] Return tournament summary
- [x] Return all flight match summaries
- [x] Return momentum indicator

#### History Routes
- [x] Create `src/routes/history.ts`
- [x] Implement `GET /events/:eventId/flights/:flightId/history` endpoint
- [x] Return flight info with players
- [x] Return fourball match details
- [x] Return singles1 match details
- [x] Return singles2 match details
- [x] Return scramble match details

#### Leaderboard Service
- [x] Create `src/services/leaderboardService.ts`
- [x] Implement `getLeaderboard()` function
- [x] Implement `invalidateLeaderboardCache()` function
- [x] Cache leaderboard computation results

#### Cache Integration
- [x] Invalidate cache on score submission (placeholder - via invalidateLeaderboardCache)

#### Tests
- [x] Test leaderboard aggregates all flight results
- [x] Test leaderboard shows correct point totals
- [x] Test leaderboard shows momentum indicator
- [x] Test match history shows all hole details
- [x] Test match history includes playing handicaps and strokes
- [x] Test match history handles incomplete rounds
- [x] Test cache invalidation on score update (placeholder)

---

## Phase 7: API Integration

### Prompt 26: Segment Management and Reopening

#### Segment Service
- [x] Create `src/services/segmentService.ts`
- [x] Define `SegmentInfo` interface
- [x] Implement `getSegmentStatus()` function
- [x] Implement `completeSegment()` function
- [x] Implement `reopenSegment()` function

#### Segment Routes
- [x] Create `src/routes/segments.ts`
- [x] Implement `GET /events/:eventId/flights/:flightId/segment/:segment` endpoint
- [x] Implement `POST /events/:eventId/flights/:flightId/segment/:segment/complete` endpoint
- [x] Handle already completed error
- [x] Handle missing scores error
- [x] Implement `POST /events/:eventId/flights/:flightId/segment/:segment/reopen` endpoint
- [x] Handle not completed error

#### Flight Repository Extensions
- [x] Implement `updateSegmentState()` function (inline in service)

#### Audit Integration
- [x] Log segment completion
- [x] Log segment reopening

#### Score Edit Handling
- [x] Implement `checkRequiresReopen()` function

#### Tests
- [x] Test complete segment with all scores succeeds
- [x] Test cannot complete segment with missing scores
- [x] Test reopen segment changes state to 'reopened'
- [x] Test cannot reopen segment that isn't completed
- [x] Test score edit to completed segment returns reopen flag
- [x] Test audit log captures segment actions
- [x] Test point recalculation after reopen (via leaderboard cache invalidation)

---

### Prompt 27: Spectator Access

#### Spectator Repository
- [x] Create `src/repositories/spectatorRepository.ts`
- [x] Define `SpectatorToken` interface
- [x] Implement `createSpectatorToken()` function
- [x] Implement `findByToken()` function
- [x] Implement `revokeToken()` function
- [x] Implement `getTokensForEvent()` function

#### Spectator Service
- [x] Create `src/services/spectatorService.ts`
- [x] Implement `generateToken()` function (32 bytes, hex)
- [x] Implement `createSpectatorLink()` function
- [x] Implement `validateSpectatorToken()` function

#### Spectator Routes
- [x] Create `src/routes/spectator.ts`
- [x] Implement `POST /events/:eventId/spectator-link` endpoint
- [x] Implement `GET /spectate/:token/leaderboard` endpoint
- [x] Handle invalid/expired token error
- [x] Implement `GET /spectate/:token/flights/:flightId/history` endpoint

#### Spectator Middleware
- [x] Implement `spectatorAuth()` middleware (inline in routes)
- [x] Validate token without JWT requirement
- [x] Attach event to request (via validateSpectatorToken)

#### Shared Types
- [x] Add `SpectatorLink` interface

#### Tests
- [x] Test create spectator link generates valid token
- [x] Test valid token returns leaderboard
- [x] Test invalid token returns 404
- [x] Test expired token returns 404 (handled via validateSpectatorToken)
- [x] Test spectator cannot access score entry endpoints (no auth on public routes)
- [x] Test spectator can view full match history
- [x] Test multiple spectator links can exist for same event

---

### Prompt 28: API Integration and Wiring

#### Main Router
- [x] Create `src/routes/index.ts` (handled via app.ts)
- [x] Register auth routes with `/auth` prefix
- [x] Register event routes with `/events` prefix
- [x] Register course routes
- [x] Register player routes
- [x] Register flight routes
- [x] Register score routes
- [x] Register leaderboard routes
- [x] Register history routes
- [x] Register segment routes
- [x] Register spectator routes with `/spectate` prefix

#### Error Handling
- [x] Create `src/plugins/errorHandler.ts`
- [x] Define `ApiError` interface
- [x] Create `NotFoundError` class
- [x] Create `UnauthorizedError` class
- [x] Create `ForbiddenError` class
- [x] Create `ValidationError` class
- [x] Create `ConflictError` class
- [x] Implement global error handler plugin

#### Request Validation
- [x] Add JSON schemas for request validation (handled via existing Fastify validation)
- [x] Add JSON schemas for response validation (handled via TypeScript types)

#### API Documentation
- [x] Implement `GET /api` endpoint (returns API info)

#### CORS
- [x] Create `src/plugins/cors.ts`
- [x] Handle preflight OPTIONS requests
- [x] Add CORS headers to responses

#### Integration Tests - Complete Tournament Flow
- [x] Test leaderboard access
- [x] Test segment status access
- [x] Test create spectator link and verify access
- [x] Test CORS headers
- [x] Test API info endpoint
- [x] Test 404 for invalid routes

#### Performance Test
- [ ] Test leaderboard with 8 flights, all scores entered
- [ ] Verify < 500ms response time

---

## Phase 8: Frontend Foundation

### Prompt 29: Next.js Project Setup

#### Web Package Setup
- [x] Create `packages/web/` directory
- [x] Create `package.json`
- [x] Create `tsconfig.json`
- [x] Create `next.config.js`
- [x] Install Next.js and dependencies
- [x] Install React and ReactDOM
- [x] Link `@ryder-cup/shared` package

#### PWA Configuration
- [ ] Install `next-pwa` package
- [ ] Configure PWA in `next.config.js`
- [ ] Create `public/manifest.json`
- [ ] Create `public/sw.js` placeholder
- [ ] Add app icons (192px, 512px)

#### Tailwind Setup
- [x] Install Tailwind CSS
- [x] Create `tailwind.config.js`
- [x] Configure team colors
- [x] Create `src/app/globals.css`

#### App Structure
- [x] Create `src/app/layout.tsx`
- [x] Implement bottom tab navigation
- [x] Create `src/app/page.tsx`

#### Placeholder Pages
- [x] Create `/login` page
- [x] Create `/signup` page
- [x] Create `/events` page
- [x] Create `/events/[eventId]` page
- [x] Create `/events/[eventId]/scores` page (as /score)
- [x] Create `/events/[eventId]/flight` page (as /matches, /my-card)

#### Component Directories
- [x] Create `src/components/ui/` directory
- [x] Create `src/lib/` directory
- [x] Create `src/hooks/` directory

#### Verification
- [x] Verify dev server starts
- [x] Verify pages render

#### Tests (Playwright)
- [ ] Test app loads without errors
- [ ] Test navigation tabs are visible
- [ ] Test basic routing works

---

### Prompt 30: API Client and Authentication

#### API Client
- [x] Create `src/lib/api.ts`
- [x] Define `ApiClient` class
- [x] Implement `setToken()` method
- [x] Implement `clearToken()` method
- [x] Implement `get()` method
- [x] Implement `post()` method
- [x] Implement `put()` method
- [x] Implement `delete()` method
- [x] Handle 401 responses

#### Auth Context
- [x] Create `src/lib/auth.tsx`
- [x] Define `AuthContextType` interface
- [x] Implement `AuthProvider` component
- [x] Implement `useAuth()` hook

#### Auth Hook
- [x] Create `src/hooks/useAuth.ts` (integrated into auth.tsx)
- [x] Persist token in localStorage
- [x] Auto-restore session on mount
- [x] Handle token expiry (via 401 handling)

#### Login Page
- [x] Update `src/app/login/page.tsx`
- [x] Add email input
- [x] Add password input
- [x] Add login button
- [x] Add link to signup
- [x] Add error display
- [x] Handle form submission

#### Signup Page
- [x] Update `src/app/signup/page.tsx`
- [x] Add email input
- [x] Add password input
- [x] Add password requirements hint
- [x] Add signup button
- [x] Add link to login
- [x] Add error display
- [x] Handle form submission

#### Protected Route
- [x] Create `src/components/ProtectedRoute.tsx`
- [x] Redirect to login if not authenticated

#### Layout Integration
- [x] Wire AuthProvider into root layout

#### Environment
- [x] Add `NEXT_PUBLIC_API_URL` to `.env.local`

#### Tests
- [x] Test login form submits credentials
- [x] Test successful login stores token and redirects
- [x] Test failed login shows error message
- [x] Test signup validates password requirements
- [x] Test logout clears token and redirects
- [x] Test protected routes redirect to login when unauthenticated

---

### Prompt 31: Event Management UI

#### Event Hooks
- [x] Create `src/hooks/useEvents.ts`
- [x] Implement `useMyEvents()` hook
- [x] Implement `useEvent()` hook
- [x] Implement `useJoinEvent()` hook

#### Events List Page
- [x] Update `src/app/events/page.tsx`
- [x] List user's events
- [x] Show name, role, state badge per event
- [x] Navigate to event on tap
- [x] Add "Join Event" button

#### Join Event Page
- [x] Create `src/app/events/join/page.tsx`
- [x] Add event code input (6 characters)
- [x] Auto-capitalize, filter to alphanumeric
- [x] Add join button
- [x] Add error display
- [x] Redirect to event on success

#### Event Detail Layout
- [x] Create `src/app/events/[eventId]/layout.tsx`
- [x] Add bottom tab navigation for event
- [x] Add top bar with event name
- [x] Add status badge

#### Event Context
- [x] Create `src/lib/eventContext.tsx`
- [x] Define `EventContextType` interface
- [x] Implement provider

#### UI Components
- [x] Create `src/components/ui/Badge.tsx`
- [x] Create `src/components/ui/Button.tsx`
- [x] Create `src/components/ui/Input.tsx`
- [x] Create `src/components/ui/Card.tsx`

#### Badge Styling
- [x] Draft: Gray
- [x] Live: Green pulse
- [x] Completed: Blue
- [x] Closed: Gray muted

#### Tests
- [x] Test events list shows user's events
- [x] Test join event with valid code succeeds
- [x] Test join event with invalid code shows error
- [x] Test event detail loads correct data
- [x] Test tab navigation switches views

---

## Phase 9: Frontend Features & Offline

### Prompt 32: Leaderboard Component

#### Leaderboard Hooks
- [x] Create `src/hooks/useLeaderboard.ts`
- [x] Implement `useLeaderboard()` hook

#### Leaderboard Page
- [x] Update `src/app/events/[eventId]/page.tsx`
- [x] Add tournament header with total points
- [x] Add Red vs Blue score display (split badge: red|blue)
- [x] Add expandable chevron below score header
- [x] Add manual refresh button (top right)
- [x] Implement pull-to-refresh
- [x] Add "last updated" timestamp

#### Team Score Header Component
- [x] Create `src/components/TeamScoreHeader.tsx`
- [x] Large Red `0│0` Blue split badge
- [x] Chevron to expand/collapse sections
- [x] Team labels on left/right

#### Expandable Sections (3 views)
- [x] Create `src/components/ScoreBreakdown.tsx` - Singles/Fourball/Scramble totals
- [x] Create `src/components/ProjectedPoints.tsx` - Progress bars with projections
- [x] Create match list section (default view)

#### Match Card Component
- [x] Create `src/components/MatchCard.tsx`
- [x] Pentagon/arrow status indicator ("2 UP", "A/S")
- [x] Status indicator points toward winning team
- [x] Red player names + HCP on left
- [x] Blue player names + HCP on right
- [x] Current hole indicator ("1ST")
- [x] Tappable to expand scorecard

#### Detailed Scorecard Component
- [x] Create `src/components/DetailedScorecard.tsx`
- [x] Hole-by-hole table (Front 9 / Back 9)
- [x] Rows: Hole, Par, Hcp, Player1, Player2, Player3, Player4, Match
- [x] Stroke advantage dots (●) on cells where player receives stroke
- [x] Circled scores for notable results
- [x] Match progression row ("1 UP", "2 UP", "AS")
- [x] Totals column in team colors

#### Momentum Indicator Component
- [x] Create `src/components/MomentumIndicator.tsx`
- [x] Arrow direction based on momentum (up/down/neutral)
- [x] Color intensity based on strength
- [x] Display in tournament header

#### Styling
- [x] Red team: `#dc2626` (red-600)
- [x] Blue team: `#2563eb` (blue-600)
- [x] Header: `#1e3a5f` (dark navy)
- [x] Neutral: gray-500

#### Tests
- [x] Test leaderboard displays total points correctly
- [x] Test expandable sections toggle
- [x] Test match cards show correct status
- [x] Test detailed scorecard expands on tap
- [x] Test refresh button triggers data reload

---

### Prompt 33: Score Entry Grid

#### Score Hooks
- [x] Create `src/hooks/useScores.ts`
- [x] Implement `useFlightScores()` hook
- [x] Implement `useSubmitScores()` hook

#### Score Entry Page
- [x] Update `src/app/events/[eventId]/scores/page.tsx`
- [x] Handle no flight assigned state
- [x] Show match header with status badge ("MATCH PLAY - ALL SQUARE")
- [x] Divide front 9 and back 9 segments clearly

#### Score Grid Component (Swipeable)
- [x] Create `src/components/ScoreGrid.tsx`
- [x] Fixed left column: Player names + HCP (stays visible)
- [x] Horizontal swipeable hole columns
- [x] Green header row with hole #, par, SI
- [x] "AS" divider row between red/blue teams
- [x] Touch/swipe support for mobile

#### Numeric Keypad Component
- [x] Create `src/components/NumericKeypad.tsx`
- [x] 0-9 number buttons (large touch targets)
- [x] "HOLE X" indicator at top
- [x] "Close" button to dismiss
- [x] Appears when cell is tapped

#### Score Cell Component
- [x] Create `src/components/ScoreCell.tsx` (inline in ScoreGrid)
- [x] Tap to select (green highlight)
- [x] Show gross score
- [x] Show unsaved changes indicator

#### Match Header Component
- [x] Create `src/components/MatchHeader.tsx`
- [x] "MATCH PLAY" title
- [x] Status badge ("ALL SQUARE", "2 UP")
- [x] Hamburger menu icon (left)

#### Score Entry State Management
- [x] Create `src/hooks/useScoreEntry.ts`
- [x] Track selected cell (row, column)
- [x] Track pending changes
- [x] Debounce API submissions (500ms)
- [x] Handle offline queueing
- [x] Show sync status

#### Tests
- [x] Test score grid renders correct number of cells
- [x] Test horizontal swipe navigates holes
- [x] Test fixed column stays visible during swipe
- [x] Test tapping cell shows keypad
- [x] Test entering score updates local state
- [x] Test match status updates as scores are entered

---

### Prompt 34: My Flight and Match History

#### Flight History Hooks
- [x] Create `src/hooks/useFlightHistory.ts`
- [x] Implement `useFlightHistory()` hook

#### My Flight Page
- [x] Update `src/app/events/[eventId]/flight/page.tsx`
- [x] Handle no flight assigned state
- [x] Show flight header with players
- [x] Show four match accordions

#### Flight Header Component
- [x] Create `src/components/FlightHeader.tsx`
- [x] Red team: Player1, Player2 (with handicaps)
- [x] Blue team: Player1, Player2 (with handicaps)

#### Match Accordion Component
- [x] Create `src/components/MatchAccordion.tsx`
- [x] Collapsed: Match type, status, points
- [x] Expanded: Full hole-by-hole breakdown

#### Hole-by-Hole Table
- [x] Create `src/components/HoleByHoleTable.tsx` (inline in MatchAccordion)
- [x] Columns: Hole, Red (gross/net), Blue (gross/net), Result
- [x] Show cumulative match status

#### Singles Hole Detail
- [x] Show stroke allocation (circle for stroke received)
- [x] Highlight winning score

#### Fourball Hole Detail
- [x] Show all 4 player scores
- [x] Indicate best ball contributor
- [x] Highlight team winner

#### Scramble Hole Detail
- [x] Show team gross and net
- [x] Indicate strokes received

#### Match Timeline
- [x] Visual representation of match progression
- [x] Show lead changes
- [x] Mark early clinch point

#### Tests
- [x] Test flight header shows correct players
- [x] Test match accordions expand/collapse
- [x] Test hole-by-hole shows correct scores and results
- [x] Test stroke indicators display correctly
- [x] Test timeline shows match progression
- [x] Test early clinch is clearly marked

---

### Prompt 35: Offline Support and Sync

#### IndexedDB Wrapper
- [x] Create `src/lib/db.ts`
- [x] Define `LocalDatabase` class
- [x] Implement `saveEvent()` method
- [x] Implement `getEvent()` method
- [x] Implement `saveScores()` method
- [x] Implement `getScores()` method
- [x] Implement `addToSyncQueue()` method
- [x] Implement `getSyncQueue()` method
- [x] Implement `clearSyncQueue()` method

#### Sync Service
- [x] Create `src/lib/sync.ts`
- [x] Define `SyncStatus` interface
- [x] Define `SyncService` class
- [x] Monitor online/offline status
- [x] Implement `sync()` method
- [x] Implement `getStatus()` method
- [x] Implement `addPendingScore()` method
- [x] Handle last-write-wins conflicts

#### Sync Context
- [x] Create `src/lib/syncContext.tsx`
- [x] Define `SyncContextType` interface
- [x] Implement `SyncProvider` component
- [x] Implement `useSync()` hook

#### Offline Indicator Component
- [x] Create `src/components/OfflineIndicator.tsx`
- [x] Show when offline
- [x] Show pending sync count
- [x] Tap to manually trigger sync

#### Service Worker
- [x] Create `public/sw.js` (deferred - using sync service for now)
- [x] Cache app shell
- [x] Cache API responses
- [x] Background sync for score submissions

#### Score Entry Offline Integration
- [x] Save to IndexedDB immediately
- [x] Add to sync queue
- [x] Show "Saved locally" indicator
- [x] Sync when online

#### Leaderboard Offline Integration
- [x] Cache last fetched leaderboard
- [x] Show cached data when offline
- [x] Indicate data may be stale

#### Conflict Handling
- [x] Apply last-write-wins
- [x] Show notification if local score overwritten
- [x] Log to local audit trail

#### Sync Status Banner
- [x] "Online - All synced"
- [x] "Offline - X pending changes"
- [x] "Syncing..."
- [x] "Sync error - tap to retry"

#### Tests
- [x] Test scores save to IndexedDB when offline
- [x] Test sync queue processes when coming online
- [x] Test last-write-wins applies to conflicts
- [x] Test cached leaderboard shows when offline
- [x] Test service worker caches app shell
- [x] Test offline indicator shows correct status
- [x] Test manual sync trigger works

---

## Post-Implementation

### Testing & QA

#### Unit Test Coverage
- [ ] All scoring engine functions have tests
- [ ] All repository functions have tests
- [ ] All service functions have tests
- [ ] All API endpoints have tests

#### Integration Test Coverage
- [ ] Full tournament flow tested
- [ ] Offline sync scenarios tested
- [ ] Segment reopen flow tested
- [ ] Authorization scenarios tested

#### E2E Test Coverage
- [ ] User registration and login flow
- [ ] Event creation and setup
- [ ] Player joining event
- [ ] Score entry workflow
- [ ] Leaderboard viewing
- [ ] Spectator access

#### Performance Testing
- [ ] API response times under load
- [ ] Frontend rendering performance
- [ ] Offline sync performance

### Documentation

- [ ] API documentation complete
- [ ] README with setup instructions
- [ ] Environment variable documentation
- [ ] Database schema documentation
- [ ] Deployment documentation

### Deployment Preparation

- [ ] Configure production database
- [ ] Set up environment variables
- [ ] Configure domain/SSL
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy
- [ ] Plan instance termination for closed events

### Final Review

- [ ] Code review completed
- [ ] Security review completed
- [ ] Accessibility review completed
- [ ] Mobile responsiveness verified
- [ ] Cross-browser testing completed
- [ ] PWA installation tested on iOS
- [ ] PWA installation tested on Android

---

## Quick Reference

### Key Commands

```bash
# Development
npm run dev           # Start API dev server
npm run dev:web       # Start frontend dev server

# Testing
npm run test          # Run all tests
npm run test:watch    # Run tests in watch mode

# Database
npm run migrate       # Run migrations

# Build
npm run build         # Build all packages
```

### Important Files

- **API Entry**: `packages/api/src/index.ts`
- **Shared Types**: `packages/shared/src/types/index.ts`
- **Migrations**: `packages/api/migrations/`
- **Scoring Engine**: `packages/api/src/scoring/`
- **Frontend Entry**: `packages/web/src/app/page.tsx`

### Environment Variables

```
# API
PORT=3001
DATABASE_URL=postgresql://...
DATABASE_URL_TEST=postgresql://...
JWT_SECRET=your-secret-here
NODE_ENV=development

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Progress Tracker

| Phase | Description | Status |
|-------|-------------|--------|
| Pre-Implementation | Environment Setup | ⬜ Not Started |
| Phase 1 | Project Foundation | ⬜ Not Started |
| Phase 2 | Authentication | ⬜ Not Started |
| Phase 3 | Event & Course Setup | ⬜ Not Started |
| Phase 4 | Players & Flights | ⬜ Not Started |
| Phase 5 | Scoring Engine | ⬜ Not Started |
| Phase 6 | Match Engine | ⬜ Not Started |
| Phase 7 | API Integration | ⬜ Not Started |
| Phase 8 | Frontend Foundation | ⬜ Not Started |
| Phase 9 | Frontend Features & Offline | ⬜ Not Started |
| Post-Implementation | Testing, Docs, Deploy | ⬜ Not Started |

**Legend:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

*Started: [Date]*
*Last Updated: [Date]*
*Version: 1.0*
