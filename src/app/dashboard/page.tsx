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
import { apiService } from '@/services/api';

// Labels and helpers
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    dailyActiveUsers: 0,
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    newUsersThisYear: 0,
    totalMatches: 0,
    totalLikes: 0,
    totalApproves: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current calendar markers
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth(); // 0-11
  const currentWeekNumber = getISOWeek(now); // 1-53

  // Selected period
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeekNumber);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIndex);

  // Data for weekly and monthly charts
  const [weeklyChartData, setWeeklyChartData] = useState<any[]>([]);
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Fetch dashboard stats (overview cards)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const dashboardStats = await apiService.getDashboardStats();
        setStats({
          totalUsers: dashboardStats.total_users,
          dailyActiveUsers: dashboardStats.daily_active_users,
          weeklyActiveUsers: dashboardStats.weekly_active_users,
          monthlyActiveUsers: dashboardStats.monthly_active_users,
          newUsersThisYear: dashboardStats.new_users_this_year,
          totalMatches: dashboardStats.total_matches,
          totalLikes: dashboardStats.total_likes,
          totalApproves: dashboardStats.total_approves,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to fetch dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Fetch weekly chart data when selectedWeek changes
  useEffect(() => {
    const fetchWeeklyData = async () => {
      try {
        setLoadingWeekly(true);

        // Calculate start and end dates for the selected week
        const weekStart = getISOWeekStartDate(currentYear, selectedWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

        const startDate = weekStart.toISOString().split('T')[0];
        const endDate = weekEnd.toISOString().split('T')[0];

        const timeseriesData = await apiService.getTimeseriesData(startDate, endDate);

        // Create a map of existing data by day of week
        const dataMap = new Map();
        timeseriesData.data.forEach((item: any) => {
          const date = new Date(item.date);
          const dayIndex = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
          dataMap.set(dayIndex, {
            name: dayLabels[dayIndex],
            users: item.new_users || 0,
            approves: item.approves || 0,
            likes: item.likes || 0,
            matches: item.matches || 0,
            date: item.date,
          });
        });

        // Fill in all 7 days with 0s if no data
        const transformedData = dayLabels.map((label, index) => {
          return dataMap.get(index) || {
            name: label,
            users: 0,
            approves: 0,
            likes: 0,
            matches: 0,
            date: null,
          };
        });

        setWeeklyChartData(transformedData);
      } catch (err) {
        console.error('Error fetching weekly data:', err);
      } finally {
        setLoadingWeekly(false);
      }
    };

    fetchWeeklyData();
  }, [selectedWeek, currentYear]);

  // Fetch monthly chart data when selectedMonth changes
  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        setLoadingMonthly(true);

        // Calculate start and end dates for the selected month
        const monthStart = new Date(currentYear, selectedMonth, 1);
        const monthEnd = new Date(currentYear, selectedMonth + 1, 0); // Last day of month

        const startDate = monthStart.toISOString().split('T')[0];
        const endDate = monthEnd.toISOString().split('T')[0];

        const timeseriesData = await apiService.getTimeseriesData(startDate, endDate);

        // Create a map of existing data by day of month
        const dataMap = new Map();
        timeseriesData.data.forEach((item: any) => {
          const date = new Date(item.date);
          const dayOfMonth = date.getDate();
          dataMap.set(dayOfMonth, {
            name: String(dayOfMonth),
            users: item.new_users || 0,
            approves: item.approves || 0,
            likes: item.likes || 0,
            matches: item.matches || 0,
            date: item.date,
          });
        });

        // Fill in all days of the month with 0s if no data
        const daysCount = daysInMonth(currentYear, selectedMonth);
        const transformedData = Array.from({ length: daysCount }, (_, i) => {
          const dayNum = i + 1;
          return dataMap.get(dayNum) || {
            name: String(dayNum),
            users: 0,
            approves: 0,
            likes: 0,
            matches: 0,
            date: null,
          };
        });

        setMonthlyChartData(transformedData);
      } catch (err) {
        console.error('Error fetching monthly data:', err);
      } finally {
        setLoadingMonthly(false);
      }
    };

    fetchMonthlyData();
  }, [selectedMonth, currentYear]);

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
                {weeklyChartData.reduce((sum, item) => sum + (item.users || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#10B981]">
                {weeklyChartData.reduce((sum, item) => sum + (item.approves || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Approves</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2563eb]">
                {weeklyChartData.reduce((sum, item) => sum + (item.likes || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Likes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#dc2626]">
                {weeklyChartData.reduce((sum, item) => sum + (item.matches || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Matches</div>
            </div>
          </div>

          {loadingWeekly ? (
            <div className="flex items-center justify-center h-[240px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#672DB7]"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={weeklyChartData}>
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
          )}
        </div>

        {/* Monthly Growth Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                <i className="fas fa-chart-line mr-2"></i>
                Monthly Growth
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMonth((m) => Math.max(0, m - 1))}
                  disabled={selectedMonth <= 0}
                  className="p-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous month"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <span className="text-sm text-gray-700 min-w-[100px] text-center font-medium">
                  {monthShortNames[selectedMonth]} {currentYear}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMonth((m) => Math.min(currentMonthIndex, m + 1))}
                  disabled={selectedMonth >= currentMonthIndex}
                  className="p-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next month"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Monthly Totals */}
          <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-white rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#672DB7]">
                {monthlyChartData.reduce((sum, item) => sum + (item.users || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#10B981]">
                {monthlyChartData.reduce((sum, item) => sum + (item.approves || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Approves</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2563eb]">
                {monthlyChartData.reduce((sum, item) => sum + (item.likes || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Likes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#dc2626]">
                {monthlyChartData.reduce((sum, item) => sum + (item.matches || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Matches</div>
            </div>
          </div>

          {loadingMonthly ? (
            <div className="flex items-center justify-center h-[240px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#672DB7]"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={Math.ceil(monthlyChartData.length / 12)} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#672DB7" strokeWidth={2} name="Users" />
                <Line type="monotone" dataKey="approves" stroke="#10B981" strokeWidth={2} name="Approves" />
                <Line type="monotone" dataKey="likes" stroke="#2563eb" strokeWidth={2} name="Likes" />
                <Line type="monotone" dataKey="matches" stroke="#dc2626" strokeWidth={2} name="Matches" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
