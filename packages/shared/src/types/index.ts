export type EventState = 'draft' | 'live' | 'completed' | 'closed';
export type RoundState = 'open' | 'completed' | 'reopened';
export type SegmentState = RoundState; // alias for legacy call sites; will be removed after Task 6
export type Team = 'red' | 'blue';
export type Role = 'organizer' | 'player';
export type MatchType = 'fourball' | 'singles1' | 'singles2';
export type MatchStatus = 'up' | 'down' | 'as' | 'dormie' | 'final';
export type SidePotType = 'longest_drive' | 'closest_to_pin';

export interface UserResponse {
    id: string;
    email: string;
    name: string;
    appRole: 'admin' | 'user';
    createdAt: string;
}

export interface SignupRequest {
    email: string;
    name: string;
    password: string;
}

export interface AuthResponse {
    user: UserResponse;
    token?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface UpdateProfileRequest {
    name: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface PasswordResetRequest {
    email: string;
}

export interface PasswordResetConfirmRequest {
    token: string;
    newPassword: string;
}

export interface Event {
    id: string;
    name: string;
    start_date: string; // ISO Date
    end_date: string;   // ISO Date
    format: MatchType;
    status: EventState;
    created_at: string;
}

export interface CreateEventRequest {
    name: string;
    startDate: string;
    endDate: string;
    format: MatchType;
}

export interface UpdateEventRequest {
    name?: string;
    startDate?: string;
    endDate?: string;
    format?: MatchType;
    status?: EventState;
    betAmount?: number;
}

export type EventRole = 'organizer' | 'player';

export interface EventMember {
    id: string;
    eventId: string;
    userId: string;
    role: EventRole;
    createdAt: string;
}

export interface JoinEventRequest {
    userId: string;
}

export interface Hole {
    id?: string;
    holeNumber: number;
    par: number;
    strokeIndex: number;
}

export interface Tee {
    id?: string;
    name: string;
    holes: Hole[];
    /** USGA slope rating (typically 55-155). Optional until set by organizer. */
    slopeRating?: number | null;
    /** USGA course rating (typically 65-77). Optional until set by organizer. */
    courseRating?: number | null;
}

export interface Course {
    id: string;
    eventId: string;
    name: string;
    tees: Tee[];
}

export interface CreateCourseRequest {
    name: string;
    tees: Tee[];
}

export interface HoleOverride {
    id?: string;
    eventId: string;
    holeId: string;
    newStrokeIndex: number;
}

export interface EffectiveHole extends Hole {
    originalStrokeIndex: number;
    isOverridden: boolean;
}

export interface SetOverrideRequest {
    teeId: string; // To identify which tee's holes we are overriding (or we just send holeIds map)
    // Actually, usually you override a whole set for a tee. 
    // Let's keep it simple: Map<holeId, strokeIndex> or array of objects?
    // Array is easier to validate.
    overrides: { holeId: string; strokeIndex: number }[];
}

export interface MixedScrambleSI {
    id?: string;
    eventId: string;
    holeNumber: number;
    strokeIndex: number;
}

export interface SetScrambleSIRequest {
    indexes: { holeNumber: number; strokeIndex: number }[];
}

export interface Player {
    id: string;
    eventId: string;
    firstName: string;
    lastName: string;
    handicapIndex: number;
    teeId: string;
    flightId?: string; // Optional initially
    team?: 'red' | 'blue';
    position?: 1 | 2;
    userId?: string; // Optional link to registered user
    createdAt: string;
    updatedAt: string;
}

export interface CreatePlayerRequest {
    firstName: string;
    lastName: string;
    handicapIndex: number;
    teeId: string;
    userId?: string;
}

export interface UpdatePlayerRequest {
    firstName?: string;
    lastName?: string;
    handicapIndex?: number;
    teeId?: string;
    flightId?: string;
    userId?: string;
}

export interface Flight {
    id: string;
    eventId: string;
    roundId: string;
    flightNumber: number;
    state: RoundState;
    createdAt: string;
}

export interface FlightWithPlayers extends Flight {
    players: Player[];
}

export interface CreateFlightsRequest {
    count: number;
    roundId: string;
}

export interface UpdateFlightRequest {
    state?: RoundState;
}

export interface AssignPlayerRequest {
    playerId: string;
    team: 'red' | 'blue';
    position: 1 | 2;
}

/** Per-round flight assignment (junction row in `player_flights`). */
export interface PlayerFlight {
    id: string;
    playerId: string;
    roundId: string;
    flightId: string;
    team: 'red' | 'blue';
    position: 1 | 2;
    createdAt: string;
}

/** Body for tee slope/rating PATCH. */
export interface UpdateTeeRatingRequest {
    slopeRating: number | null;
    courseRating: number | null;
}

/** Per-player playing-handicap snapshot for a given round. */
export interface PlayingHandicap {
    playerId: string;
    playerName: string;
    handicapIndex: number;
    teeId: string | null;
    teeName: string | null;
    /** Sum of par across the holes of the chosen tee. */
    coursePar: number | null;
    slopeRating: number | null;
    courseRating: number | null;
    /** USGA Course Handicap (rounded). null if slope/rating missing. */
    courseHandicap: number | null;
    /** Course HCP × singles allowance, rounded, capped 36. null if courseHandicap null. */
    playingHcpSingles: number | null;
    /** Course HCP × fourball allowance, rounded, capped 36. null if courseHandicap null. */
    playingHcpFourball: number | null;
}

// =============================================
// La Romana: rounds, netos, side pots
// =============================================

export interface Round {
    id: string;
    eventId: string;
    roundNumber: number;
    courseId: string;
    scheduledAt: string | null;
    hcpSinglesPct: number;   // 0.80 for La Romana
    hcpFourballPct: number;
    holesPerRound: number;   // 9 or 18 (default 18)
    state: RoundState;
    createdAt: string;
}

export interface CreateRoundRequest {
    roundNumber: number;
    courseId: string;
    scheduledAt?: string | null;
    hcpSinglesPct?: number;
    hcpFourballPct?: number;
    holesPerRound?: number;  // 9 or 18 (default 18)
}

export interface UpdateRoundRequest {
    courseId?: string;
    scheduledAt?: string | null;
    hcpSinglesPct?: number;
    hcpFourballPct?: number;
    holesPerRound?: number;
    state?: RoundState;
}

export interface NetoPot {
    id: string;
    roundId: string;
    flightId: string;
    potAmountUsd: number;
    createdAt: string;
    winners: NetoPotWinner[];
}

export interface NetoPotWinner {
    id: string;
    potId: string;
    playerId: string;
    rank: 1 | 2;
}

export interface CreateNetoPotRequest {
    roundId: string;
    flightId: string;
    potAmountUsd: number;
}

export interface SetNetoWinnersRequest {
    winners: { playerId: string; rank: 1 | 2 }[];
}

export interface SidePot {
    id: string;
    roundId: string;
    type: SidePotType;
    holeNumber: number;
    winningPlayerId: string | null;
    createdAt: string;
}

export interface CreateSidePotRequest {
    roundId: string;
    type: SidePotType;
    holeNumber: number;
}

export interface SetSidePotWinnerRequest {
    winningPlayerId: string | null;
}
