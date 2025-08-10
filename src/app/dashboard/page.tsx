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

const weeklyData = [
  { name: 'Mon', users: 120, approves: 45, likes: 89, matches: 67 },
  { name: 'Tue', users: 135, approves: 52, likes: 94, matches: 73 },
  { name: 'Wed', users: 142, approves: 48, likes: 87, matches: 69 },
  { name: 'Thu', users: 128, approves: 61, likes: 102, matches: 78 },
  { name: 'Fri', users: 156, approves: 67, likes: 115, matches: 85 },
  { name: 'Sat', users: 178, approves: 73, likes: 128, matches: 92 },
  { name: 'Sun', users: 165, approves: 58, likes: 96, matches: 74 },
];

const monthlyData = [
  { name: 'Jan', users: 423, approves: 156, likes: 234, matches: 189 },
  { name: 'Feb', users: 456, approves: 178, likes: 267, matches: 203 },
  { name: 'Mar', users: 489, approves: 192, likes: 289, matches: 217 },
  { name: 'Apr', users: 512, approves: 201, likes: 312, matches: 231 },
  { name: 'May', users: 534, approves: 215, likes: 334, matches: 245 },
  { name: 'Jun', users: 567, approves: 228, likes: 356, matches: 259 },
];



const COLORS = ['#672DB7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];



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
            <div className="p-3 rounded-full bg-indigo-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-calendar-week" style={{color: '#4f46e5', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Weekly Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.weeklyActiveUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-teal-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-chart-line" style={{color: '#14b8a6', fontSize: '1.25rem'}}></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Daily Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.dailyActiveUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-pink-100 flex items-center justify-center w-12 h-12">
              <i className="fas fa-calendar-alt" style={{color: '#ec4899', fontSize: '1.25rem'}}></i>
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
      </div>


    </div>
  );
} 