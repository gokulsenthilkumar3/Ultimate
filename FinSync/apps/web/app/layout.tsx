import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'FinSync Super – Your Personal CFO in Your Pocket',
    description: 'AI-powered expense tracking, investment monitoring, and budget planning – all synced seamlessly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
