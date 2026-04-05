import React from 'react';
import { Card } from './widgets';
import { Bell } from 'lucide-react';

export const NotificationsPage = () => {
  // Placeholder for notifications
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Notifications</h1>
        <p className="text-gray-500">Stay updated with your network</p>
      </div>

      <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bell className="h-8 w-8 text-indigo-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">You're all caught up!</h3>
        <p className="text-gray-500 max-w-sm mx-auto">There are no new notifications right now. Check back later for updates from your friends.</p>
      </div>
    </div>
  );
};
