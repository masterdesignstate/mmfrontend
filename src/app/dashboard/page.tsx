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
  { name: 'Total Users', value: 1247, color: '#672DB7' },
  { name: 'Active Today', value: 892, color: '#10B981' },
  { name: 'New Today', value: 23, color: '#F59E0B' },
];

const COLORS = ['#672DB7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function DashboardOverview() {
  const [stats, setStats] = useState(mockStats);
  const [loading, setLoading] = useState(true);

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
            <div className="p-3 rounded-full bg-green-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-user-plus" style={{color: '#059669', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Users Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.newUsersToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-heart" style={{color: '#2563eb', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Matches Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.newMatchesToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-chart-line" style={{color: '#d97706', fontSize: '1.25rem'}}></i>
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
            <div className="p-3 rounded-full bg-purple-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-calendar-week" style={{color: '#672DB7', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Weekly Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.weeklyActiveUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-user-plus" style={{color: '#059669', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Users This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.newUsersThisWeek}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-calendar-alt" style={{color: '#2563eb', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Users This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.newUsersThisMonth}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-calendar" style={{color: '#7c3aed', fontSize: '1.25rem'}}></i>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <i className="fas fa-chart-bar mr-2"></i>
            Weekly Activity
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="users" fill="#672DB7" name="Users" />
              <Bar dataKey="matches" fill="#10B981" name="Matches" />
              <Bar dataKey="likes" fill="#F59E0B" name="Likes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Growth Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <i className="fas fa-chart-line mr-2"></i>
            Monthly Growth
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#672DB7" strokeWidth={2} name="Users" />
              <Line type="monotone" dataKey="matches" stroke="#10B981" strokeWidth={2} name="Matches" />
              <Line type="monotone" dataKey="likes" stroke="#F59E0B" strokeWidth={2} name="Likes" />
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
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
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
      </div>
    </div>
  );
} 