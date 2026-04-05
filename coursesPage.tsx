import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCourses, seedDummyCourses } from './firestoreService';
import { Course, User } from './models';
import { Card, Loader, Input, Button } from './widgets';
import { Search, Star, Clock, BookOpen, Filter } from 'lucide-react';
import { motion } from 'motion/react';

export const CoursesPage = ({ currentUser }: { currentUser: User }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      // Seed dummy data if needed
      await seedDummyCourses(currentUser.uid, currentUser.name);
      
      const fetchedCourses = await getCourses();
      setCourses(fetchedCourses);
      setLoading(false);
    };
    fetchCourses();
  }, [currentUser]);

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-3xl p-8 sm:p-12 mb-8 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight">Master New Skills</h1>
          <p className="text-lg text-indigo-100 mb-8">Join thousands of learners and advance your career with our professional courses.</p>
          <div className="flex gap-4">
            <Button className="bg-white text-indigo-900 hover:bg-gray-100 px-8 py-3 rounded-full text-lg font-bold">Explore Courses</Button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full transform translate-x-1/4 -translate-y-1/4">
            <path fill="#FFFFFF" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18.1,95.8,-3.2C94.8,11.7,86.8,26.1,76.5,38.4C66.2,50.7,53.6,60.9,39.8,68.4C26,75.9,11,80.7,-3.6,86.8C-18.2,92.9,-32.4,100.3,-45.2,95.5C-58,90.7,-69.4,73.7,-77.8,58.3C-86.2,42.9,-91.6,29.1,-94.1,14.8C-96.6,0.5,-96.2,-14.3,-90.6,-27.1C-85,-39.9,-74.2,-50.7,-61.6,-58.5C-49,-66.3,-34.6,-71.1,-20.9,-75.4C-7.2,-79.7,5.8,-83.5,20.6,-83.4C35.4,-83.3,47.9,-79.3,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <Input 
            placeholder="Search for courses, skills, or instructors..." 
            className="pl-10 h-12 text-base rounded-2xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-12 rounded-2xl px-6 flex items-center gap-2">
          <Filter size={20} /> Filters
        </Button>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader /></div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
          <BookOpen className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={course.id}
            >
              <Link to={`/course/${course.id}`} className="block h-full">
                <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-300 border-0 shadow-md group">
                  <div className="relative aspect-video overflow-hidden">
                    <img 
                      src={course.thumbnailURL} 
                      alt={course.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 flex gap-2">
                      {course.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="bg-white/90 backdrop-blur-sm text-indigo-700 text-xs font-bold px-2 py-1 rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">{course.instructorName}</p>
                    
                    <div className="flex items-center gap-1 mb-4">
                      <span className="font-bold text-amber-500">{course.rating.toFixed(1)}</span>
                      <div className="flex text-amber-400">
                        <Star size={14} fill="currentColor" />
                        <Star size={14} fill="currentColor" />
                        <Star size={14} fill="currentColor" />
                        <Star size={14} fill="currentColor" />
                        <Star size={14} fill="currentColor" />
                      </div>
                      <span className="text-xs text-gray-400 ml-1">({course.totalReviews})</span>
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-extrabold text-xl text-gray-900">
                        {course.price === 0 ? 'Free' : `৳ ${course.price}`}
                      </span>
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        {course.level}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
