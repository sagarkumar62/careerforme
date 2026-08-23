'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LearnerProfile } from '@/types';
import { api } from '@/lib/api';

import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  profile: LearnerProfile | null;
  loading: boolean;
  updateUserAndProfile: (
    userData: { name?: string; avatar?: string },
    profileData: Partial<LearnerProfile>
  ) => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  updateUserAndProfile: async () => {},
  changePassword: async () => {},
  refreshAuth: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserAndProfile = async () => {
    try {
      setLoading(true);
      const currentUser = await api.getCurrentUser();
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        return;
      }
      const currentProfile = await api.getProfile();
      setUser(currentUser);
      setProfile(currentProfile);
    } catch (error) {
      console.warn('[AuthProvider] Unauthenticated or session expired:', error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndProfile();

    const handleSessionExpired = () => {
      setUser(null);
      setProfile(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:session-expired', handleSessionExpired);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:session-expired', handleSessionExpired);
      }
    };
  }, []);

  const updateUserAndProfile = async (
    userData: { name?: string; avatar?: string },
    profileData: Partial<LearnerProfile>
  ) => {
    try {
      let updatedUser = user;
      let updatedProfile = profile;

      if (userData && (userData.name !== undefined || userData.avatar !== undefined)) {
        updatedUser = await api.updateUser(userData);
        setUser(updatedUser);
      }

      if (profileData && Object.keys(profileData).length > 0) {
        updatedProfile = await api.saveProfile(profileData);
        setProfile(updatedProfile);
      }

      // Sync across all app sections by invalidating React Query caches
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['skill-gap'] });
      queryClient.invalidateQueries({ queryKey: ['career'] });
    } catch (error: any) {
      console.error('[AuthProvider] Failed to update user profile:', error);
      if (error?.response?.status === 401) {
        setUser(null);
        setProfile(null);
      }
      throw error;
    }
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    await api.changePassword(currentPass, newPass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        updateUserAndProfile,
        changePassword,
        refreshAuth: fetchUserAndProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

