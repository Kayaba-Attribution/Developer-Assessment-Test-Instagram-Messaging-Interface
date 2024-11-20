// src/lib/types.ts
export interface LoginCredentials {
    username: string;
    password: string;
}

export interface MessagePayload {
    username: string; // recipient
    from_username: string;
    content: string;
}

export interface Session {
    sessionId: string;
    userId: string;
    csrfToken: string;
    rur: string;
    expiresAt: Date;
}

export interface User {
    instagram_username: string;
    session?: Session;
    messages: Message[];
    lastActivity: Date;
}

export interface Message {
    recipient: string;
    content: string;
    status: 'sent' | 'failed';
    timestamp: string;
    error?: string;
}


export interface MessageStats {
    total: number;
    byStatus: {
        [key: string]: {
            count: number;
            uniqueRecipients: number;
        };
    };
}

export interface LoginResponse {
    success: boolean;
    error?: string;
    session?: Session;
}

export interface MessageResponse {
    success: boolean;
    error?: string;
    url?: string;
    message?: string;
}

export interface SessionResponse {
    success: boolean;
    error?: string;
    message?: string;
}
