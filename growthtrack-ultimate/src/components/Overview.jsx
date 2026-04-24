import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  Zap, Target, Flame, Droplets, Moon, 
  TrendingUp, Calendar, CheckCircle2, Clock,
  ChevronRight, AlertCircle, Plus
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useComputedMetrics } from '../hooks/useComputedMetrics';

export default function Overview() {
  const { metrics, tasks } = useUserStore();
  const computed = useComputedMetrics();

  const todayTasks = tasks.filter(t => !t.completed);
  const completedToday = tasks.filter(t => t.completed).length;

  const summaryCards = [
    { label: 'Activity', value: `${metrics.training.weeklyVolume} kg`, sub: 'Weekly Volume', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Hydration', value: `${metrics.hydration.current} ml`, sub: `Goal: ${metrics.hydration.goal}ml`, icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Sleep', value: `${metrics.lifestyle.sleepHours}h`, sub: 'Last Night', icon: Moon, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Health Score', value: computed.healthScore, sub: 'Out of 100', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  ];

  return (
    <div className=\"dashboard-container\">
      <header className=\"dashboard-header flex flex-col md:flex-row md:items-center justify-between gap-4\">
        <div>
          <h1 className=\"dashboard-title\">Welcome back, User!</h1>
          <p className=\"dashboard-subtitle\">Here's what's happening with your growth today.</p>
        </div>
        <div className=\"flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100\">
          <div className=\"flex -space-x-2\">
            {[1, 2, 3].map(i => (
              <div key={i} className=\"w-8 h-8 rounded-full border-2 border-white bg-gray-200\" />
            ))}
          </div>
          <span className=\"text-sm font-medium text-gray-600\">12 friends active</span>
          <button className=\"p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors\">
            <Plus size={18} />
          </button>
        </div>
      </header>

      {/* Summary Grid */}
      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8\">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className=\"card group hover:shadow-xl transition-all duration-300 border-b-4 border-transparent hover:border-blue-500\">
              <div className=\"flex items-start justify-between mb-4\">
                <div className={`p-3 rounded-2xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                  <Icon size={24} />
                </div>
                <span className=\"text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-lg\">+12%</span>
              </div>
              <h3 className=\"text-gray-500 text-sm font-medium mb-1\">{card.label}</h3>
              <p className=\"text-2xl font-black text-gray-900\">{card.value}</p>
              <p className=\"text-xs text-gray-400 mt-1\">{card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-8\">
        {/* Main Chart Section */}
        <div className=\"lg:col-span-2 space-y-8\">
          <div className=\"card\">
            <div className=\"flex items-center justify-between mb-6\">
              <div>
                <h2 className=\"card-title\">Performance Trend</h2>
                <p className=\"text-sm text-gray-400\">Recovery vs Stress levels</p>
              </div>
              <select className=\"bg-gray-50 border-none rounded-lg text-sm font-medium px-3 py-2 outline-none\">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <div className=\"h-72\">
              <ResponsiveContainer width=\"100%\" height=\"100%\">
                <AreaChart data={metrics.hydration.logs.slice(-7)}>
                  <defs>
                    <linearGradient id=\"colorHyd\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">
                      <stop offset=\"5%\" stopColor=\"#3b82f6\" stopOpacity={0.1}/>
                      <stop offset=\"95%\" stopColor=\"#3b82f6\" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray=\"3 3\" vertical={false} stroke=\"#f3f4f6\" />
                  <XAxis dataKey=\"date\" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type=\"monotone\" dataKey=\"amount\" stroke=\"#3b82f6\" strokeWidth={3} fillOpacity={1} fill=\"url(#colorHyd)\" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
            <div className=\"card bg-gray-900 text-white border-none overflow-hidden relative\">
              <div className=\"relative z-10\">
                <p className=\"text-blue-400 text-xs font-bold uppercase tracking-widest mb-2\">Next Milestone</p>
                <h3 className=\"text-xl font-bold mb-4\">10k Steps Daily Streak</h3>
                <div className=\"flex items-center gap-2 mb-6\">
                  <div className=\"flex-1 h-2 bg-gray-800 rounded-full overflow-hidden\">
                    <div className=\"w-2/3 h-full bg-blue-500 rounded-full\" />
                  </div>
                  <span className=\"text-xs font-bold\">4/7 Days</span>
                </div>
                <button className=\"flex items-center text-sm font-bold text-white hover:text-blue-400 transition-colors\">
                  View Details <ChevronRight size={16} className=\"ml-1\" />
                </button>
              </div>
              <Zap className=\"absolute -right-4 -bottom-4 text-gray-800 opacity-20\" size={120} />
            </div>
            <div className=\"card border-dashed border-2 border-gray-200 bg-transparent flex flex-col items-center justify-center text-center p-6\">
              <div className=\"w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4\">
                <Plus size={24} className=\"text-gray-400\" />
              </div>
              <h3 className=\"font-bold text-gray-900\">Add New Widget</h3>
              <p className=\"text-xs text-gray-500 mt-1\">Customise your dashboard with more tracking modules.</p>
            </div>
          </div>
        </div>

        {/* Sidebar Section */}
        <div className=\"space-y-8\">
          {/* Today's Tasks */}
          <div className=\"card\">
            <div className=\"flex items-center justify-between mb-6\">
              <h2 className=\"card-title\">Today's Plan</h2>
              <span className=\"text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg\">{completedToday}/{tasks.length}</span>
            </div>
            <div className=\"space-y-4\">
              {todayTasks.slice(0, 4).map(task => (
                <div key={task.id} className=\"flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group\">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors
                    ${task.priority === 'high' ? 'border-red-200 bg-red-50' : 'border-gray-200'}
                  `}>
                    <div className=\"w-2 h-2 rounded-sm bg-transparent group-hover:bg-blue-400 transition-colors\" />
                  </div>
                  <div className=\"flex-1 min-w-0\">
                    <p className=\"text-sm font-semibold text-gray-800 truncate\">{task.text}</p>
                    <div className=\"flex items-center gap-2 mt-1\">
                      <Clock size={12} className=\"text-gray-400\" />
                      <span className=\"text-[10px] text-gray-400 font-medium\">{task.time || 'All day'}</span>
                    </div>
                  </div>
                </div>
              ))}
              {todayTasks.length === 0 && (
                <div className=\"text-center py-8\">
                  <CheckCircle2 size={40} className=\"text-green-200 mx-auto mb-3\" />
                  <p className=\"text-sm text-gray-500\">All caught up!</p>
                </div>
              )}
            </div>
            <button className=\"w-full mt-6 py-3 text-sm font-bold text-gray-500 hover:text-blue-600 border-t border-gray-50 transition-colors\">
              View All Tasks
            </button>
          </div>

          {/* Activity/Notifications */}
          <div className=\"card\">
            <h2 className=\"card-title mb-6\">Recent Activity</h2>
            <div className=\"space-y-6\">
              <div className=\"flex gap-4\">
                <div className=\"w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0\" />
                <div>
                  <p className=\"text-sm text-gray-800 font-medium\">Workout completed: <span className=\"text-blue-600\">Push Day</span></p>
                  <p className=\"text-xs text-gray-400 mt-1\">2 hours ago</p>
                </div>
              </div>
              <div className=\"flex gap-4\">
                <div className=\"w-2 h-2 rounded-full bg-orange-500 mt-2 shrink-0\" />
                <div>
                  <p className=\"text-sm text-gray-800 font-medium\">New personal record in <span className=\"text-orange-600\">Bench Press</span></p>
                  <p className=\"text-xs text-gray-400 mt-1\">5 hours ago</p>
                </div>
              </div>
              <div className=\"flex gap-4\">
                <div className=\"w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0\" />
                <div>
                  <p className=\"text-sm text-gray-800 font-medium\">Goal reached: <span className=\"text-purple-600\">8h Sleep</span></p>
                  <p className=\"text-xs text-gray-400 mt-1\">Yesterday</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
