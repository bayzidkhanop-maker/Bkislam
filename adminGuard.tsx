import React from 'react';
import { Navigate } from 'react-router-dom';
import { User } from './models';
import { ROLES } from './constants';

interface AdminGuardProps {
  user: User | null;
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/login" />;
  }
  if (user.role !== ROLES.ADMIN) {
    return <Navigate to="/" />;
  }
  return <>{children}</>;
};
