'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Wallet,
    TrendingUp,
    Receipt,
    CreditCard,
    Settings,
    Activity,
    LogOut,
    Menu,
    X,
    ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
    { name: 'Dashboard',   href: '/dashboard',    icon: LayoutDashboard },
    { name: 'Wallets',     href: '/wallets',       icon: Wallet },
    { name: 'Investments', href: '/investments',   icon: TrendingUp },
    { name: 'Cards',       href: '/cards',         icon: CreditCard },
    { name: 'Bills',       href: '/bills',         icon: Receipt,  badge: 4 },
    { name: 'Activity',    href: '/transactions',  icon: Activity },
    { name: 'Settings',    href: '/settings',      icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const initials = session?.user?.name
        ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'OX';

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white/8 border border-white/10 text-white backdrop-blur-xl transition-all hover:bg-white/12"
                aria-label="Toggle navigation"
            >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed left-0 top-0 h-screen w-64 z-40 flex flex-col',
                    'border-r border-white/[0.06]',
                    'transition-transform duration-300 ease-in-out',
                    'lg:translate-x-0',
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ background: 'rgba(5, 5, 10, 0.92)', backdropFilter: 'blur(24px)' }}
            >
                {/* Logo */}
                <div className="px-5 pt-6 pb-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white font-black text-sm">
                            OX
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-white leading-none">OxFin</h1>
                            <p className="text-[10px] text-white/35 mt-0.5 font-medium tracking-wide">GLOBAL FINANCE</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                    <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em] px-3 pb-2">
                        Menu
                    </p>
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={cn(
                                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative',
                                    isActive
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/45 hover:text-white/80 hover:bg-white/[0.05]'
                                )}
                            >
                                {/* Active indicator bar */}
                                {isActive && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-blue-400 rounded-r-full shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                                )}

                                <item.icon
                                    size={18}
                                    className={cn(
                                        'shrink-0 transition-colors',
                                        isActive ? 'text-blue-400' : 'text-white/40 group-hover:text-white/70'
                                    )}
                                />
                                <span className={cn(
                                    'text-sm font-medium flex-1',
                                    isActive ? 'text-white' : ''
                                )}>
                                    {item.name}
                                </span>

                                {/* Badge */}
                                {item.badge && (
                                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                                        {item.badge}
                                    </span>
                                )}

                                {/* Chevron on active */}
                                {isActive && (
                                    <ChevronRight size={14} className="text-white/30" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom: User + Sign Out */}
                <div className="px-3 pb-4 pt-3 border-t border-white/[0.06] space-y-2">
                    {/* User info */}
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 ring-1 ring-white/10">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate leading-none">
                                {session?.user?.name || 'User'}
                            </p>
                            <p className="text-[10px] text-white/35 truncate mt-0.5">
                                {session?.user?.email || 'Premium Account'}
                            </p>
                        </div>
                    </div>

                    {/* Sign Out */}
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/35 hover:text-red-400 hover:bg-red-500/8 transition-all duration-200 group"
                    >
                        <LogOut size={16} className="shrink-0 group-hover:text-red-400 transition-colors" />
                        <span className="text-sm font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}
        </>
    );
}
