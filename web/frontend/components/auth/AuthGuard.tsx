'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthGuardProps {
    children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/register'];

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (publicRoutes.includes(pathname)) {
            // Allow access to public routes
            setIsAuthenticated(true);
            return;
        }

        if (!token) {
            // Redirect to login if no token
            router.push('/login');
            return;
        }

        // Verify token is still valid
        verifyToken(token);
    }, [pathname]);

    const verifyToken = async (token: string) => {
        try {
            const response = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                setIsAuthenticated(true);
            } else {
                // Token invalid, clear and redirect
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/login');
            }
        } catch (error) {
            // Network error, assume authenticated if token exists
            setIsAuthenticated(true);
        }
    };

    // Show loading while checking auth
    if (isAuthenticated === null && !publicRoutes.includes(pathname)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted text-sm">验证中...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}


/**
 * Hook to get current user from localStorage
 */
export function useCurrentUser() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                setUser(JSON.parse(userStr));
            } catch {
                setUser(null);
            }
        }
    }, []);

    return user;
}


/**
 * Hook to get auth token
 */
export function useAuthToken() {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        setToken(localStorage.getItem('token'));
    }, []);

    return token;
}


/**
 * Fetch wrapper that adds auth header
 */
export async function authFetch(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');

    const headers = new Headers(options.headers);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
}
