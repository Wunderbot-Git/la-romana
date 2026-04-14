const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
    private token: string | null = null;

    setToken(token: string) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
        }
    }

    clearToken() {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
        }
    }

    getToken(): string | null {
        if (this.token) return this.token;
        if (typeof window !== 'undefined') {
            return localStorage.getItem('auth_token');
        }
        return null;
    }

    private async request<T>(
        method: string,
        path: string,
        body?: unknown
    ): Promise<T> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        // Handle 401 - clear token but do not auto-redirect
        // Let UI components (like ProtectedRoute) handle redirects so public pages stay accessible.
        if (response.status === 401) {
            this.clearToken();
            throw new Error('Unauthorized');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }

        return data as T;
    }

    async get<T>(path: string): Promise<T> {
        return this.request<T>('GET', path);
    }

    async post<T>(path: string, body?: unknown): Promise<T> {
        return this.request<T>('POST', path, body);
    }

    async put<T>(path: string, body?: unknown): Promise<T> {
        return this.request<T>('PUT', path, body);
    }

    async patch<T>(path: string, body?: unknown): Promise<T> {
        return this.request<T>('PATCH', path, body);
    }

    async delete<T>(path: string): Promise<T> {
        return this.request<T>('DELETE', path);
    }
}

export const api = new ApiClient();
