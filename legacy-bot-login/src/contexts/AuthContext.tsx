import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi, User } from '@/services/api';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Restore session from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('legacy_token');
        const savedUser = localStorage.getItem('legacy_user');

        if (savedToken && savedUser) {
            try {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('legacy_token');
                localStorage.removeItem('legacy_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        try {
            const response = await authApi.login(email, password);
            const { token: newToken, user: newUser } = response.data.data;

            setToken(newToken);
            setUser(newUser);

            localStorage.setItem('legacy_token', newToken);
            localStorage.setItem('legacy_user', JSON.stringify(newUser));

            return { success: true };
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            return {
                success: false,
                error: error?.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.',
            };
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('legacy_token');
        localStorage.removeItem('legacy_user');
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isLoading,
            isAuthenticated: !!user && !!token,
            login,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
