'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Mock data - replace with actual API calls
const mockStats = {
  totalUsers: 1247,
  newUsersToday: 23,
  newMatchesToday: 45,
  dailyActiveUsers: 892,
  weeklyActiveUsers: 1156,
  newUsersThisWeek: 156,
  newUsersThisMonth: 423,
  newUsersThisYear: 1247,
  totalMatches: 2341,
  totalLikes: 5678,
  totalApproves: 3456,
};

const weeklyData = [
  { name: 'Mon', users: 120, matches: 45, likes: 89 },
  { name: 'Tue', users: 135, matches: 52, likes: 94 },
  { name: 'Wed', users: 142, matches: 48, likes: 87 },
  { name: 'Thu', users: 128, matches: 61, likes: 102 },
  { name: 'Fri', users: 156, matches: 67, likes: 115 },
  { name: 'Sat', users: 178, matches: 73, likes: 128 },
  { name: 'Sun', users: 165, matches: 58, likes: 96 },
];

const monthlyData = [
  { name: 'Jan', users: 423, matches: 156, likes: 234 },
  { name: 'Feb', users: 456, matches: 178, likes: 267 },
  { name: 'Mar', users: 489, matches: 192, likes: 289 },
  { name: 'Apr', users: 512, matches: 201, likes: 312 },
  { name: 'May', users: 534, matches: 215, likes: 334 },
  { name: 'Jun', users: 567, matches: 228, likes: 356 },
];

const pieData = [
  { name: 'Total Users', value: 1247, color: 'rgb(0,136,255)' },
  { name: 'Active Today', value: 892, color: '#10B981' },
  { name: 'New Today', value: 23, color: 'rgb(255,45,85)' },
];

const COLORS = ['#672DB7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// Color scheme for different periods
const periodColors = {
  today: {
    bg: 'bg-red-100',
    icon: 'text-red-600',
    iconColor: '#dc2626'
  },
  weekly: {
    bg: 'bg-blue-100',
    icon: 'text-blue-600',
    iconColor: '#2563eb'
  },
  monthly: {
    bg: 'bg-green-100',
    icon: 'text-green-600',
    iconColor: '#059669'
  },
  yearly: {
    bg: 'bg-purple-100',
    icon: 'text-purple-600',
    iconColor: '#7c3aed'
  }
};

export default function DashboardOverview() {
  const [stats, setStats] = useState(mockStats);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState('current');
  const [selectedMonth, setSelectedMonth] = useState('current');

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

      {/* Stats Cards */}
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
            <div className={`p-3 rounded-full ${periodColors.today.bg} flex items-center justify-center w-12 h-12`}>
              <i className="fas fa-user-plus" style={{color: periodColors.today.iconColor, fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Users Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.newUsersToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${periodColors.today.bg} flex items-center justify-center w-12 h-12`}>
              <i className="fas fa-heart" style={{color: periodColors.today.iconColor, fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Matches Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.newMatchesToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${periodColors.today.bg} flex items-center justify-center w-12 h-12`}>
              <i className="fas fa-chart-line" style={{color: periodColors.today.iconColor, fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Daily Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.dailyActiveUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${periodColors.weekly.bg} flex items-center justify-center w-12 h-12`}>
              <i className="fas fa-calendar-week" style={{color: periodColors.weekly.iconColor, fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Weekly Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.weeklyActiveUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${periodColors.weekly.bg} flex items-center justify-center w-12 h-12`}>
              <i className="fas fa-user-plus" style={{color: periodColors.weekly.iconColor, fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Users This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.newUsersThisWeek}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${periodColors.monthly.bg} flex items-center justify-center w-12 h-12`}>
              <i className="fas fa-calendar-alt" style={{color: periodColors.monthly.iconColor, fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Users This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.newUsersThisMonth}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${periodColors.yearly.bg} flex items-center justify-center w-12 h-12`}>
              <i className="fas fa-calendar" style={{color: periodColors.yearly.iconColor, fontSize: '1.25rem'}}></i>
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
              <i className="fas fa-chart-bar mr-2"></i>
              Weekly Activity
            </h3>
            <div className="flex gap-2">
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7]"
              >
                <option value="current">Current Week</option>
                <option value="previous">Previous Week</option>
                <option value="two-weeks-ago">Two Weeks Ago</option>
                <option value="three-weeks-ago">Three Weeks Ago</option>
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="users" fill="rgb(0,136,255)" name="Users" />
              <Bar dataKey="matches" fill="#10B981" name="Matches" />
              <Bar dataKey="likes" fill="rgb(255,45,85)" name="Likes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Growth Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              <i className="fas fa-chart-line mr-2"></i>
              Monthly Growth
            </h3>
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7]"
              >
                <option value="current">Current Month</option>
                <option value="previous">Previous Month</option>
                <option value="two-months-ago">Two Months Ago</option>
                <option value="three-months-ago">Three Months Ago</option>
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="rgb(0,136,255)" strokeWidth={2} name="Users" />
              <Line type="monotone" dataKey="matches" stroke="#10B981" strokeWidth={2} name="Matches" />
              <Line type="monotone" dataKey="likes" stroke="rgb(255,45,85)" strokeWidth={2} name="Likes" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <i className="fas fa-list-alt mr-2"></i>
            User Activity Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                <i className="fas fa-heart mr-2 text-red-500"></i>
                Total Matches
              </span>
              <span className="font-semibold">{stats.totalMatches.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                <i className="fas fa-thumbs-up mr-2 text-blue-500"></i>
                Total Likes Given
              </span>
              <span className="font-semibold">{stats.totalLikes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                <i className="fas fa-check-circle mr-2 text-green-500"></i>
                Total Approves
              </span>
              <span className="font-semibold">{stats.totalApproves.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <i className="fas fa-chart-pie mr-2"></i>
            User Distribution
          </h3>
          <div className="flex items-center">
            <div className="w-1/2">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 pl-4">
              <div className="space-y-3">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3" 
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                      <div className="text-xs text-gray-500">
                        {((entry.value / pieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 