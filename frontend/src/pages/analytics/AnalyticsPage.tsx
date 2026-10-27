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

  // Graded practical assignments
  const gradedAssignments = (data?.assignments || [])
    .filter((a: any) => a.score !== undefined && a.score !== null)
    .map((a: any) => ({
      name: a.title?.length > 16 ? `[Lab] ${a.title.slice(0, 16)}...` : `[Lab] ${a.title}`,
      score: a.score,
      max: a.totalPoints || 20,
      type: 'LAB',
    }));

  // Completed quizzes
  const completedQuizAttempts = (data?.quizAttempts || []).map((q: any) => ({
    name: q.quizTitle?.length > 16 ? `[Quiz] ${q.quizTitle.slice(0, 16)}...` : `[Quiz] ${q.quizTitle}`,
    score: q.totalScore,
    max: q.maxPoints || 20,
    type: 'QUIZ',
  }));

  // Merged evaluation scores for the analytical bar chart
  const evaluationScoresData = [...gradedAssignments, ...completedQuizAttempts];

  const currentRate = data?.kpis?.attendanceRate ?? 0;
  const attendanceTrendData = currentRate > 0
    ? [
        { week: 'Cohort Inception', rate: currentRate },
        { week: 'Current Week', rate: currentRate },
      ]
    : [];

  const quizAttempts = data?.quizAttempts || [];
  const quizStats = data?.quizStats || {
    quizzesTaken: 0,
    quizzesPassed: 0,
    avgQuizScore: 0,
    passRate: 0,
  };

  const labAvgScore = gradedAssignments.length > 0
    ? parseFloat((gradedAssignments.reduce((acc: number, item: any) => acc + item.score, 0) / gradedAssignments.length).toFixed(1))
    : 0;

  // Combined academic score (50% assignments + 50% quizzes)
  let combinedOverallScore = 0;
  const normalizedLabPct = Math.min(100, (labAvgScore / 20) * 100);

  if (gradedAssignments.length > 0 && quizStats.quizzesTaken > 0) {
    combinedOverallScore = parseFloat(((normalizedLabPct * 0.5) + (quizStats.avgQuizScore * 0.5)).toFixed(1));
  } else if (gradedAssignments.length > 0) {
    combinedOverallScore = parseFloat(normalizedLabPct.toFixed(1));
  } else if (quizStats.quizzesTaken > 0) {
    combinedOverallScore = quizStats.avgQuizScore;
  }

  const performanceRating =
    combinedOverallScore >= 85
      ? 'Excellent'
      : combinedOverallScore >= 70
      ? 'Good'
      : combinedOverallScore >= 50
      ? 'Average'
      : 'Needs Attention';

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

      {/* KPI Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance KPI */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Attendance Rate</span>
            <span className="text-[26px] font-bold text-on-surface mt-1 tabular-nums">{currentRate}%</span>
            <span className="text-[12px] text-on-surface-variant mt-0.5">Physical session presence</span>
          </div>
          <div className="p-2.5 rounded-xl bg-primary-fixed/40 text-primary">
            <span className="material-symbols-outlined text-[24px]">how_to_reg</span>
          </div>
        </div>

        {/* Practical Labs KPI */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Lab Submissions</span>
            <span className="text-[26px] font-bold text-on-surface mt-1 tabular-nums">{gradedAssignments.length}</span>
            <span className="text-[12px] text-on-surface-variant mt-0.5">Avg: {labAvgScore} / 20 pts</span>
          </div>
          <div className="p-2.5 rounded-xl bg-secondary-container/40 text-secondary">
            <span className="material-symbols-outlined text-[24px]">terminal</span>
          </div>
        </div>

        {/* Quiz Performance KPI */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Quiz Assessments</span>
            <span className="text-[26px] font-bold text-emerald-700 mt-1 tabular-nums">{quizStats.quizzesTaken}</span>
            <span className="text-[12px] text-on-surface-variant mt-0.5">
              Avg: {quizStats.avgQuizScore}% ({quizStats.quizzesPassed} passed)
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <span className="material-symbols-outlined text-[24px]">quiz</span>
          </div>
        </div>

        {/* Combined Overall Score KPI */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Overall Score</span>
            <span className="text-[26px] font-bold text-primary mt-1 tabular-nums">{combinedOverallScore}%</span>
            <span className="text-[12px] font-semibold text-emerald-700 mt-0.5">{performanceRating}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-[24px]">grade</span>
          </div>
        </div>
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

        {/* Practical Evaluation & Quiz Scores BarChart */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-[16px] text-on-surface font-bold">
              Practical Lab &amp; Quiz Marks (Score / Max)
            </h3>
            <span className="text-[12px] font-bold text-emerald-700">
              {evaluationScoresData.length} Evaluations
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
                <p className="font-body-md font-medium">No graded evaluations or quiz scores yet.</p>
                <p className="text-body-sm text-outline mt-0.5">Assigned practical labs and quizzes will chart here upon completion.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quiz Performance Analysis Breakdown */}
      <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[24px]">fact_check</span>
            <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
              Quiz Assessments &amp; Objective Evaluation Results
            </h3>
          </div>
          <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface text-label-sm font-semibold self-start sm:self-auto">
            {quizAttempts.length} Completed
          </span>
        </div>

        {quizAttempts.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-outline text-[36px]">quiz</span>
            <span className="font-body-md font-semibold text-on-surface">No quiz assessments completed yet</span>
            <p className="font-body-sm text-outline max-w-sm">
              Head to the Quizzes &amp; Automated Assessments tab to take your scheduled course quizzes. Completed test scores will display here immediately.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-container-high/40">
            <table className="w-full text-left text-body-sm">
              <thead className="bg-surface-container-low text-[11px] font-bold text-outline uppercase tracking-wider border-b border-surface-container-high/40">
                <tr>
                  <th className="py-3 px-4">Assessment Title</th>
                  <th className="py-3 px-4 text-center">Score Awarded</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Submitted Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/30">
                {quizAttempts.map((qa: any) => (
                  <tr key={qa.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-on-surface">
                      {qa.quizTitle}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold tabular-nums">
                      {qa.totalScore} / {qa.maxPoints} pts
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-primary tabular-nums">
                      {qa.percentage}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          qa.passed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {qa.passed ? 'PASSED' : 'NEEDS REVISION'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-outline text-[12px]">
                      {new Date(qa.submittedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
