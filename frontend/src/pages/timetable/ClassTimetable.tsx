import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const ClassTimetable: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const res = await api.get('/courses/classes');
        if (res.data.success) {
          setSessions(res.data.sessions);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTimetable();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
            progress_activity
          </span>
          <span className="font-body-md text-on-surface-variant font-medium">
            Loading class timetable &amp; lesson plan...
          </span>
        </div>
      </div>
    );
  }

  // Find tomorrow's plan / next scheduled session
  const tomorrowPlan = sessions.find((s) => s.status === 'SCHEDULED');

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
            Student Academic Schedule
          </span>
          {sessions[0]?.batch?.name && (
            <span className="text-[12px] text-outline">• {sessions[0].batch.name}</span>
          )}
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold mt-1">
          Class Timetable &amp; Tomorrow's Plan
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Weekly timetable, classroom venues, and tomorrow's upcoming lesson plan from your lead mentor
        </p>
      </div>

      {/* Tomorrow's Plan Spotlight Banner for Students */}
      {tomorrowPlan && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-primary/15 via-primary-fixed/25 to-surface-container-low border border-primary/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-primary text-on-primary shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[28px]">calendar_today</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-[11px] font-bold tracking-wide">
                  TOMORROW'S CLASS PLAN
                </span>
                <span className="text-[12px] font-mono text-outline font-semibold">
                  {new Date(tomorrowPlan.sessionDate).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <h3 className="font-headline-sm text-[20px] text-on-surface font-bold">
                {tomorrowPlan.topicTitle}
              </h3>
              <p className="text-body-sm text-on-surface-variant max-w-2xl leading-relaxed">
                {tomorrowPlan.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-[13px] text-on-surface-variant font-medium">
                <span className="flex items-center gap-1.5 text-primary font-bold">
                  <span className="material-symbols-outlined text-[16px]">menu_book</span>
                  <span>{tomorrowPlan.moduleLabel}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  <span>{tomorrowPlan.startTime} - {tomorrowPlan.endTime}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-secondary font-bold">
                  <span className="material-symbols-outlined text-[16px]">meeting_room</span>
                  <span>
                    {tomorrowPlan.roomNumber 
                      ? `${tomorrowPlan.roomNumber}${tomorrowPlan.classroom ? ` (${tomorrowPlan.classroom})` : ''}` 
                      : (tomorrowPlan.classroom || 'Classroom TBA')}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 self-end md:self-center">
            <div className="p-3 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs flex flex-col items-center text-center gap-1">
              <span className="text-[11px] text-outline font-semibold">Lead Mentor</span>
              <span className="text-body-sm font-bold text-on-surface">
                {tomorrowPlan.trainer?.name || 'Faculty Mentor'}
              </span>
              <span className="text-[11px] text-primary font-medium">
                {tomorrowPlan.classroom || 'Offline Classroom'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cohort Timeline */}
      <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
          <span className="font-headline-sm text-[16px] text-on-surface font-bold">
            Cohort Weekly Timeline (Academic Semester)
          </span>
          <span className="font-label-sm text-label-sm text-primary font-bold">
            Timezone: Asia/Kolkata (IST)
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-surface-container-low/40 border border-surface-container-high/40 flex flex-col items-center justify-center gap-3">
            <div className="p-3.5 rounded-full bg-surface-container text-outline">
              <span className="material-symbols-outlined text-[32px]">event_busy</span>
            </div>
            <h4 className="font-headline-sm text-[16px] text-on-surface font-bold">No Scheduled Sessions In Timetable</h4>
            <p className="text-body-sm text-outline max-w-md">
              There are no class sessions scheduled for your cohort timetable yet. Your instructor will publish lesson schedules here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((sess) => {
              const isLive = sess.status === 'LIVE';
              const isCompleted = sess.status === 'COMPLETED';

              return (
                <div
                  key={sess._id}
                  className={`p-4 rounded-xl flex flex-col justify-between gap-3 border transition-all ${
                    isLive
                      ? 'bg-primary-fixed/20 border-primary shadow-xs'
                      : isCompleted
                      ? 'bg-surface-container-low border-surface-container-high/40 opacity-85'
                      : 'bg-surface-container-lowest border-surface-container-high/60 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-outline font-semibold">
                        {new Date(sess.sessionDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${
                          isLive
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {isLive ? 'LIVE NOW' : sess.status}
                      </span>
                    </div>

                    <h3 className="text-body-md font-bold text-on-surface leading-snug">
                      {sess.topicTitle}
                    </h3>
                    <span className="text-[11px] font-semibold text-primary">
                      {sess.moduleLabel}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-surface-container-high/40 flex items-center justify-between text-[12px] text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                      <span>{sess.startTime} - {sess.endTime}</span>
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[16px] text-secondary">meeting_room</span>
                      <span>{sess.roomNumber || sess.classroom || 'Classroom TBA'}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
