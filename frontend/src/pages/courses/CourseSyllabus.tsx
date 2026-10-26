import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const CourseSyllabus: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({ '0': true, '1': true, '2': true });

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get('/courses/courses');
        if (res.data.success) {
          setCourses(res.data.courses);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const toggleModule = (idx: string) => {
    setExpandedModules((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
            progress_activity
          </span>
          <span className="font-body-md text-on-surface-variant font-medium">
            Loading course syllabus...
          </span>
        </div>
      </div>
    );
  }

  const course = courses[0];

  if (!course) {
    return (
      <div className="flex flex-col w-full pb-16 pt-6 gap-6">
        <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 shadow-xs flex flex-col items-center justify-center gap-3">
          <div className="p-4 rounded-full bg-surface-container text-outline">
            <span className="material-symbols-outlined text-[36px]">auto_stories</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">No Course Syllabus Available</h3>
          <p className="text-body-sm text-outline max-w-md">
            There are currently no active curriculum courses registered in the database.
          </p>
        </div>
      </div>
    );
  }

  const completedModulesCount = course?.modules?.filter((m: any) => m.isCompleted).length || 0;
  const totalModulesCount = course?.modules?.length || 0;
  const progressPct = totalModulesCount > 0 ? Math.round((completedModulesCount / totalModulesCount) * 100) : 0;

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      {/* Course Header Hero Card */}
      <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold uppercase tracking-wider">
              {course.courseCode || 'CURRICULUM'}
            </span>
            {course.durationWeeks && (
              <span className="text-[12px] text-on-surface-variant">• {course.durationWeeks} Weeks Track</span>
            )}
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {course.title || course.name}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            {course.description || 'Comprehensive curriculum modules and hands-on lessons.'}
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1.5 p-4 rounded-xl bg-surface-container-low border border-surface-container-high/40 shrink-0">
          <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Curriculum Progress</span>
          <span className="text-[28px] font-bold text-primary tabular-nums">{progressPct}%</span>
          <span className="text-[11px] text-on-surface-variant">
            {completedModulesCount} of {totalModulesCount} modules completed
          </span>
        </div>
      </div>

      {/* Course Modules Accordion */}
      <div className="flex flex-col gap-4">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
          Curriculum Modules &amp; Hands-on Lessons
        </h2>

        {course.modules?.map((mod: any, index: number) => {
          const isExpanded = !!expandedModules[index.toString()];
          const isCompleted = index < 2;
          const isCurrent = index === 2;

          return (
            <div
              key={mod._id}
              className={`rounded-2xl transition-all border ${
                isCurrent
                  ? 'bg-surface-container-lowest border-primary/40 shadow-xs'
                  : 'bg-surface-container-lowest border-surface-container-high/40'
              }`}
            >
              <div
                onClick={() => toggleModule(index.toString())}
                className="p-5 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[14px] ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : isCurrent
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container text-outline'
                    }`}
                  >
                    {isCompleted ? '✓' : `0${mod.moduleNumber}`}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-title-md text-title-md font-bold text-on-surface">
                        {mod.title}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                          In Progress
                        </span>
                      )}
                    </div>
                    <span className="text-body-sm text-on-surface-variant mt-0.5">
                      {mod.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-outline hidden sm:block">
                    {mod.lessons?.length || 0} Lessons
                  </span>
                  <span className="material-symbols-outlined text-[20px] text-outline">
                    {isExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                </div>
              </div>

              {isExpanded && mod.lessons && (
                <div className="px-5 pb-5 pt-1 border-t border-surface-container-low flex flex-col gap-2.5">
                  {mod.lessons.map((les: any) => (
                    <div
                      key={les._id}
                      className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          play_circle
                        </span>
                        <div className="flex flex-col">
                          <span className="text-body-sm font-semibold text-on-surface">
                            {les.title}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            {les.durationMinutes} mins • Hands-on Lab &amp; Code Repo
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          alert(`Lesson: "${les.title}"\nLearning material synced to classroom workstation.`)
                        }
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-primary text-body-sm font-medium hover:bg-primary-fixed transition-colors shadow-xs cursor-pointer border border-surface-container-high/40"
                      >
                        View Material
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
