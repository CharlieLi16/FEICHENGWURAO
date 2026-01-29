"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import MaleIcon from "@/components/icons/MaleIcon";
import FemaleIcon from "@/components/icons/FemaleIcon";
import AdminHeader from "@/components/AdminHeader";

interface RegistrationEntry {
  index: number;
  legalName: string;
  age: string;
  gender: string;
  orientation: string;
  school: string;
  grade: string;
}

interface StatsData {
  total: number;
  male: number;
  female: number;
  genderData: { name: string; value: number; color: string }[];
  ageData: { name: string; count: number }[];
  schoolData: { name: string; value: number }[];
  gradeData: { name: string; count: number }[];
  orientationData: { name: string; count: number }[];
}

const COLORS = {
  male: "#3B82F6",
  female: "#EC4899",
  chart: ["#3B82F6", "#EC4899", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#84CC16"],
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch both male and female data
      const [maleRes, femaleRes] = await Promise.all([
        fetch("/api/admin/list?gender=男"),
        fetch("/api/admin/list?gender=女"),
      ]);

      if (!maleRes.ok || !femaleRes.ok) {
        throw new Error("数据加载失败");
      }

      const maleData = await maleRes.json();
      const femaleData = await femaleRes.json();

      const maleEntries: RegistrationEntry[] = maleData.entries || [];
      const femaleEntries: RegistrationEntry[] = femaleData.entries || [];
      const allEntries = [...maleEntries, ...femaleEntries];

      // Calculate stats
      const statsData = calculateStats(maleEntries, femaleEntries, allEntries);
      setStats(statsData);
    } catch (err) {
      setError("加载数据失败，请刷新重试");
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (
    maleEntries: RegistrationEntry[],
    femaleEntries: RegistrationEntry[],
    allEntries: RegistrationEntry[]
  ): StatsData => {
    // Gender distribution
    const genderData = [
      { name: "男嘉宾", value: maleEntries.length, color: COLORS.male },
      { name: "女嘉宾", value: femaleEntries.length, color: COLORS.female },
    ];

    // Age distribution
    const ageCounts: Record<string, number> = {};
    allEntries.forEach((entry) => {
      const age = entry.age || "未知";
      ageCounts[age] = (ageCounts[age] || 0) + 1;
    });
    const ageData = Object.entries(ageCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));

    // School distribution
    const schoolCounts: Record<string, number> = {};
    allEntries.forEach((entry) => {
      const school = entry.school || "未知";
      schoolCounts[school] = (schoolCounts[school] || 0) + 1;
    });
    const schoolData = Object.entries(schoolCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Grade distribution
    const gradeCounts: Record<string, number> = {};
    allEntries.forEach((entry) => {
      const grade = entry.grade || "未知";
      gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
    });
    // Define grade order
    const gradeOrder = ["大一", "大二", "大三", "大四", "研一", "研二", "PhD", "毕业了", "工作"];
    const gradeData = Object.entries(gradeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        const aIndex = gradeOrder.indexOf(a.name);
        const bIndex = gradeOrder.indexOf(b.name);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });

    // Orientation distribution
    const orientationCounts: Record<string, number> = {};
    allEntries.forEach((entry) => {
      const orientation = entry.orientation || "未填写";
      orientationCounts[orientation] = (orientationCounts[orientation] || 0) + 1;
    });
    const orientationData = Object.entries(orientationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: allEntries.length,
      male: maleEntries.length,
      female: femaleEntries.length,
      genderData,
      ageData,
      schoolData,
      gradeData,
      orientationData,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">加载统计数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <AdminHeader />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="总报名人数"
            value={stats?.total || 0}
            icon={<span className="text-4xl">💕</span>}
            bgColor="bg-gradient-to-br from-pink-50 to-rose-50"
            textColor="text-rose-600"
          />
          <StatsCard
            title="男嘉宾"
            value={stats?.male || 0}
            icon={<MaleIcon className="w-10 h-10 text-blue-500" />}
            bgColor="bg-gradient-to-br from-blue-50 to-indigo-50"
            textColor="text-blue-600"
          />
          <StatsCard
            title="女嘉宾"
            value={stats?.female || 0}
            icon={<FemaleIcon className="w-10 h-10 text-pink-500" />}
            bgColor="bg-gradient-to-br from-pink-50 to-purple-50"
            textColor="text-pink-600"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gender Pie Chart */}
          <ChartCard title="性别比例">
            {stats && stats.genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stats.genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(1)}%`
                    }
                  >
                    {stats.genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* Age Bar Chart */}
          <ChartCard title="年龄分布">
            {stats && stats.ageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.ageData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar dataKey="count" name="人数" fill="#EC4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* School Pie Chart */}
          <ChartCard title="学校分布">
            {stats && stats.schoolData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stats.schoolData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) =>
                      (percent ?? 0) > 0.05 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ""
                    }
                  >
                    {stats.schoolData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS.chart[index % COLORS.chart.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* Grade Bar Chart */}
          <ChartCard title="年级分布">
            {stats && stats.gradeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.gradeData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar dataKey="count" name="人数" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* Orientation Bar Chart */}
          <ChartCard title="取向分布">
            {stats && stats.orientationData && stats.orientationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.orientationData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar dataKey="count" name="人数" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        </div>

        {/* Data Tables */}
        {stats && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* School Table */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">学校详情</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.schoolData.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS.chart[index % COLORS.chart.length] }}
                      />
                      <span className="text-gray-700">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{item.value}</span>
                      <span className="text-gray-500 text-sm">
                        ({((item.value / stats.total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grade Table */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">年级详情</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.gradeData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-gray-700">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{item.count}</span>
                      <span className="text-gray-500 text-sm">
                        ({((item.count / stats.total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Age Table */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">年龄详情</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.ageData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-gray-700">{item.name} 岁</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{item.count}</span>
                      <span className="text-gray-500 text-sm">
                        ({((item.count / stats.total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Orientation Table */}
            {stats.orientationData && stats.orientationData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">取向详情</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.orientationData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-gray-700">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{item.count}</span>
                      <span className="text-gray-500 text-sm">
                        ({((item.count / stats.total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          数据更新于 {new Date().toLocaleString("zh-CN")}
        </div>
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon,
  bgColor,
  textColor,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-2xl p-6 shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className={`text-4xl font-bold ${textColor}`}>{value}</p>
        </div>
        <div>{icon}</div>
      </div>
    </div>
  );
}

// Chart Card Component
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// Empty Chart Placeholder
function EmptyChart() {
  return (
    <div className="h-[280px] flex items-center justify-center text-gray-400">
      暂无数据
    </div>
  );
}
