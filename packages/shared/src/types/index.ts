export type EventState = 'draft' | 'live' | 'completed' | 'closed';
export type SegmentState = 'open' | 'completed' | 'reopened';
export type Team = 'red' | 'blue';
export type Role = 'organizer' | 'player';
export type MatchType = 'fourball' | 'singles1' | 'singles2' | 'scramble';
export type MatchStatus = 'up' | 'down' | 'as' | 'dormie' | 'final';

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
    flightNumber: number;
    frontState: 'open' | 'completed' | 'reopened';
    backState: 'open' | 'completed' | 'reopened';
    createdAt: string;
}

export interface FlightWithPlayers extends Flight {
    players: Player[];
}

export interface CreateFlightsRequest {
    count: number;
}

export interface UpdateFlightRequest {
    frontState?: 'open' | 'completed' | 'reopened';
    backState?: 'open' | 'completed' | 'reopened';
}

export interface AssignPlayerRequest {
    playerId: string;
    team: 'red' | 'blue';
    position: 1 | 2;
}
