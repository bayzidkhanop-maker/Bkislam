import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Course, User, CourseModule, Lesson, Review, Category } from './models';
import { getCourses, updateCourse, deleteCourse, getAllUsers, getCourseModules, getCourseReviews, deleteReview, getCategories, createCategory, deleteCategory, createCourse } from './firestoreService';
import { Card, Button, Input, Loader } from './widgets';
import { Search, Filter, Edit, Trash2, CheckCircle, XCircle, Eye, BookOpen, DollarSign, Star, BarChart2, Bell, Shield, Settings, MoreVertical, Plus, FolderTree } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export const AdminCourseManagement = ({ currentUser }: { currentUser: User }) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'edit' | 'categories'>('list');
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'content' | 'reviews' | 'settings'>('overview');
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [courseReviews, setCourseReviews] = useState<Review[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedCourses, fetchedUsers, fetchedCategories] = await Promise.all([
        getCourses(),
        getAllUsers(),
        getCategories()
      ]);
      setCourses(fetchedCourses);
      setUsers(fetchedUsers);
      setCategories(fetchedCategories);
    } catch (error) {
      toast.error('Failed to load courses data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (course: Course) => {
    setSelectedCourse(course);
    setViewMode('details');
    setActiveDetailTab('overview');
    setLoadingDetails(true);
    try {
      const [modules, reviews] = await Promise.all([
        getCourseModules(course.id),
        getCourseReviews(course.id)
      ]);
      setCourseModules(modules);
      setCourseReviews(reviews);
    } catch (error) {
      toast.error('Failed to load course details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const [editFormData, setEditFormData] = useState<Partial<Course>>({});

  const handleEditChange = (field: keyof Course, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!selectedCourse) return;
    try {
      await updateCourse(selectedCourse.id, editFormData);
      setCourses(courses.map(c => c.id === selectedCourse.id ? { ...c, ...editFormData } : c));
      toast.success('Course updated successfully');
      setViewMode('list');
    } catch (error) {
      toast.error('Failed to update course');
    }
  };

  const handleStatusChange = async (courseId: string, newStatus: 'draft' | 'published' | 'archived') => {
    try {
      await updateCourse(courseId, { status: newStatus });
      setCourses(courses.map(c => c.id === courseId ? { ...c, status: newStatus } : c));
      toast.success(`Course status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update course status');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        await deleteCourse(courseId); // Note: deleteCourse needs to be implemented or imported if it exists
        setCourses(courses.filter(c => c.id !== courseId));
        toast.success('Course deleted successfully');
      } catch (error) {
        toast.error('Failed to delete course');
      }
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await deleteReview(reviewId);
        setCourseReviews(courseReviews.filter(r => r.id !== reviewId));
        toast.success('Review deleted');
      } catch (error) {
        toast.error('Failed to delete review');
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await createCategory(newCategoryName);
      setCategories([...categories, newCat]);
      setNewCategoryName('');
      toast.success('Category added');
    } catch (error) {
      toast.error('Failed to add category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(id);
        setCategories(categories.filter(c => c.id !== id));
        toast.success('Category deleted');
      } catch (error) {
        toast.error('Failed to delete category');
      }
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          course.instructorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateCourse = async () => {
    const title = prompt("Enter course title:");
    if (!title) return;
    
    const toastId = toast.loading('Creating course...');
    try {
      const newCourse = await createCourse({
        title,
        description: '',
        instructorId: currentUser.uid,
        instructorName: currentUser.name,
        price: 0,
        thumbnailURL: '',
        tags: [],
        level: 'Beginner',
        language: 'English',
        rating: 0,
        totalReviews: 0,
        studentsCount: 0,
        status: 'draft'
      });
      toast.success('Course created!', { id: toastId });
      navigate(`/course-builder/${newCourse.id}`);
    } catch (error) {
      toast.error('Failed to create course', { id: toastId });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Course Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setViewMode(viewMode === 'categories' ? 'list' : 'categories')}>
            <FolderTree size={18} className="mr-2" /> {viewMode === 'categories' ? 'Back to Courses' : 'Manage Categories'}
          </Button>
          <Button onClick={handleCreateCourse}>
            <Plus size={18} className="mr-2" /> New Course
          </Button>
        </div>
      </div>

      {viewMode === 'categories' && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Categories</h3>
          <div className="flex gap-2 mb-6">
            <Input 
              placeholder="New category name..." 
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={handleAddCategory}>Add Category</Button>
          </div>
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center p-3 border border-gray-100 dark:border-gray-700 rounded-xl">
                <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-gray-500 text-sm py-4">No categories found.</p>
            )}
          </div>
        </Card>
      )}

      {viewMode === 'list' && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input 
                placeholder="Search courses by title or instructor..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                  <th className="pb-3 font-medium">Course</th>
                  <th className="pb-3 font-medium">Instructor</th>
                  <th className="pb-3 font-medium">Price</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Students</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredCourses.map(course => (
                  <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <img src={course.thumbnail} alt={course.title} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{course.title}</p>
                          <p className="text-xs text-gray-500">{course.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-sm text-gray-700 dark:text-gray-300">{course.instructorName}</td>
                    <td className="py-4 text-sm font-medium text-gray-900 dark:text-white">${course.price}</td>
                    <td className="py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${course.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                          course.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}
                      >
                        {course.status}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-gray-700 dark:text-gray-300">{course.enrolledCount || 0}</td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleViewDetails(course)}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => { setSelectedCourse(course); setEditFormData(course); setViewMode('edit'); }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Course"
                        >
                          <Edit size={18} />
                        </button>
                        <div className="relative group">
                          <button className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                            <MoreVertical size={18} />
                          </button>
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 hidden group-hover:block z-10">
                            {course.status !== 'published' && (
                              <button onClick={() => handleStatusChange(course.id, 'published')} className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-gray-50 dark:hover:bg-gray-700">Approve & Publish</button>
                            )}
                            {course.status !== 'draft' && (
                              <button onClick={() => handleStatusChange(course.id, 'draft')} className="w-full text-left px-4 py-2 text-sm text-yellow-600 hover:bg-gray-50 dark:hover:bg-gray-700">Move to Draft</button>
                            )}
                            <button onClick={() => handleDeleteCourse(course.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Delete Course</button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCourses.length === 0 && (
              <div className="text-center py-12 text-gray-500">No courses found matching your criteria.</div>
            )}
          </div>
        </Card>
      )}

      {viewMode === 'details' && selectedCourse && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setViewMode('list')} className="text-indigo-600 hover:underline text-sm font-medium flex items-center gap-1">
              &larr; Back to Courses
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setEditFormData(selectedCourse); setViewMode('edit'); }}>
                <Edit size={16} className="mr-2" /> Edit Course
              </Button>
            </div>
          </div>
          
          <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
            {(['overview', 'content', 'reviews', 'settings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveDetailTab(tab)}
                className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeDetailTab === tab 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {loadingDetails ? (
            <div className="flex justify-center p-12"><Loader /></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {activeDetailTab === 'overview' && (
                  <Card className="p-6">
                    <div className="flex gap-6">
                      <img src={selectedCourse.thumbnail} alt={selectedCourse.title} className="w-48 h-32 object-cover rounded-xl" />
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedCourse.title}</h3>
                        <p className="text-gray-500 mb-4 line-clamp-2">{selectedCourse.description}</p>
                        <div className="flex gap-4 text-sm">
                          <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{selectedCourse.category}</span>
                          <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{selectedCourse.level}</span>
                          <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-medium">${selectedCourse.price}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {activeDetailTab === 'content' && (
                  <Card className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-lg font-bold flex items-center gap-2"><BookOpen size={20}/> Course Content</h4>
                      <Button variant="outline" size="sm">Manage Content</Button>
                    </div>
                    {courseModules.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-8">No modules found for this course.</p>
                    ) : (
                      <div className="space-y-4">
                        {courseModules.map((module, index) => (
                          <div key={module.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Module {index + 1}: {module.title}</h5>
                            <div className="space-y-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                              {module.lessons.map((lesson, lIndex) => (
                                <div key={lesson.id} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                                  <span>{lIndex + 1}. {lesson.title}</span>
                                  <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{lesson.type}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}

                {activeDetailTab === 'reviews' && (
                  <Card className="p-6">
                    <h4 className="text-lg font-bold mb-6 flex items-center gap-2"><Star size={20}/> Course Reviews</h4>
                    {courseReviews.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-8">No reviews yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {courseReviews.map(review => (
                          <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">{review.userName}</span>
                                <div className="flex text-yellow-400">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={14} className={i < review.rating ? "fill-current" : "text-gray-300"} />
                                  ))}
                                </div>
                              </div>
                              <span className="text-xs text-gray-500">{formatDistanceToNow(review.createdAt, { addSuffix: true })}</span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">{review.comment}</p>
                            <div className="mt-2 flex justify-end">
                              <button onClick={() => handleDeleteReview(review.id)} className="text-xs text-red-600 hover:underline">Delete Review</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}

                {activeDetailTab === 'settings' && (
                  <Card className="p-6">
                    <h4 className="text-lg font-bold mb-6 flex items-center gap-2"><Settings size={20}/> Advanced Settings</h4>
                    <div className="space-y-6">
                      <div>
                        <label className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Feature Course on Homepage</span>
                          <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" />
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Highlight this course in the featured section.</p>
                      </div>
                      <hr className="border-gray-100 dark:border-gray-700" />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Override Price ($)</label>
                        <div className="flex gap-2">
                          <Input type="number" defaultValue={selectedCourse.price} className="w-32" />
                          <Button variant="outline">Update Price</Button>
                        </div>
                      </div>
                      <hr className="border-gray-100 dark:border-gray-700" />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign New Instructor</label>
                        <div className="flex gap-2">
                          <select className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                            <option value="">Select Instructor...</option>
                            {users.filter(u => u.role === 'instructor' || u.role === 'admin').map(u => (
                              <option key={u.uid} value={u.uid}>{u.name}</option>
                            ))}
                          </select>
                          <Button variant="outline">Assign</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card className="p-6">
                  <h4 className="text-lg font-bold mb-4 flex items-center gap-2"><Shield size={20}/> Status & Actions</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500">Current Status</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${selectedCourse.status === 'published' ? 'bg-green-100 text-green-800' : 
                          selectedCourse.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`}
                      >
                        {selectedCourse.status}
                      </span>
                    </div>
                    {selectedCourse.status !== 'published' && (
                      <Button className="w-full justify-start bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatusChange(selectedCourse.id, 'published')}>
                        <CheckCircle size={18} className="mr-2"/> Approve & Publish
                      </Button>
                    )}
                    {selectedCourse.status !== 'draft' && (
                      <Button variant="outline" className="w-full justify-start" onClick={() => handleStatusChange(selectedCourse.id, 'draft')}>
                        <XCircle size={18} className="mr-2"/> Move to Draft
                      </Button>
                    )}
                    {selectedCourse.status !== 'archived' && (
                      <Button variant="outline" className="w-full justify-start text-yellow-600 hover:bg-yellow-50" onClick={() => handleStatusChange(selectedCourse.id, 'archived')}>
                        <Shield size={18} className="mr-2"/> Archive Course
                      </Button>
                    )}
                    <Button variant="outline" className="w-full justify-start text-red-600 hover:bg-red-50" onClick={() => handleDeleteCourse(selectedCourse.id)}>
                      <Trash2 size={18} className="mr-2"/> Delete Course
                    </Button>
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="text-lg font-bold mb-4 flex items-center gap-2"><BarChart2 size={20}/> Analytics Overview</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                      <span className="text-gray-500">Total Enrolled</span>
                      <span className="font-bold text-gray-900 dark:text-white">{selectedCourse.enrolledCount || 0}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                      <span className="text-gray-500">Revenue</span>
                      <span className="font-bold text-green-600">${(selectedCourse.enrolledCount || 0) * selectedCourse.price}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Rating</span>
                      <span className="font-bold flex items-center gap-1 text-gray-900 dark:text-white"><Star size={14} className="fill-yellow-400 text-yellow-400"/> {selectedCourse.rating || 'N/A'}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'edit' && selectedCourse && (
         <div className="space-y-6">
          <button onClick={() => setViewMode('list')} className="text-indigo-600 hover:underline text-sm font-medium">
            &larr; Back to Courses
          </button>
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Edit Course: {selectedCourse.title}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <Input 
                  value={editFormData.title || ''} 
                  onChange={(e) => handleEditChange('title', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea 
                  value={editFormData.description || ''}
                  onChange={(e) => handleEditChange('description', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white h-32"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ($)</label>
                  <Input 
                    type="number" 
                    value={editFormData.price || 0} 
                    onChange={(e) => handleEditChange('price', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select 
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white" 
                    value={editFormData.category || ''}
                    onChange={(e) => handleEditChange('category', e.target.value)}
                  >
                    <option value="">Select Category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Level</label>
                  <select 
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white" 
                    value={editFormData.level || 'Beginner'}
                    onChange={(e) => handleEditChange('level', e.target.value)}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select 
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white" 
                    value={editFormData.status || 'draft'}
                    onChange={(e) => handleEditChange('status', e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 dark:border-gray-700">
                <Button variant="outline" onClick={() => setViewMode('list')}>Cancel</Button>
                <Button onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>
          </Card>
         </div>
      )}
    </div>
  );
};
