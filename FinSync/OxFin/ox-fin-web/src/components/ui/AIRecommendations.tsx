'use client';

import { TrendingUp, BookOpen, Shield, Plane, Heart, GraduationCap, ArrowRight } from 'lucide-react';

interface Recommendation {
    id: string;
    title: string;
    description: string;
    category: 'insurance' | 'investment' | 'education' | 'savings';
    icon: any;
    action: string;
    relevance: string;
}

export default function AIRecommendations() {
    // Mock recommendations based on spending patterns
    const recommendations: Recommendation[] = [
        {
            id: '1',
            title: 'Travel Insurance',
            description: 'You spent $1,240 on travel last month. Protect your trips with comprehensive coverage starting at $12/month.',
            category: 'insurance',
            icon: Plane,
            action: 'Get Quote',
            relevance: 'Based on your travel spending',
        },
        {
            id: '2',
            title: 'High-Yield Savings',
            description: 'Your balance is $28,450. Consider moving funds to a high-yield account earning 4.5% APY.',
            category: 'savings',
            icon: TrendingUp,
            action: 'Learn More',
            relevance: 'High balance detected',
        },
        {
            id: '3',
            title: 'Index Funds',
            description: 'Diversify your portfolio with low-cost index funds. Start investing with as little as $100.',
            category: 'investment',
            icon: TrendingUp,
            action: 'Explore Funds',
            relevance: 'Investment opportunity',
        },
        {
            id: '4',
            title: 'Financial Literacy Course',
            description: 'Learn advanced investment strategies and tax optimization. Free course from OxFin Varsity.',
            category: 'education',
            icon: GraduationCap,
            action: 'Start Learning',
            relevance: 'Recommended for you',
        },
    ];

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'insurance': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'investment': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'education': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'savings': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            default: return 'bg-white/10 text-white/80 border-white/20';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-white">For You</h3>
                    <p className="text-sm text-white/50 mt-1">Personalized recommendations based on your financial activity</p>
                </div>
            </div>

            {/* Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recommendations.map((rec) => {
                    const Icon = rec.icon;
                    return (
                        <div key={rec.id} className="card-swiss p-6 hover:border-white/20 transition-all duration-300 group cursor-pointer bg-white/5">
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${getCategoryColor(rec.category)}`}>
                                    <Icon size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-semibold text-white group-hover:text-white/80 transition-colors">
                                            {rec.title}
                                        </h4>
                                    </div>
                                    <p className="text-sm text-white/60 mb-3 leading-relaxed">{rec.description}</p>
                                    <div className="flex items-center justify-between mt-auto">
                                        <span className="text-xs text-white/40 italic">{rec.relevance}</span>
                                        <button className="flex items-center gap-1 text-sm font-medium text-white hover:text-white/70 hover:gap-2 transition-all">
                                            {rec.action}
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Financial Literacy Section */}
            <div className="card-swiss p-6 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/20">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={24} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-white mb-2">OxFin Varsity</h4>
                        <p className="text-sm text-white/60 mb-4 leading-relaxed">
                            Access free financial education courses covering budgeting, investing, tax planning, and more.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {['Budgeting 101', 'Stock Market Basics', 'Tax Optimization', 'Retirement Planning'].map((course) => (
                                <span key={course} className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-medium hover:bg-purple-500/20 transition-colors cursor-pointer">
                                    {course}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
