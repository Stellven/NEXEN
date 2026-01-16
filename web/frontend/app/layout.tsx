import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'NEXEN - AI Research Assistant',
    description: 'Multi-Agent AI Research Assistant System',
    icons: {
        icon: '/favicon.ico',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className="min-h-screen bg-dark-bg text-dark-text antialiased">
                <div className="flex min-h-screen flex-col">
                    {children}
                </div>
            </body>
        </html>
    );
}
