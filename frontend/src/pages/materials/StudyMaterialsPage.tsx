import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export const StudyMaterialsPage: React.FC = () => {
  const { role } = useAuth();
  const isTrainerOrAdmin = role === 'TRAINER' || role === 'ADMIN';

  const [materials, setMaterials] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [form, setForm] = useState({
    title: '',
    category: 'NOTES',
    moduleLabel: '',
    description: '',
    fileType: 'PDF',
    fileSizeFormatted: '',
    downloadUrl: '',
    courseId: '',
  });

  const fetchData = async () => {
    try {
      const [matRes, coursesRes] = await Promise.all([
        api.get('/communication/materials'),
        api.get('/courses/courses'),
      ]);
      if (matRes.data.success) {
        setMaterials(matRes.data.materials);
      }
      if (coursesRes.data.success) {
        setCourses(coursesRes.data.courses);
        if (coursesRes.data.courses.length > 0) {
          setForm((prev) => ({ ...prev, courseId: coursesRes.data.courses[0]._id }));
        }
      }
    } catch (err) {
      console.error('Failed to load study materials:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownload = (material: any) => {
    if (material.downloadUrl && material.downloadUrl.startsWith('http')) {
      window.open(material.downloadUrl, '_blank');
    } else {
      alert(`Initiating download for "${material.title}" (${material.fileSizeFormatted || 'Document'}).`);
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/communication/materials', form);
      if (res.data.success) {
        alert(`Study material "${form.title}" published successfully!`);
        setShowUploadModal(false);
        setForm({
          title: '',
          category: 'NOTES',
          moduleLabel: '',
          description: '',
          fileType: 'PDF',
          fileSizeFormatted: '2.5 MB',
          downloadUrl: '',
          courseId: courses[0]?._id || '',
        });
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish study material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete material "${title}"?`)) return;
    try {
      const res = await api.delete(`/communication/materials/${id}`);
      if (res.data.success) {
        setMaterials((prev) => prev.filter((m) => m._id !== id));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete study material');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
            progress_activity
          </span>
          <span className="font-body-md text-on-surface-variant font-medium">
            Loading course study materials...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-16 pt-6 gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
            Course Study Materials &amp; Repositories
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Architectural diagrams, starter code archives, and lecture notes
          </p>
        </div>

        {isTrainerOrAdmin && (
          <button
            onClick={() => setShowUploadModal(true)}
            type="button"
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span>Upload Material</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {materials.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/60 shadow-xs flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">folder_special</span>
            </div>
            <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
              No Study Materials Uploaded
            </h3>
            <p className="text-body-sm text-on-surface-variant max-w-md">
              There are currently no study documents, code repositories, or lab slides uploaded.
            </p>
            {isTrainerOrAdmin && (
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                <span>Upload First Resource</span>
              </button>
            )}
          </div>
        ) : (
          materials.map((item) => {
            const isPdf = item.fileType === 'PDF';
            return (
              <div
                key={item._id}
                className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`p-3 rounded-xl shrink-0 ${
                      isPdf ? 'bg-rose-100 text-rose-700' : 'bg-surface-container text-secondary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">
                      {isPdf ? 'picture_as_pdf' : 'folder_zip'}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-body-md font-bold text-on-surface truncate">
                      {item.title}
                    </span>
                    <p className="text-[12px] text-on-surface-variant truncate">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-outline font-medium">
                      {item.moduleLabel && (
                        <>
                          <span className="font-semibold text-primary">{item.moduleLabel}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{item.fileSizeFormatted || 'Document'}</span>
                      <span>•</span>
                      <span>{item.category || 'Resource'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownload(item)}
                    type="button"
                    className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary transition-colors cursor-pointer border border-surface-container-high/40"
                    title="Download Resource"
                  >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                  </button>
                  {isTrainerOrAdmin && (
                    <button
                      onClick={() => handleDeleteMaterial(item._id, item.title)}
                      type="button"
                      className="p-2.5 rounded-xl text-outline hover:text-error hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Material"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-5 border border-surface-container-high max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Learning Content Management
                </span>
                <h3 className="font-headline-sm text-[18px] text-on-surface font-bold">
                  Upload Course Study Material
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleUploadMaterial} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Material Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Node.js Streams & Pipeline Cheat Sheet"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="NOTES">Lecture Notes</option>
                    <option value="SLIDES">Slide Deck</option>
                    <option value="CODE_STARTER">Starter Code</option>
                    <option value="CHEATSHEET">Cheat Sheet / Reference</option>
                    <option value="ARCHIVE">Zip Archive</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">File Type</label>
                  <select
                    value={form.fileType}
                    onChange={(e) => setForm({ ...form, fileType: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="ZIP">ZIP Archive</option>
                    <option value="DOC">Word Document</option>
                    <option value="CODE">Source Code</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Curriculum Module</label>
                  <input
                    type="text"
                    placeholder="e.g. Module 2: Express.js REST APIs"
                    value={form.moduleLabel}
                    onChange={(e) => setForm({ ...form, moduleLabel: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-semibold text-on-surface">Estimated File Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 3.2 MB"
                    value={form.fileSizeFormatted}
                    onChange={(e) => setForm({ ...form, fileSizeFormatted: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">Course Association</label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Download Link / Google Drive / Repo URL
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or https://github.com/..."
                  value={form.downloadUrl}
                  onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-semibold text-on-surface">
                  Description <span className="text-error">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Summary of the resource content..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-body-sm font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">publish</span>
                  <span>{isSubmitting ? 'Publishing...' : 'Publish Resource'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
