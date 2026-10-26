import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '../../services/api';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/students/dashboard');
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Dynamically compute practical evaluation scores from authentic assignments
  const gradedAssignments = (data?.assignments || [])
    .filter((a: any) => a.score !== undefined && a.score !== null)
    .map((a: any) => ({
      name: a.title?.length > 18 ? a.title.slice(0, 18) + '...' : a.title,
      score: a.score,
      max: a.totalPoints || 20,
    }));

  const evaluationScoresData = gradedAssignments;

  const currentRate = data?.kpis?.attendanceRate ?? 0;
  const attendanceTrendData = currentRate > 0
    ? [
        { week: 'Cohort Inception', rate: currentRate },
        { week: 'Current Week', rate: currentRate },
      ]
    : [];

  const avgScore = evaluationScoresData.length > 0
    ? (evaluationScoresData.reduce((acc: number, item: any) => acc + item.score, 0) / evaluationScoresData.length).toFixed(1)
    : '0.0';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
            progress_activity
          </span>
          <span className="font-body-md text-on-surface-variant font-medium">
            Generating performance analytics...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      <div>
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
          Performance Analytics &amp; Learning Velocity
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Empirical attendance trendlines, evaluation scores, and syllabus progression
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trends Chart */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-[16px] text-on-surface font-bold">
              Cohort Attendance Trajectory (%)
            </h3>
            <span className="text-[12px] font-bold text-primary">
              Current: {currentRate}%
            </span>
          </div>

          <div className="w-full h-64">
            {attendanceTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" stroke="#737686" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#737686" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '0.75rem',
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#attendanceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-outline text-[36px] mb-2">trending_up</span>
                <p className="font-body-md font-medium">No attendance trend recorded yet.</p>
                <p className="text-body-sm text-outline mt-0.5">Weekly attendance rates will chart as classes are conducted.</p>
              </div>
            )}
          </div>
        </div>

        {/* Practical Evaluation Scores BarChart */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-[16px] text-on-surface font-bold">
              Practical Lab &amp; Quiz Marks (Score / 20)
            </h3>
            <span className="text-[12px] font-bold text-emerald-700">
              Avg: {avgScore} pts
            </span>
          </div>

          <div className="w-full h-64">
            {evaluationScoresData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evaluationScoresData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#737686" fontSize={11} />
                  <YAxis domain={[0, 20]} stroke="#737686" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '0.75rem',
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Bar dataKey="score" fill="#4e45d5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-outline text-[36px] mb-2">bar_chart</span>
                <p className="font-body-md font-medium">No graded evaluations yet.</p>
                <p className="text-body-sm text-outline mt-0.5">Assigned lab and quiz scores will populate here upon mentor evaluation.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
