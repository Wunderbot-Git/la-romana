import { FastifyInstance } from 'fastify';
import * as userService from '../services/userService';
import { SignupRequest, LoginRequest, AuthResponse, UserResponse } from '@ryder-cup/shared';
import { authenticate } from '../middleware/auth';

export const authRoutes = async (fastify: FastifyInstance) => {

    // Signup
    fastify.post<{ Body: SignupRequest; Reply: AuthResponse | { error: string } }>(
        '/auth/signup',
        async (request, reply) => {
            const { email, name, password } = request.body;

            if (!email || !name || !password) {
                return reply.status(400).send({ error: 'Email, name, and password are required' });
            }

            if (!userService.validateEmail(email)) {
                return reply.status(400).send({ error: 'Invalid email format' });
            }

            const pwValidation = userService.validatePassword(password);
            if (!pwValidation.valid) {
                return reply.status(400).send({ error: pwValidation.errors[0] });
            }

            try {
                const user = await userService.registerUser(email, name, password);
                reply.status(201).send({
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        appRole: user.app_role,
                        createdAt: user.created_at.toISOString(),
                    },
                });
            } catch (error: any) {
                if (error.code === 'DUPLICATE_EMAIL') {
                    return reply.status(409).send({ error: 'Email already registered' });
                }
                if (error.message) {
                    return reply.status(400).send({ error: error.message });
                }
                request.log.error(error);
                return reply.status(500).send({ error: 'Internal Server Error' });
            }
        }
    );

    // Login
    fastify.post<{ Body: LoginRequest; Reply: AuthResponse | { error: string } }>(
        '/auth/login',
        async (request, reply) => {
            const { email, password } = request.body;

            if (!email || !password) {
                return reply.status(400).send({ error: 'Email and password are required' });
            }

            try {
                const user = await userService.loginUser(email, password);

                const token = fastify.jwt.sign({
                    userId: user.id,
                    email: user.email,
                    appRole: user.app_role
                });

                return reply.send({
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        appRole: user.app_role,
                        createdAt: user.created_at.toISOString(),
                    },
                    token
                });

            } catch (error: any) {
                return reply.status(401).send({ error: 'Invalid email or password' });
            }
        }
    );

    // Logout
    fastify.post('/auth/logout', async (request, reply) => {
        return reply.send({ message: 'Logged out successfully' });
    });

    // Me
    fastify.get<{ Reply: UserResponse }>('/auth/me', {
        onRequest: [authenticate]
    }, async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const user = await userService.findById(userId);

        if (!user) {
            return reply.status(401).send({ error: 'User not found' } as any);
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            appRole: user.app_role,
            createdAt: user.created_at.toISOString()
        };
    });

    // Update Profile (name)
    fastify.put<{ Body: { name: string } }>('/auth/profile', {
        onRequest: [authenticate]
    }, async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { name } = request.body;

        if (!name) {
            return reply.status(400).send({ error: 'Name is required' });
        }

        try {
            const user = await userService.updateProfile(userId, name);
            return {
                id: user.id,
                email: user.email,
                name: user.name,
                appRole: user.app_role,
                createdAt: user.created_at.toISOString()
            };
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // Change Password
    fastify.put<{ Body: { currentPassword: string; newPassword: string } }>('/auth/change-password', {
        onRequest: [authenticate]
    }, async (request, reply) => {
        const { userId } = request.user as { userId: string };
        const { currentPassword, newPassword } = request.body;

        if (!currentPassword || !newPassword) {
            return reply.status(400).send({ error: 'Current password and new password are required' });
        }

        try {
            await userService.changePassword(userId, currentPassword, newPassword);
            return { message: 'Password changed successfully' };
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // Request Password Reset
    fastify.post<{ Body: { email: string } }>(
        '/auth/reset-password/request',
        async (request, reply) => {
            const { email } = request.body;
            if (!email) {
                return reply.status(400).send({ error: 'Email is required' });
            }

            await userService.requestPasswordReset(email);

            // Always return success for security
            return reply.send({ message: 'If encryption exists, reset email sent.' });
        }
    );

    // Confirm Password Reset
    fastify.post<{ Body: { token: string, newPassword: string } }>(
        '/auth/reset-password/confirm',
        async (request, reply) => {
            const { token, newPassword } = request.body;

            if (!token || !newPassword) {
                return reply.status(400).send({ error: 'Token and new password required' });
            }

            try {
                await userService.resetPassword(token, newPassword);
                return reply.send({ message: 'Password reset successfully' });
            } catch (error: any) {
                // In production, might be vague "Invalid request", but useful for dev
                return reply.status(400).send({ error: error.message });
            }
        }
    );
};
