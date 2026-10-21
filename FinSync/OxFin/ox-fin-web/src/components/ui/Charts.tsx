'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from 'recharts';

const COLORS = ['#818CF8', '#34D399', '#FBBF24', '#94A3B8']; // Adjusted for dark theme
const EmptyChart = () => <div className="h-[300px] flex items-center justify-center text-sm text-white/35">Not enough activity to show this chart yet.</div>;

// Tooltip style common
const tooltipStyle = {
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
    color: '#fff',
    backdropFilter: 'blur(10px)'
};

// Area Chart - Clean
export const PortfolioChart = ({ data = [] }: { data?: { name: string; value: number }[] }) => data.length ? (
    <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
            <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                </linearGradient>
            </defs>
            <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={{ color: '#fff' }}
            />
            <Area
                type="monotone"
                dataKey="value"
                stroke="#818CF8"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorValue)"
            />
        </AreaChart>
    </ResponsiveContainer>
) : <EmptyChart />;

// Pie Chart - Minimal Donut
export const SpendingPieChart = ({ data = [] }: { data?: { name: string; value: number }[] }) => data.length ? (
    <ResponsiveContainer width="100%" height={300}>
        <PieChart>
            <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                paddingAngle={5}
                dataKey="value"
                cornerRadius={8}
                stroke="rgba(0,0,0,0)" // Remove border
            >
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
            </Pie>
            <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={{ color: '#fff' }}
            />
        </PieChart>
    </ResponsiveContainer>
) : <EmptyChart />;

// Bar Chart - Rounded & Clean
export const TransactionTrendChart = ({ data = [] }: { data?: { name: string; income: number; expense: number }[] }) => data.length ? (
    <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barSize={32}>
            <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={tooltipStyle}
                itemStyle={{ color: '#fff' }}
            />
            <Bar dataKey="income" fill="#34D399" radius={[6, 6, 6, 6]} />
            <Bar dataKey="expense" fill="#F87171" radius={[6, 6, 6, 6]} opacity={0.8} />
        </BarChart>
    </ResponsiveContainer>
) : <EmptyChart />;
