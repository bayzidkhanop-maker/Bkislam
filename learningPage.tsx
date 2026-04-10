import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCourse, getCourseModules, getModuleLessons, getEnrollment, markLessonComplete } from './firestoreService';
import { Course, CourseModule, Lesson, Enrollment, User } from './models';
import { Loader, Button } from './widgets';
import { PlayCircle, CheckCircle, Circle, ChevronLeft, ChevronDown, ChevronUp, FileText, Lock, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const LearningPage = ({ currentUser }: { currentUser: User }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({});
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchLearningData = async () => {
      if (!courseId || !currentUser) return;
      setLoading(true);
      try {
        const fetchedEnrollment = await getEnrollment(currentUser.uid, courseId);
        if (!fetchedEnrollment || fetchedEnrollment.status !== 'active') {
          toast.error("You don't have active access to this course.");
          navigate(`/course/${courseId}`);
          return;
        }
        setEnrollment(fetchedEnrollment);

        const fetchedCourse = await getCourse(courseId);
        if (fetchedCourse) setCourse(fetchedCourse);

        const fetchedModules = await getCourseModules(courseId);
        setModules(fetchedModules);

        const lessonsMap: Record<string, Lesson[]> = {};
        let firstLesson: Lesson | null = null;

        for (const mod of fetchedModules) {
          const lessons = await getModuleLessons(mod.id);
          lessonsMap[mod.id] = lessons;
          if (!firstLesson && lessons.length > 0) {
            firstLesson = lessons[0];
          }
        }
        setLessonsByModule(lessonsMap);

        // Set active lesson to the first uncompleted one, or just the first one
        if (firstLesson) {
          setActiveLesson(firstLesson);
        }

        // Expand all modules by default
        const expandState: Record<string, boolean> = {};
        fetchedModules.forEach(m => expandState[m.id] = true);
        setExpandedModules(expandState);

      } catch (error) {
        console.error("Error fetching learning data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLearningData();
  }, [courseId, currentUser, navigate]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleMarkComplete = async () => {
    if (!enrollment || !activeLesson) return;
    try {
      await markLessonComplete(enrollment.id, activeLesson.id, enrollment.completedLessons);
      setEnrollment(prev => prev ? { ...prev, completedLessons: [...prev.completedLessons, activeLesson.id] } : null);
      toast.success("Lesson marked as complete!");
      // Auto-advance to next lesson could be added here
    } catch (error) {
      toast.error("Failed to mark complete.");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-900"><Loader /></div>;
  if (!course || !enrollment) return <div className="text-center py-20 text-white">Access Denied.</div>;

  const totalLessons = Object.values(lessonsByModule).reduce((acc, lessons) => acc + lessons.length, 0);
  const progressPercentage = totalLessons > 0 ? Math.round((enrollment.completedLessons.length / totalLessons) * 100) : 0;

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Top Navbar */}
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link to={`/course/${course.id}`} className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="font-bold text-lg truncate max-w-md">{course.title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
            </div>
            <span className="text-sm font-semibold text-gray-300">{progressPercentage}%</span>
          </div>
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800" onClick={() => setSidebarOpen(!sidebarOpen)}>
            Course Content
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Video Player & Details */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-black">
          {activeLesson ? (
            <>
              {/* Video Player Area */}
              <div className="w-full bg-black aspect-video relative flex items-center justify-center">
                {activeLesson.type === 'video' ? (
                  <video 
                    src={activeLesson.content} 
                    controls 
                    className="w-full h-full object-contain"
                    poster={course.thumbnailURL}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="p-8 text-center">
                    <FileText size={64} className="mx-auto text-gray-600 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">{activeLesson.title}</h2>
                    <p className="text-gray-400">Please read the content below.</p>
                  </div>
                )}
              </div>

              {/* Lesson Details & Actions */}
              <div className="p-6 sm:p-8 max-w-4xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h2 className="text-2xl font-bold">{activeLesson.title}</h2>
                  <Button 
                    className={`shrink-0 ${enrollment.completedLessons.includes(activeLesson.id) ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    onClick={handleMarkComplete}
                  >
                    <CheckCircle size={18} className="mr-2" />
                    {enrollment.completedLessons.includes(activeLesson.id) ? 'Completed' : 'Mark as Complete'}
                  </Button>
                </div>

                {/* Tabs for Overview, Q&A, Notes */}
                <div className="border-b border-gray-800 mb-6">
                  <div className="flex gap-6">
                    <button className="pb-3 border-b-2 border-indigo-500 font-semibold text-indigo-400">Overview</button>
                    <button className="pb-3 border-b-2 border-transparent font-semibold text-gray-400 hover:text-gray-300">Q&A</button>
                    <button className="pb-3 border-b-2 border-transparent font-semibold text-gray-400 hover:text-gray-300">Notes</button>
                  </div>
                </div>

                <div className="text-gray-300 leading-relaxed">
                  {activeLesson.type === 'text' ? (
                    <div className="prose prose-invert max-w-none">
                      {activeLesson.content}
                    </div>
                  ) : (
                    <p>Watch the video above to complete this lesson. You can take notes in the Notes tab.</p>
                  )}

                  {((activeLesson.downloadableResources && activeLesson.downloadableResources.length > 0) || 
                    (activeLesson.externalLinks && activeLesson.externalLinks.length > 0)) && (
                    <div className="mt-8 pt-6 border-t border-gray-800">
                      <h3 className="text-lg font-bold text-white mb-4">Resources</h3>
                      
                      {activeLesson.downloadableResources && activeLesson.downloadableResources.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Downloads</h4>
                          <ul className="space-y-2">
                            {activeLesson.downloadableResources.map((url, i) => (
                              <li key={i}>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center text-indigo-400 hover:text-indigo-300 transition-colors">
                                  <FileText size={16} className="mr-2" />
                                  Resource {i + 1}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activeLesson.externalLinks && activeLesson.externalLinks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">External Links</h4>
                          <ul className="space-y-2">
                            {activeLesson.externalLinks.map((url, i) => (
                              <li key={i}>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center text-indigo-400 hover:text-indigo-300 transition-colors">
                                  <ExternalLink size={16} className="mr-2" />
                                  Link {i + 1}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a lesson to start learning.
            </div>
          )}
        </div>

        {/* Right: Sidebar Content */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 350, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-gray-900 border-l border-gray-800 flex flex-col shrink-0 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-800 font-bold text-lg">
                Course Content
              </div>
              <div className="flex-1 overflow-y-auto">
                {modules.map((module, index) => (
                  <div key={module.id} className="border-b border-gray-800">
                    <button 
                      className="w-full p-4 flex justify-between items-center bg-gray-800/50 hover:bg-gray-800 transition-colors text-left"
                      onClick={() => toggleModule(module.id)}
                    >
                      <div>
                        <h3 className="font-bold text-gray-200 text-sm">Section {index + 1}: {module.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          0 / {lessonsByModule[module.id]?.length || 0} | {lessonsByModule[module.id]?.reduce((acc, l) => acc + l.duration, 0) || 0} min
                        </p>
                      </div>
                      {expandedModules[module.id] ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                    </button>
                    
                    <AnimatePresence>
                      {expandedModules[module.id] && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div>
                            {lessonsByModule[module.id]?.map((lesson, lIndex) => {
                              const isCompleted = enrollment.completedLessons.includes(lesson.id);
                              const isActive = activeLesson?.id === lesson.id;
                              const daysSinceEnrollment = Math.floor((Date.now() - enrollment.enrolledAt) / (1000 * 60 * 60 * 24));
                              const isLocked = (lesson.dripDays || 0) > daysSinceEnrollment;
                              
                              return (
                                <button 
                                  key={lesson.id}
                                  className={`w-full p-3 pl-4 flex gap-3 text-left transition-colors ${isActive ? 'bg-indigo-900/30' : 'hover:bg-gray-800/50'} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  onClick={() => {
                                    if (!isLocked) {
                                      setActiveLesson(lesson);
                                    } else {
                                      toast.info(`This lesson will unlock in ${(lesson.dripDays || 0) - daysSinceEnrollment} days.`);
                                    }
                                  }}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    {isLocked ? (
                                      <Lock size={16} className="text-gray-500" />
                                    ) : isCompleted ? (
                                      <CheckCircle size={16} className="text-green-500" />
                                    ) : (
                                      <Circle size={16} className="text-gray-600" />
                                    )}
                                  </div>
                                  <div>
                                    <p className={`text-sm ${isActive ? 'text-white font-semibold' : 'text-gray-300'}`}>
                                      {lIndex + 1}. {lesson.title}
                                    </p>
                                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                      {lesson.type === 'video' ? <PlayCircle size={12} /> : <FileText size={12} />}
                                      <span>{lesson.duration} min</span>
                                      {isLocked && <span className="ml-2 text-amber-500">Unlocks in {(lesson.dripDays || 0) - daysSinceEnrollment} days</span>}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
