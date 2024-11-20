// src/lib/api.ts
import axios, { AxiosError } from 'axios';
import {
    LoginCredentials,
    MessagePayload,
    LoginResponse,
    MessageResponse,
    SessionResponse
} from './types';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const loginUser = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
        const { data } = await api.post<LoginResponse>('/login', credentials);
        return data;
    } catch (error) {
        if (error instanceof AxiosError) {
            console.error(error.response?.data);
            return {
                success: false,
                error: error.response?.data?.error || `Login failed`,
            };
        }
        return {
            success: false,
            error: 'An unexpected error occurred',
        };
    }
};

export const checkSession = async (username: string): Promise<SessionResponse> => {
    try {
        const { data } = await api.post<SessionResponse>('/session/load', { username });
        return data;
    } catch (error) {
        if (error instanceof AxiosError) {
            return {
                success: false,
                error: error.response?.data?.error || 'Session check failed',
            };
        }
        return {
            success: false,
            error: 'An unexpected error occurred',
        };
    }
};

export const sendMessage = async (payload: MessagePayload): Promise<MessageResponse> => {
    try {
        const { data } = await api.post<MessageResponse>('/messages/send', payload);
        return data;
    } catch (error) {
        if (error instanceof AxiosError) {
            return {
                success: false,
                error: error.response?.data?.error || 'Failed to send message',
            };
        }
        return {
            success: false,
            error: 'An unexpected error occurred',
        };
    }
};

// Error handling utility
export class ApiError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
        public readonly status?: number
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

// Type guard for checking API error responses
export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
}