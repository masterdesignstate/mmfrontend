'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

// Mock data - replace with actual API calls
const mockStats = {
  totalUsers: 1247,
  dailyActiveUsers: 892,
  weeklyActiveUsers: 1156,
  monthlyActiveUsers: 1342,
  newUsersThisYear: 1247,
  totalMatches: 2341,
  totalLikes: 5678,
  totalApproves: 3456,
};

// Labels and helpers
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Keeping full month names available for future use if needed
const monthShortNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Monday=0..Sunday=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const diff = (d.getTime() - firstThursday.getTime()) / 86400000; // days
  return 1 + Math.floor(diff / 7);
}

function getISOWeekStartDate(year: number, week: number): Date {
  // ISO week 1: week containing Jan 4th. Find Monday of that week.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = (jan4.getUTCDay() + 6) % 7; // Monday=0
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday;
}

function formatWeekRangeLabel(year: number, week: number): string {
  const start = getISOWeekStartDate(year, week);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const startStr = `${monthShortNames[start.getUTCMonth()]} ${start.getUTCDate()}`;
  const endStr = `${monthShortNames[end.getUTCMonth()]} ${end.getUTCDate()}`;
  return `Week ${week} (${startStr} – ${endStr})`;
}

function createSeededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function generateWeeklyData(weekNumber: number) {
  const rand = createSeededRandom(weekNumber * 97);
  const len = 7;
  const users = Array.from({ length: len }, () => Math.round(130 + (rand() - 0.5) * 80));
  const approves = Array.from({ length: len }, () => Math.round(55 + (rand() - 0.5) * 30));
  const likes = Array.from({ length: len }, () => Math.round(100 + (rand() - 0.5) * 60));
  const matches = Array.from({ length: len }, () => Math.round(75 + (rand() - 0.5) * 40));
  return dayLabels.map((name, i) => ({ name, users: users[i], approves: approves[i], likes: likes[i], matches: matches[i] }));
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function generateMonthlyData(monthIndex: number, year: number) {
  const rand = createSeededRandom((year * 100) + monthIndex);
  const len = daysInMonth(year, monthIndex);
  const users = Array.from({ length: len }, () => Math.round(420 + (rand() - 0.5) * 220));
  const approves = Array.from({ length: len }, () => Math.round(160 + (rand() - 0.5) * 90));
  const likes = Array.from({ length: len }, () => Math.round(240 + (rand() - 0.5) * 140));
  const matches = Array.from({ length: len }, () => Math.round(190 + (rand() - 0.5) * 100));
  return Array.from({ length: len }, (_, i) => ({ name: String(i + 1), users: users[i], approves: approves[i], likes: likes[i], matches: matches[i] }));
}



export default function DashboardOverview() {
  const [stats] = useState(mockStats);
  const [loading, setLoading] = useState(true);

  // Current calendar markers
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth(); // 0-11
  const currentWeekNumber = getISOWeek(now); // 1-53

  // Selected period
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeekNumber);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIndex);

  // Data based on selected period
  const weeklyData = useMemo(() => generateWeeklyData(selectedWeek), [selectedWeek]);
  const monthlyData = useMemo(() => generateMonthlyData(selectedMonth, currentYear), [selectedMonth, currentYear]);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#672DB7]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-600 mt-2">Dashboard overview and analytics</p>
      </div>

      {/* Stats Cards - First Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-user" style={{color: '#672DB7', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-check-circle" style={{color: '#10B981', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Approves</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalApproves.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-thumbs-up" style={{color: '#2563eb', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Likes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalLikes.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-heart" style={{color: '#dc2626', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Matches</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMatches.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-calendar" style={{color: '#ea580c', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Daily Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.dailyActiveUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-calendar" style={{color: '#ea580c', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Weekly Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.weeklyActiveUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-calendar" style={{color: '#ea580c', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.monthlyActiveUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-calendar" style={{color: '#ea580c', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Users This Year</p>
              <p className="text-2xl font-bold text-gray-900">{stats.newUsersThisYear}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              <i className="fas fa-chart-line mr-2"></i>
              Weekly Activity
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedWeek((w) => Math.max(1, w - 1))}
                disabled={selectedWeek <= 1}
                className="p-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous week"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <span className="text-sm text-gray-700 min-w-[200px] text-center">
                {formatWeekRangeLabel(currentYear, selectedWeek)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedWeek((w) => Math.min(currentWeekNumber, w + 1))}
                disabled={selectedWeek >= currentWeekNumber}
                className="p-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next week"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
          
          {/* Weekly Totals */}
          <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-white rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#672DB7]">
                {weeklyData.reduce((sum, item) => sum + item.users, 0)}
              </div>
              <div className="text-sm text-gray-600">Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#10B981]">
                {weeklyData.reduce((sum, item) => sum + item.approves, 0)}
              </div>
              <div className="text-sm text-gray-600">Approves</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2563eb]">
                {weeklyData.reduce((sum, item) => sum + item.likes, 0)}
              </div>
              <div className="text-sm text-gray-600">Likes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#dc2626]">
                {weeklyData.reduce((sum, item) => sum + item.matches, 0)}
              </div>
              <div className="text-sm text-gray-600">Matches</div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#672DB7" strokeWidth={2} name="Users" />
              <Line type="monotone" dataKey="approves" stroke="#10B981" strokeWidth={2} name="Approves" />
              <Line type="monotone" dataKey="likes" stroke="#2563eb" strokeWidth={2} name="Likes" />
              <Line type="monotone" dataKey="matches" stroke="#dc2626" strokeWidth={2} name="Matches" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Growth Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                <i className="fas fa-chart-line mr-2"></i>
                Monthly Growth
              </h3>
            </div>
            <div className="mt-2 flex flex-nowrap gap-2 overflow-x-auto">
              {Array.from({ length: currentMonthIndex + 1 }, (_, m) => m).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMonth(m)}
                  className={`px-2.5 py-1 rounded-full text-sm border transition-colors ${
                    selectedMonth === m
                      ? 'bg-[#672DB7] text-white border-[#672DB7]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#672DB7]'
                  }`}
                >
                  {monthShortNames[m]}
                </button>
              ))}
            </div>
          </div>
          
          {/* Monthly Totals */}
          <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-white rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#672DB7]">
                {monthlyData.reduce((sum, item) => sum + item.users, 0)}
              </div>
              <div className="text-sm text-gray-600">Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#10B981]">
                {monthlyData.reduce((sum, item) => sum + item.approves, 0)}
              </div>
              <div className="text-sm text-gray-600">Approves</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2563eb]">
                {monthlyData.reduce((sum, item) => sum + item.likes, 0)}
              </div>
              <div className="text-sm text-gray-600">Likes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#dc2626]">
                {monthlyData.reduce((sum, item) => sum + item.matches, 0)}
              </div>
              <div className="text-sm text-gray-600">Matches</div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={Math.ceil(monthlyData.length / 12)} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#672DB7" strokeWidth={2} name="Users" />
              <Line type="monotone" dataKey="approves" stroke="#10B981" strokeWidth={2} name="Approves" />
              <Line type="monotone" dataKey="likes" stroke="#2563eb" strokeWidth={2} name="Likes" />
              <Line type="monotone" dataKey="matches" stroke="#dc2626" strokeWidth={2} name="Matches" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>


    </div>
  );
} 