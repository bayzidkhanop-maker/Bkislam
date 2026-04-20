import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCourse, getCourseModules, getModuleLessons, getEnrollment, enrollInCourse, purchaseCourseWithWallet, getCourseReviews, createReview, validateCoupon, getPlatformSettings } from './firestoreService';
import { uploadMedia } from './storageService';
import { Course, CourseModule, Lesson, Enrollment, User, Review, PlatformSettings } from './models';
import { Card, Loader, Button, Input } from './widgets';
import { Star, Clock, BookOpen, PlayCircle, CheckCircle, Users, Globe, ChevronDown, ChevronUp, Lock, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const CourseDetailsPage = ({ currentUser }: { currentUser: User }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({});
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Wallet'>('Wallet');
  const [transactionId, setTransactionId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId) return;
      setLoading(true);
      try {
        const fetchedCourse = await getCourse(courseId);
        if (fetchedCourse) {
          setCourse(fetchedCourse);
          const fetchedModules = await getCourseModules(courseId);
          setModules(fetchedModules);
          
          const lessonsMap: Record<string, Lesson[]> = {};
          for (const mod of fetchedModules) {
            const lessons = await getModuleLessons(mod.id);
            lessonsMap[mod.id] = lessons;
          }
          setLessonsByModule(lessonsMap);

          const fetchedReviews = await getCourseReviews(courseId);
          setReviews(fetchedReviews);

          if (currentUser) {
            const fetchedEnrollment = await getEnrollment(currentUser.uid, courseId);
            setEnrollment(fetchedEnrollment);
          }

          const platformSettings = await getPlatformSettings();
          setSettings(platformSettings);

          // Expand first module by default
          if (fetchedModules.length > 0) {
            setExpandedModules({ [fetchedModules[0].id]: true });
          }
        }
      } catch (error) {
        console.error("Error fetching course details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourseData();
  }, [courseId, currentUser]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleEnroll = async () => {
    if (!course || !currentUser) return;
    
    if (course.price === 0) {
      // Direct enroll for free courses
      setEnrolling(true);
      const toastId = toast.loading('Enrolling...');
      try {
        await enrollInCourse(currentUser.uid, course.id, 0, 'Free', '');
        toast.success('Successfully enrolled!', { id: toastId });
        navigate(`/learn/${course.id}`);
      } catch (error) {
        toast.error('Enrollment failed.', { id: toastId });
      } finally {
        setEnrolling(false);
      }
    } else {
      setShowPaymentModal(true);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !course) return;
    setValidatingCoupon(true);
    setCouponError('');
    try {
      const res = await validateCoupon(couponCode, currentUser.uid, course.price, course.id, course.category);
      if (res.isValid && res.coupon) {
        setAppliedCoupon({ code: res.coupon.code, discountAmount: res.discountAmount });
        toast.success(`Coupon applied! You saved ৳${res.discountAmount}`);
      } else {
        setAppliedCoupon(null);
        setCouponError(res.error || 'Invalid coupon');
        toast.error(res.error || 'Invalid coupon');
      }
    } catch (e: any) {
      setCouponError('Error validating coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const submitPayment = async () => {
    if (!course || !currentUser) return;

    let finalAmount = course.price;
    if (appliedCoupon) {
      finalAmount = Math.max(0, finalAmount - appliedCoupon.discountAmount);
    }

    if (paymentMethod === 'Wallet') {
      if ((currentUser.walletBalance || 0) < finalAmount) {
        toast.error("Insufficient wallet balance. Please add money first.");
        return;
      }
      setEnrolling(true);
      const toastId = toast.loading('Processing payment...');
      try {
        await purchaseCourseWithWallet(currentUser.uid, course.id, course.price, appliedCoupon?.code);
        toast.success('Payment successful! You are now enrolled.', { id: toastId });
        setShowPaymentModal(false);
        navigate(`/learn/${course.id}`);
      } catch (error: any) {
        toast.error(error.message || 'Payment failed.', { id: toastId });
      } finally {
        setEnrolling(false);
      }
      return;
    }

    if (!transactionId.trim() && finalAmount > 0) {
      toast.error('Please enter a valid Transaction ID');
      return;
    }

    setEnrolling(true);
    const toastId = toast.loading('Submitting payment...');
    try {
      let proofUrl = undefined;
      if (proofFile) {
        toast.loading('Uploading screenshot...', { id: toastId });
        proofUrl = await uploadMedia(proofFile, `transactions/${currentUser.uid}/${Date.now()}_${proofFile.name}`);
      }

      toast.loading('Finalizing enrollment...', { id: toastId });
      await enrollInCourse(currentUser.uid, course.id, finalAmount, paymentMethod, transactionId, proofUrl);
      
      toast.success('Payment submitted! Awaiting admin approval.', { id: toastId });
      setShowPaymentModal(false);
      setProofFile(null);
      setTransactionId('');
      // Refresh enrollment status
      const fetchedEnrollment = await getEnrollment(currentUser.uid, course.id);
      setEnrollment(fetchedEnrollment);
    } catch (error) {
      toast.error('Payment submission failed.', { id: toastId });
    } finally {
      setEnrolling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!currentUser || !course) {
      toast.error("Please log in to submit a review.");
      return;
    }
    if (!newReviewComment.trim()) {
      toast.error("Please write a comment.");
      return;
    }
    setSubmittingReview(true);
    try {
      const review = await createReview({
        courseId: course.id,
        userId: currentUser.uid,
        userName: currentUser.name || 'Anonymous',
        rating: newReviewRating,
        comment: newReviewComment
      });
      setReviews([review, ...reviews]);
      setNewReviewComment('');
      setNewReviewRating(5);
      toast.success("Review submitted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader /></div>;
  if (!course) return <div className="text-center py-20 text-gray-500">Course not found.</div>;

  const totalLessons = Object.values(lessonsByModule).reduce((acc, lessons) => acc + lessons.length, 0);
  const totalDuration = Object.values(lessonsByModule).reduce((acc, lessons) => acc + lessons.reduce((sum, l) => sum + l.duration, 0), 0);

  return (
    <div className="bg-white min-h-screen pb-24">
      {/* Dark Hero Section */}
      <div className="bg-gray-900 text-white pt-12 pb-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
          <div className="lg:col-span-2">
            <div className="flex gap-2 mb-4">
              {course.tags.map(tag => (
                <span key={tag} className="text-indigo-300 text-sm font-semibold">{tag} &gt;</span>
              ))}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">{course.title}</h1>
            {course.subtitle && <p className="text-xl text-gray-200 mb-4 font-medium">{course.subtitle}</p>}
            <p className="text-lg text-gray-300 mb-6">{course.description}</p>
            
            <div className="flex flex-wrap items-center gap-4 text-sm mb-6">
              <div className="flex items-center gap-1 text-amber-400">
                <span className="font-bold">{course.rating.toFixed(1)}</span>
                <Star size={16} fill="currentColor" />
                <span className="text-gray-400 underline ml-1">({course.totalReviews} ratings)</span>
              </div>
              <div className="flex items-center gap-1 text-gray-300">
                <Users size={16} /> {course.studentsCount} students
              </div>
              <div className="flex items-center gap-1 text-gray-300">
                <Globe size={16} /> {course.language}
              </div>
            </div>
            <div className="text-sm text-gray-300">
              Created by <span className="text-indigo-400 font-semibold underline cursor-pointer">{course.instructorName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative -mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="p-6 sm:p-8 mb-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">What you'll learn</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(course.whatYouWillLearn || ['Master the core concepts', 'Build real-world projects', 'Apply best practices', 'Prepare for certification']).map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle size={20} className="text-green-500 shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 sm:p-8 mb-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Content</h2>
              <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span>{modules.length} sections • {totalLessons} lectures • {Math.floor(totalDuration / 60)}h {totalDuration % 60}m total length</span>
                <button className="text-indigo-600 font-semibold hover:underline" onClick={() => {
                  const allExpanded = Object.keys(expandedModules).length === modules.length;
                  const newState: Record<string, boolean> = {};
                  modules.forEach(m => newState[m.id] = !allExpanded);
                  setExpandedModules(newState);
                }}>
                  {Object.keys(expandedModules).length === modules.length ? 'Collapse all sections' : 'Expand all sections'}
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {modules.map((module, index) => (
                  <div key={module.id} className="border-b border-gray-200 last:border-b-0">
                    <button 
                      className="w-full bg-gray-50 hover:bg-gray-100 p-4 flex justify-between items-center transition-colors"
                      onClick={() => toggleModule(module.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedModules[module.id] ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                        <span className="font-bold text-gray-900">{module.title}</span>
                      </div>
                      <span className="text-sm text-gray-500">{lessonsByModule[module.id]?.length || 0} lectures</span>
                    </button>
                    
                    <AnimatePresence>
                      {expandedModules[module.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-white"
                        >
                          <div className="p-2">
                            {lessonsByModule[module.id]?.map(lesson => (
                              <div key={lesson.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-md group">
                                <div className="flex items-center gap-3">
                                  {lesson.type === 'video' ? <PlayCircle size={16} className="text-gray-400" /> : <BookOpen size={16} className="text-gray-400" />}
                                  <span className={`text-sm ${lesson.isFreePreview ? 'text-indigo-600 font-medium cursor-pointer hover:underline' : 'text-gray-700'}`}>
                                    {lesson.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  {lesson.isFreePreview && <span className="text-xs font-bold text-gray-400 uppercase">Preview</span>}
                                  <span>{lesson.duration} min</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 sm:p-8 mb-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Requirements</h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                {(course.requirements || ['No prior experience required', 'Basic understanding of the subject matter']).map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </Card>

            <Card className="p-6 sm:p-8 mb-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Star className="text-amber-400" fill="currentColor" size={24} />
                Course Reviews
              </h2>
              
              {/* Add Review Form */}
              {enrollment && enrollment.status === 'active' && (
                <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-3">Leave a Review</h3>
                  <div className="flex items-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        size={24} 
                        className={`cursor-pointer ${star <= newReviewRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                        onClick={() => setNewReviewRating(star)}
                      />
                    ))}
                  </div>
                  <textarea 
                    className="w-full p-3 border border-gray-200 rounded-lg mb-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                    rows={3}
                    placeholder="Share your experience with this course..."
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                  />
                  <Button onClick={handleSubmitReview} disabled={submittingReview}>
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              )}

              {/* Reviews List */}
              <div className="space-y-6">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                            {review.userName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{review.userName}</p>
                            <div className="flex items-center text-amber-400">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={14} className={i < review.rating ? 'fill-amber-400' : 'text-gray-300'} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-700 mt-3">{review.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No reviews yet. Be the first to review this course!
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Floating Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="overflow-hidden shadow-xl border-0 ring-1 ring-gray-200">
                <div className="relative aspect-video group cursor-pointer" onClick={() => {
                  if (course.promoVideoURL) {
                    window.open(course.promoVideoURL, '_blank');
                  } else {
                    toast.info("No promo video available.");
                  }
                }}>
                  <img src={course.thumbnailURL} alt={course.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle size={64} className="text-white" />
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 text-center text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    Preview this course
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-3xl font-extrabold text-gray-900 mb-6">
                    {course.price === 0 ? 'Free' : `৳ ${course.price}`}
                  </div>

                  {enrollment ? (
                    enrollment.status === 'active' ? (
                      <Button className="w-full py-4 text-lg font-bold mb-4" onClick={() => navigate(`/learn/${course.id}`)}>
                        Go to Course
                      </Button>
                    ) : (
                      <Button className="w-full py-4 text-lg font-bold mb-4 bg-amber-500 hover:bg-amber-600 text-white" disabled>
                        Payment Pending Approval
                      </Button>
                    )
                  ) : (
                    <Button 
                      className="w-full py-4 text-lg font-bold mb-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={handleEnroll}
                      disabled={enrolling}
                    >
                      {enrolling ? 'Processing...' : 'Enroll Now'}
                    </Button>
                  )}

                  <p className="text-xs text-center text-gray-500 mb-6">30-Day Money-Back Guarantee</p>

                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900">This course includes:</h4>
                    <ul className="space-y-3 text-sm text-gray-600">
                      <li className="flex items-center gap-3"><PlayCircle size={16} /> {Math.floor(totalDuration / 60)} hours on-demand video</li>
                      <li className="flex items-center gap-3"><BookOpen size={16} /> 12 articles</li>
                      <li className="flex items-center gap-3"><CheckCircle size={16} /> Full lifetime access</li>
                      <li className="flex items-center gap-3"><Star size={16} /> Certificate of completion</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Complete Payment</h2>
              <p className="text-sm text-gray-500">Pay ৳ {course.price} to enroll</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex gap-2">
                <button 
                  className={`flex-1 py-2 rounded-xl border-2 font-bold transition-colors ${paymentMethod === 'Wallet' ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  onClick={() => setPaymentMethod('Wallet')}
                >
                  Wallet
                </button>
                <button 
                  className={`flex-1 py-2 rounded-xl border-2 font-bold transition-colors ${paymentMethod === 'bKash' ? 'border-pink-500 text-pink-600 bg-pink-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  onClick={() => setPaymentMethod('bKash')}
                >
                  bKash
                </button>
                <button 
                  className={`flex-1 py-2 rounded-xl border-2 font-bold transition-colors ${paymentMethod === 'Nagad' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  onClick={() => setPaymentMethod('Nagad')}
                >
                  Nagad
                </button>
              </div>

              {paymentMethod === 'Wallet' ? (
                <div className="bg-indigo-50 p-4 rounded-xl text-sm text-indigo-800 border border-indigo-100">
                  <p className="font-bold mb-1">Pay with Wallet Balance</p>
                  <p>Current Balance: ৳ {(currentUser?.walletBalance || 0).toFixed(2)}</p>
                  {(currentUser?.walletBalance || 0) < (appliedCoupon ? Math.max(0, course.price - appliedCoupon.discountAmount) : course.price) && (
                    <p className="text-red-500 mt-2 font-semibold">Insufficient balance. Please add money to your wallet first.</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 whitespace-pre-line">
                    <p className="mb-2">1. Send <strong>৳ {appliedCoupon ? Math.max(0, course.price - appliedCoupon.discountAmount) : course.price}</strong> to this {paymentMethod} Personal number:</p>
                    <p className="text-lg font-bold text-gray-900 mb-4 tracking-wider">
                      {paymentMethod === 'bKash' ? settings?.financial?.bKashNumber || 'Not configured' : 
                       paymentMethod === 'Nagad' ? settings?.financial?.nagadNumber || 'Not configured' : 
                       'Not configured'}
                    </p>
                    <p>{settings?.financial?.paymentInstructions || '2. Enter the Transaction ID below to verify your payment.'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Transaction ID</label>
                    <Input 
                      placeholder="e.g. 9X2A4B..." 
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Screenshot (Optional)</label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                        <UploadCloud className="mx-auto text-gray-400 mb-2" size={24} />
                        <span className="text-sm text-gray-500">{proofFile ? proofFile.name : 'Upload Screenshot'}</span>
                        <input type="file" className="hidden" accept="image/*" onChange={e => setProofFile(e.target.files?.[0] || null)} />
                      </label>
                      {proofFile && (
                        <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg" onClick={() => setProofFile(null)}>Clear</button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Coupon Section */}
              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Have a Coupon?</label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter code" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={appliedCoupon !== null || validatingCoupon}
                  />
                  {!appliedCoupon ? (
                    <Button variant="outline" onClick={handleApplyCoupon} disabled={!couponCode || validatingCoupon}>
                      {validatingCoupon ? '...' : 'Apply'}
                    </Button>
                  ) : (
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>
                      Remove
                    </Button>
                  )}
                </div>
                {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
                
                <div className="mt-4 bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                   <span className="text-gray-600 font-medium">Total Payable:</span>
                   <span className="text-lg font-bold text-gray-900">
                     ৳ {appliedCoupon ? Math.max(0, course.price - appliedCoupon.discountAmount).toFixed(2) : course.price.toFixed(2)}
                   </span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submitPayment} disabled={enrolling}>
                {enrolling ? 'Submitting...' : 'Submit Payment'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
