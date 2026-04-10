import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCourses, createCourse, updateCourse, getCourseEnrollments, getUserProfile } from './firestoreService';
import { Course, User, Enrollment } from './models';
import { Card, Button, Input, Loader } from './widgets';
import { Plus, Edit, Trash2, Eye, Settings, BookOpen, BarChart2, Users, Search } from 'lucide-react';
import { toast } from 'sonner';

export const CourseDashboardPage = ({ currentUser }: { currentUser: User }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'students'>('courses');
  const [enrollments, setEnrollments] = useState<(Enrollment & { courseTitle: string, studentName: string, studentEmail: string })[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const fetchedCourses = await getCourses();
        let myCourses = fetchedCourses;
        if (currentUser.role !== 'admin') {
          myCourses = fetchedCourses.filter(c => c.instructorId === currentUser.uid);
        }
        setCourses(myCourses);

        // Fetch enrollments for all my courses
        const allEnrollments = [];
        for (const course of myCourses) {
          const courseEnrollments = await getCourseEnrollments(course.id);
          for (const enr of courseEnrollments) {
            const studentProfile = await getUserProfile(enr.userId);
            allEnrollments.push({
              ...enr,
              courseTitle: course.title,
              studentName: studentProfile?.displayName || 'Unknown',
              studentEmail: studentProfile?.email || 'Unknown',
            });
          }
        }
        setEnrollments(allEnrollments);
      } catch (error) {
        toast.error("Failed to load courses");
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [currentUser]);

  const handleCreateCourse = async () => {
    const toastId = toast.loading('Creating new course draft...');
    try {
      const newCourse = await createCourse({
        title: 'Untitled Course',
        description: '',
        instructorId: currentUser.uid,
        instructorName: currentUser.name,
        price: 0,
        thumbnailURL: 'https://picsum.photos/seed/course/800/600',
        tags: [],
        level: 'Beginner',
        language: 'English',
        rating: 0,
        totalReviews: 0,
        studentsCount: 0,
        status: 'draft',
      });
      toast.success('Draft created!', { id: toastId });
      navigate(`/course-builder/${newCourse.id}`);
    } catch (error) {
      toast.error('Failed to create course', { id: toastId });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader /></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Course Dashboard</h1>
          <p className="text-gray-500">Manage your courses, students, and analytics.</p>
        </div>
        <Button onClick={handleCreateCourse} className="flex items-center gap-2">
          <Plus size={20} /> Create New Course
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-indigo-100 font-medium">Total Courses</p>
              <h3 className="text-3xl font-bold">{courses.length}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-emerald-100 font-medium">Total Students</p>
              <h3 className="text-3xl font-bold">{courses.reduce((acc, c) => acc + c.studentsCount, 0)}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-orange-500 to-red-600 text-white border-0">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <BarChart2 size={24} />
            </div>
            <div>
              <p className="text-orange-100 font-medium">Total Revenue</p>
              <h3 className="text-3xl font-bold">৳ {courses.reduce((acc, c) => acc + (c.price * c.studentsCount), 0)}</h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button 
          className={`pb-3 font-semibold ${activeTab === 'courses' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('courses')}
        >
          My Courses
        </button>
        <button 
          className={`pb-3 font-semibold ${activeTab === 'students' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('students')}
        >
          Students & Enrollments
        </button>
      </div>

      {activeTab === 'courses' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-600">Course</th>
                  <th className="p-4 font-semibold text-gray-600">Status</th>
                  <th className="p-4 font-semibold text-gray-600">Price</th>
                  <th className="p-4 font-semibold text-gray-600">Students</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {courses.map(course => (
                  <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={course.thumbnailURL} alt={course.title} className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                          <p className="font-semibold text-gray-900 line-clamp-1">{course.title}</p>
                          <p className="text-xs text-gray-500">{course.category || 'Uncategorized'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        course.status === 'published' ? 'bg-green-100 text-green-700' :
                        course.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {course.status}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-900">
                      {course.price === 0 ? 'Free' : `৳ ${course.price}`}
                    </td>
                    <td className="p-4 text-gray-600">{course.studentsCount}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/course/${course.id}`)}>
                          <Eye size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/course-builder/${course.id}`)}>
                          <Edit size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {courses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      No courses found. Create your first course!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'students' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-600">Student</th>
                  <th className="p-4 font-semibold text-gray-600">Course</th>
                  <th className="p-4 font-semibold text-gray-600">Enrolled At</th>
                  <th className="p-4 font-semibold text-gray-600">Progress</th>
                  <th className="p-4 font-semibold text-gray-600">Status</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {enrollments.map(enr => (
                  <tr key={enr.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-gray-900">{enr.studentName}</p>
                      <p className="text-xs text-gray-500">{enr.studentEmail}</p>
                    </td>
                    <td className="p-4 text-gray-700">{enr.courseTitle}</td>
                    <td className="p-4 text-gray-600">{new Date(enr.enrolledAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${enr.progress}%` }} />
                        </div>
                        <span className="text-xs font-medium text-gray-600">{enr.progress}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        enr.status === 'completed' ? 'bg-green-100 text-green-700' :
                        enr.status === 'active' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {enr.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {enr.progress === 100 && !enr.certificateIssued && (
                          <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-50" onClick={async () => {
                            try {
                              const { issueCertificate } = await import('./firestoreService');
                              await issueCertificate(enr.id, `https://example.com/certificate/${enr.id}`);
                              setEnrollments(enrollments.map(e => e.id === enr.id ? { ...e, certificateIssued: true, certificateUrl: `https://example.com/certificate/${enr.id}` } : e));
                              toast.success('Certificate issued');
                            } catch (e) {
                              toast.error('Failed to issue certificate');
                            }
                          }}>
                            Issue Certificate
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={async () => {
                          if (!confirm('Are you sure you want to remove this student?')) return;
                          try {
                            const { removeStudentFromCourse } = await import('./firestoreService');
                            await removeStudentFromCourse(enr.id);
                            setEnrollments(enrollments.filter(e => e.id !== enr.id));
                            toast.success('Student removed');
                          } catch (e) {
                            toast.error('Failed to remove student');
                          }
                        }}>
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {enrollments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No students enrolled yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
