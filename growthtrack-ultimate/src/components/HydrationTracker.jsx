import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie 
} from 'recharts';
import { Droplets, Plus, Minus, Target, Calendar, Award } from 'lucide-react';
import { useUserStore } from '../store/userStore';

export default function HydrationTracker() {
  const { metrics, updateMetrics } = useUserStore();
  const { hydration } = metrics;
  const { current, goal, logs } = hydration;

  const percentage = Math.min((current / goal) * 100, 100);
  
  const addWater = (amount) => {
    updateMetrics('hydration', { 
      ...hydration, 
      current: Math.max(0, current + amount) 
    });
  };

  const weeklyData = logs.slice(-7).map(log => ({
    name: new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' }),
    amount: log.amount,
    goal: log.goal
  }));

  const pieData = [
    { name: 'Completed', value: current },
    { name: 'Remaining', value: Math.max(0, goal - current) }
  ];

  const COLORS = ['#3b82f6', '#e2e8f0'];

  return (
    <div className=\"dashboard-container\">
      <header className=\"dashboard-header\">
        <h1 className=\"dashboard-title\">
          <Droplets className=\"inline-block mr-2 text-blue-500\" />
          Hydration Tracker
        </h1>
        <p className=\"dashboard-subtitle\">Monitor your daily water intake and stay healthy</p>
      </header>

      <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6\">
        {/* Visual Water Bottle Card */}
        <div className=\"card lg:col-span-1 flex flex-col items-center justify-center p-8\">
          <div className=\"relative w-32 h-64 border-4 border-blue-200 rounded-b-3xl rounded-t-lg overflow-hidden bg-white shadow-inner mb-6\">
            <div 
              className=\"absolute bottom-0 left-0 w-full bg-blue-500 transition-all duration-1000 ease-in-out\"
              style={{ height: `${percentage}%` }}
            >
              <div className=\"water-wave\"></div>
            </div>
            <div className=\"absolute inset-0 flex items-center justify-center font-bold text-2xl z-10 mix-blend-difference text-white\">
              {Math.round(percentage)}%
            </div>
          </div>
          
          <div className=\"text-center\">
            <p className=\"text-3xl font-bold text-gray-800\">{current} <span className=\"text-sm font-normal text-gray-500\">ml</span></p>
            <p className=\"text-sm text-gray-500\">Goal: {goal} ml</p>
          </div>
        </div>

        {/* Quick Add and Stats */}
        <div className=\"lg:col-span-2 space-y-6\">
          <div className=\"card\">
            <h3 className=\"card-title flex items-center mb-4\">
              <Plus className=\"mr-2\" size={18} /> Quick Add
            </h3>
            <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4\">
              {[250, 500, 750, 1000].map(amount => (
                <button 
                  key={amount}
                  onClick={() => addWater(amount)}
                  className=\"p-4 rounded-xl border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 transition-all group\"
                >
                  <p className=\"text-lg font-bold group-hover:text-blue-600\">+{amount}</p>
                  <p className=\"text-xs text-gray-500\">ml</p>
                </button>
              ))}
            </div>
            <div className=\"mt-6 flex items-center justify-between p-4 bg-gray-50 rounded-xl\">
              <button 
                onClick={() => addWater(-100)}
                className=\"p-2 hover:bg-gray-200 rounded-full transition-colors\"
              >
                <Minus size={20} />
              </button>
              <span className=\"font-medium text-gray-600\">Adjust manually (-100ml)</span>
              <button 
                onClick={() => addWater(100)}
                className=\"p-2 hover:bg-gray-200 rounded-full transition-colors\"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
            <div className=\"card\">
              <h3 className=\"card-title text-sm flex items-center mb-4\">
                <Target className=\"mr-2 text-orange-500\" size={16} /> Progress Summary
              </h3>
              <div className=\"h-40\">
                <ResponsiveContainer width=\"100%\" height=\"100%\">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey=\"value\"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className=\"card flex flex-col justify-center items-center text-center\">
              <Award className=\"text-yellow-500 mb-2\" size={40} />
              <p className=\"text-sm text-gray-500 uppercase tracking-wider\">Hydration Streak</p>
              <p className=\"text-4xl font-black text-gray-800\">5 Days</p>
              <p className=\"text-xs text-green-500 font-bold mt-2\">Personal Record: 12 days</p>
            </div>
          </div>
        </div>
      </div>

      <div className=\"card mb-6\">
        <h3 className=\"card-title flex items-center mb-6\">
          <Calendar className=\"mr-2 text-blue-500\" size={18} /> Weekly Consumption
        </h3>
        <div className=\"h-64\">
          <ResponsiveContainer width=\"100%\" height=\"100%\">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray=\"3 3\" vertical={false} stroke=\"#f3f4f6\" />
              <XAxis dataKey=\"name\" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f3f4f6' }}
              />
              <Bar dataKey=\"amount\" fill=\"#3b82f6\" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .water-wave {
          position: absolute;
          top: -20px;
          left: 0;
          width: 200%;
          height: 100%;
          background: rgba(59, 130, 246, 0.5);
          border-radius: 40%;
          animation: wave 10s infinite linear;
        }
        @keyframes wave {
          from { transform: translateX(0) rotate(0deg); }
          to { transform: translateX(-50%) rotate(360deg); }
        }
      `}} />
    </div>
  );
}
