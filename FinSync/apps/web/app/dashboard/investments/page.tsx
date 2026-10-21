'use client';

import React from 'react';
import { formatCurrency } from '@/packages/utils/validators';

interface Asset {
    name: string;
    ticker: string;
    category: 'Stocks' | 'Crypto' | 'Mutual Funds' | 'Gold';
    invested: number;
    shares: number;
    currentPrice: number;
    dayChange: number;
    icon: string;
    sparkline: string;
}

const assets: Asset[] = [
    { name: 'Nifty 50 Index Fund', ticker: 'NIFTY50', category: 'Mutual Funds', invested: 45000, shares: 15.2, currentPrice: 3200, dayChange: 0.85, icon: '📊', sparkline: 'M 0,25 Q 15,10 30,20 T 60,5 T 90,15 T 120,3' },
    { name: 'Bitcoin ETF', ticker: 'BTC', category: 'Crypto', invested: 18000, shares: 0.0035, currentPrice: 5600000, dayChange: 2.41, icon: '🪙', sparkline: 'M 0,30 Q 15,40 30,15 T 60,25 T 90,8 T 120,1' },
    { name: 'Reliance Industries', ticker: 'RELIANCE', category: 'Stocks', invested: 24000, shares: 8.5, currentPrice: 2950, dayChange: -0.45, icon: '📈', sparkline: 'M 0,5 Q 15,15 30,8 T 60,35 T 90,20 T 120,38' },
    { name: 'Sovereign Gold Bond', ticker: 'SGB', category: 'Gold', invested: 12000, shares: 2, currentPrice: 6500, dayChange: 0.12, icon: '🌟', sparkline: 'M 0,20 Q 15,18 30,22 T 60,19 T 90,21 T 120,18' }
];

export default function InvestmentsPage() {
    const totalInvested = assets.reduce((sum, a) => sum + a.invested, 0);
    const totalCurrentValue = assets.reduce((sum, a) => sum + (a.shares * a.currentPrice), 0);
    const totalPL = totalCurrentValue - totalInvested;
    const plPercentage = (totalPL / totalInvested) * 100;

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Investment Portfolio</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Track all your stock, mutual fund, and crypto asset holdings</p>
            </div>

            {/* Performance Card */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(0,212,160,0.02))', border: '1px solid rgba(108,99,255,0.2)', padding: '24px 32px', marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>Current Portfolio Value</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>
                            {formatCurrency(Math.round(totalCurrentValue))}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Returns (P&L)</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: totalPL >= 0 ? 'var(--accent-green)' : 'var(--error)' }}>
                            {totalPL >= 0 ? '+' : ''}{formatCurrency(Math.round(totalPL))} ({plPercentage.toFixed(2)}%)
                        </div>
                    </div>
                </div>
            </div>

            {/* Asset Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                {assets.map((asset) => {
                    const value = asset.shares * asset.currentPrice;
                    const assetPL = value - asset.invested;
                    const isPositive = asset.dayChange >= 0;

                    return (
                        <div key={asset.ticker} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div style={{ width: 40, height: 40, background: 'var(--bg-secondary)', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 20 }}>
                                        {asset.icon}
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{asset.name}</h4>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{asset.ticker} · {asset.category}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700 }}>{formatCurrency(Math.round(value))}</div>
                                    <div style={{ fontSize: 11, color: isPositive ? 'var(--accent-green)' : 'var(--error)', fontWeight: 600 }}>
                                        {isPositive ? '↑' : '↓'} {Math.abs(asset.dayChange)}% Today
                                    </div>
                                </div>
                            </div>

                            {/* Sparkline chart and metrics */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px' }}>
                                <div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Invested</div>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>{formatCurrency(asset.invested)}</div>
                                </div>
                                
                                {/* SVG Sparkline */}
                                <svg width="120" height="40" style={{ overflow: 'visible' }}>
                                    <path 
                                        d={asset.sparkline} 
                                        fill="none" 
                                        stroke={isPositive ? 'var(--accent-green)' : 'var(--error)'} 
                                        strokeWidth="2" 
                                        strokeLinecap="round" 
                                    />
                                </svg>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>P&L</div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: assetPL >= 0 ? 'var(--accent-green)' : 'var(--error)' }}>
                                        {assetPL >= 0 ? '+' : ''}{formatCurrency(Math.round(assetPL))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
