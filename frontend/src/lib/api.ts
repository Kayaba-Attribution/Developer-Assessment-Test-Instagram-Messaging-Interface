// src/lib/api.ts
import axios, { AxiosError } from 'axios';
import {
    LoginCredentials,
    MessagePayload,
    LoginResponse,
    MessageResponse,
    SessionResponse,
    Message,
} from './types';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});




// New types and interfaces needed for the combined functionality
export interface CombinedMessageResponse extends MessageResponse {
    sessionInfo?: {
        isNewSession: boolean;
        expiresAt?: string;
    };
}

export interface CombinedMessagePayload {
    username: string;
    password: string;
    recipient: string;
    message: string;
}

// Admin
interface MessageHistoryResponse extends MessageResponse {
    data?: Message[];
}

interface GoogleUser {
    _id: string;
    email: string;
    name: string;
}

interface AuthResponse {
    user: GoogleUser | null;
}

export const getCurrentUser = async (): Promise<AuthResponse> => {
    const { data } = await api.get<AuthResponse>('/auth/user');
    return data;
};

export const logoutUser = async (): Promise<void> => {
    await api.get('/auth/logout');
};

// Log and status functions
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

// New combined function for authentication and message sending
export const sendMessageWithAuth = async (payload: CombinedMessagePayload): Promise<CombinedMessageResponse> => {
    try {
        const { data } = await api.post<CombinedMessageResponse>('/messages/send-with-auth', payload);
        return data;
    } catch (error) {
        if (error instanceof AxiosError) {
            // Handle specific error cases
            const errorMessage = error.response?.data?.error || 'Failed to process request';
            const status = error.response?.status;

            // Map specific error status codes to meaningful messages
            let userMessage = errorMessage;
            switch (status) {
                case 400:
                    userMessage = 'Please fill in all required fields';
                    break;
                case 401:
                    userMessage = 'Invalid credentials or session expired';
                    break;
                case 404:
                    userMessage = 'Recipient not found';
                    break;
                case 429:
                    userMessage = 'Too many requests. Please try again later';
                    break;
            }

            return {
                success: false,
                error: userMessage,

            };
        }
        return {
            success: false,
            error: 'An unexpected error occurred',

        };
    }
};


// ADMIN
export const getMessageHistory = async (username: string): Promise<MessageHistoryResponse> => {
    try {
        const { data } = await api.get<MessageHistoryResponse>(`/messages/history/${username}`);
        return data;
    } catch (error) {
        if (error instanceof AxiosError) {
            return {
                success: false,
                error: error.response?.data?.error || 'Failed to fetch messages'
            };
        }
        return {
            success: false,
            error: 'An unexpected error occurred'
        };
    }
};