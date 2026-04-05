import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from './authService';
import { initDB } from './localStorageService';
import { User } from './models';
import { Loader } from './widgets';

import { LoginPage } from './loginPage';
import { UserPanel } from './userPanel';
import { AdminPanel } from './adminPanel';
import { AdminGuard } from './adminGuard';
import { HomePage } from './homePage';
import { ProfilePage } from './profilePage';
import { UploadPage } from './uploadPage';
import { PostDetailsPage } from './postDetailsPage';
import { SearchPage } from './searchPage';
import { NotificationsPage } from './notificationsPage';
import { SettingsPage } from './settingsPage';
import { ReportPage } from './reportPage';

import { CoursesPage } from './coursesPage';
import { CourseDetailsPage } from './courseDetailsPage';
import { LearningPage } from './learningPage';
import { WalletPage } from './walletPage';

import { TournamentsPage } from './TournamentsPage';
import { TournamentDetailsPage } from './TournamentDetailsPage';
import { TournamentManagePage } from './TournamentManagePage';
import { TournamentCreatePage } from './TournamentCreatePage';

export const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initDB();
    const unsubscribe = onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        
        <Route path="/admin" element={
          <AdminGuard user={user}>
            <AdminPanel />
          </AdminGuard>
        } />

        {user ? (
          <Route path="/" element={<UserPanel user={user} />}>
            <Route index element={<HomePage currentUser={user} />} />
            <Route path="profile/:uid" element={<ProfilePage />} />
            <Route path="upload" element={<UploadPage currentUser={user} />} />
            <Route path="post/:postId" element={<PostDetailsPage currentUser={user} />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage currentUser={user} />} />
            <Route path="report/:postId" element={<ReportPage currentUser={user} />} />
            <Route path="courses" element={<CoursesPage currentUser={user} />} />
            <Route path="course/:courseId" element={<CourseDetailsPage currentUser={user} />} />
            <Route path="learn/:courseId" element={<LearningPage currentUser={user} />} />
            <Route path="wallet" element={<WalletPage currentUser={user} />} />
            <Route path="tournaments" element={<TournamentsPage currentUser={user} />} />
            <Route path="tournaments/create" element={<TournamentCreatePage currentUser={user} />} />
            <Route path="tournaments/:id" element={<TournamentDetailsPage currentUser={user} />} />
            <Route path="tournaments/:id/manage" element={<TournamentManagePage currentUser={user} />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </BrowserRouter>
  );
};
