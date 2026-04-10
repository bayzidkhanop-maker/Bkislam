import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourse, updateCourse, getCourseModules, getModuleLessons, createCourseModule, createLesson, updateCourseModule, deleteCourseModule, updateLesson, deleteLesson, getCategories } from './firestoreService';
import { Course, CourseModule, Lesson, User, Category } from './models';
import { Card, Button, Input, Loader } from './widgets';
import { Save, ArrowLeft, Plus, GripVertical, Trash2, Video, FileText, Settings, BookOpen, Edit, ArrowUp, ArrowDown, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export const CourseBuilderPage = ({ currentUser }: { currentUser: User }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { id: 1, title: 'Basic Info', icon: BookOpen },
    { id: 2, title: 'Content', icon: Video },
    { id: 3, title: 'Pricing', icon: Settings },
    { id: 4, title: 'Advanced', icon: Settings }
  ];

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      setLoading(true);
      try {
        const [fetchedCourse, fetchedCategories] = await Promise.all([
          getCourse(courseId),
          getCategories()
        ]);
        
        setCategories(fetchedCategories);

        if (fetchedCourse) {
          if (fetchedCourse.instructorId !== currentUser.uid && currentUser.role !== 'admin') {
            toast.error("Unauthorized");
            navigate('/course-dashboard');
            return;
          }
          setCourse(fetchedCourse);
          const fetchedModules = await getCourseModules(courseId);
          setModules(fetchedModules);
          
          const lessonsMap: Record<string, Lesson[]> = {};
          for (const mod of fetchedModules) {
            const lessons = await getModuleLessons(mod.id);
            lessonsMap[mod.id] = lessons;
          }
          setLessonsByModule(lessonsMap);
        }
      } catch (error) {
        toast.error("Failed to load course");
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId, currentUser, navigate]);

  const handleSave = async (submitForApproval = false) => {
    if (!course) return;
    
    // Validation
    if (!course.title || !course.description) {
      toast.error("Title and description are required.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Saving course...');
    try {
      const updates: Partial<Course> = {
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        price: course.price,
        discountPrice: course.discountPrice,
        thumbnailURL: course.thumbnailURL,
        promoVideoURL: course.promoVideoURL,
        category: course.category,
        subcategory: course.subcategory,
        tags: course.tags,
        level: course.level,
        language: course.language,
        status: submitForApproval ? 'pending' : course.status,
        targetAudience: course.targetAudience,
        estimatedDuration: course.estimatedDuration,
        certificateEnabled: course.certificateEnabled,
        lifetimeAccess: course.lifetimeAccess,
        dripContentEnabled: course.dripContentEnabled,
      };
      
      await updateCourse(course.id, updates);
      if (submitForApproval) {
        setCourse({ ...course, ...updates });
        toast.success('Course submitted for approval!', { id: toastId });
      } else {
        toast.success('Course saved successfully!', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to save course', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleAddModule = async () => {
    if (!course) return;
    const title = prompt("Enter module title:");
    if (!title) return;
    
    const toastId = toast.loading('Adding module...');
    try {
      const newModule = await createCourseModule({
        courseId: course.id,
        instructorId: currentUser.uid,
        title,
        order: modules.length,
      });
      setModules([...modules, newModule]);
      setLessonsByModule({ ...lessonsByModule, [newModule.id]: [] });
      toast.success('Module added', { id: toastId });
    } catch (error) {
      toast.error('Failed to add module', { id: toastId });
    }
  };

  const handleEditModule = async (mod: CourseModule) => {
    const title = prompt("Edit module title:", mod.title);
    if (!title || title === mod.title) return;
    
    const toastId = toast.loading('Updating module...');
    try {
      await updateCourseModule(mod.id, { title });
      setModules(modules.map(m => m.id === mod.id ? { ...m, title } : m));
      toast.success('Module updated', { id: toastId });
    } catch (error) {
      toast.error('Failed to update module', { id: toastId });
    }
  };

  const handleDeleteModule = async (modId: string) => {
    if (!confirm("Are you sure you want to delete this module and all its lessons?")) return;
    
    const toastId = toast.loading('Deleting module...');
    try {
      await deleteCourseModule(modId);
      setModules(modules.filter(m => m.id !== modId));
      const newLessonsByModule = { ...lessonsByModule };
      delete newLessonsByModule[modId];
      setLessonsByModule(newLessonsByModule);
      toast.success('Module deleted', { id: toastId });
    } catch (error) {
      toast.error('Failed to delete module', { id: toastId });
    }
  };

  const handleAddLesson = async (moduleId: string) => {
    if (!course) return;
    const title = prompt("Enter lesson title:");
    if (!title) return;

    const typeStr = prompt("Enter lesson type (video, text, file):", "video");
    if (!typeStr || !['video', 'text', 'file'].includes(typeStr)) return;

    const content = prompt("Enter content (URL or text):");
    if (!content) return;

    const toastId = toast.loading('Adding lesson...');
    try {
      const newLesson = await createLesson({
        moduleId,
        courseId: course.id,
        instructorId: currentUser.uid,
        title,
        type: typeStr as 'video' | 'text' | 'file',
        content,
        duration: 0,
        isFreePreview: false,
        order: (lessonsByModule[moduleId] || []).length,
        dripDays: 0,
      });
      setLessonsByModule({
        ...lessonsByModule,
        [moduleId]: [...(lessonsByModule[moduleId] || []), newLesson]
      });
      toast.success('Lesson added', { id: toastId });
    } catch (error) {
      toast.error('Failed to add lesson', { id: toastId });
    }
  };

  const handleEditLesson = async (lesson: Lesson) => {
    const title = prompt("Edit lesson title:", lesson.title);
    if (!title) return;

    const content = prompt("Edit content (URL or text):", lesson.content);
    if (!content) return;

    const dripDaysStr = prompt("Edit drip days (0 for immediate):", (lesson.dripDays || 0).toString());
    const dripDays = dripDaysStr ? parseInt(dripDaysStr, 10) : 0;

    const resourcesStr = prompt("Edit downloadable resources (comma separated URLs):", (lesson.downloadableResources || []).join(', '));
    const downloadableResources = resourcesStr ? resourcesStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    const linksStr = prompt("Edit external links (comma separated URLs):", (lesson.externalLinks || []).join(', '));
    const externalLinks = linksStr ? linksStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    const toastId = toast.loading('Updating lesson...');
    try {
      await updateLesson(lesson.id, { title, content, dripDays, downloadableResources, externalLinks });
      setLessonsByModule({
        ...lessonsByModule,
        [lesson.moduleId]: lessonsByModule[lesson.moduleId].map(l => l.id === lesson.id ? { ...l, title, content, dripDays, downloadableResources, externalLinks } : l)
      });
      toast.success('Lesson updated', { id: toastId });
    } catch (error) {
      toast.error('Failed to update lesson', { id: toastId });
    }
  };

  const handleDeleteLesson = async (lesson: Lesson) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    
    const toastId = toast.loading('Deleting lesson...');
    try {
      await deleteLesson(lesson.id);
      setLessonsByModule({
        ...lessonsByModule,
        [lesson.moduleId]: lessonsByModule[lesson.moduleId].filter(l => l.id !== lesson.id)
      });
      toast.success('Lesson deleted', { id: toastId });
    } catch (error) {
      toast.error('Failed to delete lesson', { id: toastId });
    }
  };

  const handleMoveModule = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === modules.length - 1)) return;

    const newModules = [...modules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newModules[index], newModules[targetIndex]] = [newModules[targetIndex], newModules[index]];
    
    // Update order property
    newModules.forEach((mod, i) => {
      mod.order = i;
    });

    setModules(newModules);
    
    // Save to DB
    try {
      await Promise.all([
        updateCourseModule(newModules[index].id, { order: newModules[index].order }),
        updateCourseModule(newModules[targetIndex].id, { order: newModules[targetIndex].order })
      ]);
    } catch (error) {
      toast.error('Failed to save module order');
    }
  };

  const handleMoveLesson = async (moduleId: string, index: number, direction: 'up' | 'down') => {
    const lessons = lessonsByModule[moduleId] || [];
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === lessons.length - 1)) return;

    const newLessons = [...lessons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap
    [newLessons[index], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[index]];

    // Update order property
    newLessons.forEach((lesson, i) => {
      lesson.order = i;
    });

    setLessonsByModule({
      ...lessonsByModule,
      [moduleId]: newLessons
    });

    // Save to DB
    try {
      await Promise.all([
        updateLesson(newLessons[index].id, { order: newLessons[index].order }),
        updateLesson(newLessons[targetIndex].id, { order: newLessons[targetIndex].order })
      ]);
    } catch (error) {
      toast.error('Failed to save lesson order');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader /></div>;
  if (!course) return <div className="text-center py-20">Course not found</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/course-dashboard')} className="p-2">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Course Builder</h1>
            <p className="text-gray-500 text-sm">Status: <span className="font-medium capitalize text-indigo-600">{course.status}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => handleSave(false)} isLoading={saving} className="flex items-center gap-2">
            <Save size={18} /> Save Draft
          </Button>
          {course.status !== 'published' && (
            <Button onClick={() => handleSave(true)} isLoading={saving} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle size={18} /> Submit for Approval
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar / Wizard Steps */}
      <div className="mb-8">
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10 rounded-full"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 -z-10 rounded-full transition-all duration-300" style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}></div>
          
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <button 
                  onClick={() => setCurrentStep(step.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors bg-white dark:bg-gray-900
                    ${isActive ? 'border-indigo-600 text-indigo-600' : 
                      isCompleted ? 'border-indigo-600 bg-indigo-600 text-white' : 
                      'border-gray-300 text-gray-400 dark:border-gray-600'}`}
                >
                  {isCompleted ? <CheckCircle size={18} /> : <Icon size={18} />}
                </button>
                <span className={`text-xs font-medium ${isActive || isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      <Card className="p-6">
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Basic Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Title *</label>
              <Input 
                value={course.title} 
                onChange={(e) => setCourse({ ...course, title: e.target.value })}
                placeholder="e.g., Advanced React Patterns"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtitle</label>
              <Input 
                value={course.subtitle || ''} 
                onChange={(e) => setCourse({ ...course, subtitle: e.target.value })}
                placeholder="A short, catchy description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Description *</label>
              <textarea 
                value={course.description}
                onChange={(e) => setCourse({ ...course, description: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white h-40"
                placeholder="Detailed course description..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select 
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  value={course.category || ''}
                  onChange={(e) => setCourse({ ...course, category: e.target.value })}
                >
                  <option value="">Select Category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma separated)</label>
                <Input 
                  value={course.tags?.join(', ') || ''} 
                  onChange={(e) => setCourse({ ...course, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  placeholder="e.g., react, frontend, web"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Thumbnail URL</label>
                <Input 
                  value={course.thumbnailURL} 
                  onChange={(e) => setCourse({ ...course, thumbnailURL: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Promo Video URL</label>
                <Input 
                  value={course.promoVideoURL || ''} 
                  onChange={(e) => setCourse({ ...course, promoVideoURL: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Content Structure</h2>
              <Button onClick={handleAddModule} size="sm"><Plus size={16} className="mr-2"/> Add Module</Button>
            </div>
            
            <div className="space-y-4">
              {modules.map((mod, modIndex) => (
                <div key={mod.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleMoveModule(modIndex, 'up')} className="text-gray-400 hover:text-indigo-600"><ArrowUp size={14}/></button>
                        <button onClick={() => handleMoveModule(modIndex, 'down')} className="text-gray-400 hover:text-indigo-600"><ArrowDown size={14}/></button>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Module {modIndex + 1}: {mod.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditModule(mod)} className="p-1.5 text-gray-500 hover:text-indigo-600"><Edit size={16}/></button>
                      <button onClick={() => handleDeleteModule(mod.id)} className="p-1.5 text-gray-500 hover:text-red-600"><Trash2 size={16}/></button>
                      <Button size="sm" variant="outline" onClick={() => handleAddLesson(mod.id)} className="ml-2">
                        <Plus size={14} className="mr-1"/> Lesson
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-2">
                    {(lessonsByModule[mod.id] || []).map((lesson, lessonIndex) => (
                      <div key={lesson.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <button onClick={() => handleMoveLesson(mod.id, lessonIndex, 'up')} className="text-gray-400 hover:text-indigo-600"><ArrowUp size={12}/></button>
                            <button onClick={() => handleMoveLesson(mod.id, lessonIndex, 'down')} className="text-gray-400 hover:text-indigo-600"><ArrowDown size={12}/></button>
                          </div>
                          {lesson.type === 'video' ? <Video size={16} className="text-indigo-500"/> : <FileText size={16} className="text-blue-500"/>}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{lesson.title}</span>
                          {lesson.isFreePreview && <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full uppercase font-bold">Preview</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEditLesson(lesson)} className="p-1.5 text-gray-400 hover:text-indigo-600"><Edit size={14}/></button>
                          <button onClick={() => handleDeleteLesson(lesson)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))}
                    {(!lessonsByModule[mod.id] || lessonsByModule[mod.id].length === 0) && (
                      <p className="text-sm text-gray-500 text-center py-4">No lessons in this module yet.</p>
                    )}
                  </div>
                </div>
              ))}
              {modules.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                  <p className="text-gray-500 mb-4">Start building your course structure</p>
                  <Button onClick={handleAddModule}><Plus size={16} className="mr-2"/> Add First Module</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Pricing & Access</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ($)</label>
                <Input 
                  type="number"
                  value={course.price} 
                  onChange={(e) => setCourse({ ...course, price: Number(e.target.value) })}
                />
                <p className="text-xs text-gray-500 mt-1">Set to 0 for a free course.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount Price ($)</label>
                <Input 
                  type="number"
                  value={course.discountPrice || ''} 
                  onChange={(e) => setCourse({ ...course, discountPrice: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input 
                  type="checkbox" 
                  checked={course.lifetimeAccess !== false} 
                  onChange={(e) => setCourse({ ...course, lifetimeAccess: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Lifetime Access</p>
                  <p className="text-sm text-gray-500">Students get unlimited access to the course materials forever.</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input 
                  type="checkbox" 
                  checked={course.dripContentEnabled || false} 
                  onChange={(e) => setCourse({ ...course, dripContentEnabled: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Enable Drip Content</p>
                  <p className="text-sm text-gray-500">Release lessons gradually over time instead of all at once.</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Advanced Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Level</label>
                <select 
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  value={course.level}
                  onChange={(e) => setCourse({ ...course, level: e.target.value as any })}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="All Levels">All Levels</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                <Input 
                  value={course.language} 
                  onChange={(e) => setCourse({ ...course, language: e.target.value })}
                  placeholder="e.g., English, Spanish"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Duration</label>
                <Input 
                  value={course.estimatedDuration || ''} 
                  onChange={(e) => setCourse({ ...course, estimatedDuration: e.target.value })}
                  placeholder="e.g., 5 hours 30 mins"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience (comma separated)</label>
              <Input 
                value={course.targetAudience?.join(', ') || ''} 
                onChange={(e) => setCourse({ ...course, targetAudience: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                placeholder="e.g., Beginners, Web Developers"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Requirements (comma separated)</label>
              <Input 
                value={course.requirements?.join(', ') || ''} 
                onChange={(e) => setCourse({ ...course, requirements: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                placeholder="e.g., Basic HTML, No prior experience"
              />
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input 
                  type="checkbox" 
                  checked={course.certificateEnabled !== false} 
                  onChange={(e) => setCourse({ ...course, certificateEnabled: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Enable Certificate of Completion</p>
                  <p className="text-sm text-gray-500">Students will receive a certificate upon finishing all lessons.</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            <ChevronLeft size={18} className="mr-1" /> Previous
          </Button>
          
          {currentStep < steps.length ? (
            <Button onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}>
              Next Step <ChevronRight size={18} className="ml-1" />
            </Button>
          ) : (
            <Button onClick={() => handleSave(true)} className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle size={18} className="mr-2" /> Submit for Approval
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
