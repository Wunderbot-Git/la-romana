import * as userRepository from '../repositories/userRepository';
import { User } from '../repositories/userRepository';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const validateEmail = (email: string): boolean => {
    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }
    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/[a-zA-Z]/.test(password)) {
        errors.push('Password must contain at least one letter');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
};

export const registerUser = async (email: string, name: string, password: string): Promise<User> => {
    // 1. Validate email (already done by controller potentially, but good to be safe)
    if (!validateEmail(email)) {
        throw new Error('Invalid email format'); // Should be caught by controller before calling service ideally
    }

    // 2. Validate password
    const pwValidation = validatePassword(password);
    if (!pwValidation.valid) {
        throw new Error(pwValidation.errors[0]); // Throw first error
    }

    // 3. Check for duplicates
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
        const error = new Error('Email already registered');
        (error as any).code = 'DUPLICATE_EMAIL';
        throw error;
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 5. Create user
    return userRepository.createUser({ email, name, passwordHash });
};

export const loginUser = async (email: string, password: string): Promise<User> => {
    const user = await userRepository.findByEmail(email);
    if (!user) {
        throw new Error('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
        throw new Error('Invalid email or password');
    }

    return user;
};

export const findById = async (id: string): Promise<User | null> => {
    return userRepository.findById(id);
};

// Simple secure random token generator
const generateToken = (): string => {
    return require('crypto').randomBytes(32).toString('hex');
};

export const requestPasswordReset = async (email: string): Promise<string> => {
    const user = await userRepository.findByEmail(email);
    // Security: Don't reveal if user exists or not, but for this step we need to return something to mock email sending
    if (!user) {
        // Return a fake token or just void to simulate success without doing anything
        return 'simulated-token';
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await userRepository.storeResetToken(user.id, token, expiresAt);

    // In a real app, send email here. 
    // For this prompt, we return the token to the controller for testing purposes/manual response.
    return token;
};

export const updateProfile = async (userId: string, name: string): Promise<User> => {
    if (!name || !name.trim()) {
        throw new Error('Name is required');
    }
    return userRepository.updateName(userId, name.trim());
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<void> => {
    const user = await userRepository.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
        throw new Error('Current password is incorrect');
    }

    const pwValidation = validatePassword(newPassword);
    if (!pwValidation.valid) {
        throw new Error(pwValidation.errors[0]);
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userRepository.updatePassword(userId, passwordHash);
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    const resetData = await userRepository.findResetToken(token);

    if (!resetData) {
        throw new Error('Invalid or expired token');
    }

    if (resetData.used) {
        throw new Error('Token already used');
    }

    if (new Date() > resetData.expiresAt) {
        throw new Error('Invalid or expired token');
    }

    const pwValidation = validatePassword(newPassword);
    if (!pwValidation.valid) {
        throw new Error(pwValidation.errors[0]);
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await userRepository.updatePassword(resetData.userId, passwordHash);
    await userRepository.markTokenUsed(token);
};
