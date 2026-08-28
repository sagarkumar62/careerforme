import axios from 'axios';
import {
  User,
  LearnerProfile,
  CareerRecommendation,
  CareerComparison,
  AIProject,
  AIResource,
  FlowchartData,
  SkillGapAnalysis,
  Roadmap,
  UserProgress,
  DashboardData,
  AIMessage,
  Conversation
} from '@/types';

export interface LearningPathProgress {
  total_courses: number;
  completed_courses: number;
  overall_progress: number;
  total_milestones: number;
  completed_milestones: number;
  current_milestone: string | null;
  next_course_id: string | null;
}

export interface LearningPathCourseItem {
  id: string;
  course_id?: string;
  title: string;
  provider?: string;
  match_score?: number;
  reason?: string;
  status?: 'completed' | 'in_progress' | 'available' | 'locked';
  is_completed?: boolean;
  is_next?: boolean;
}

export interface LearningPathProjectItem {
  id: string;
  project_id?: string;
  title: string;
  description?: string;
  reason?: string;
  match_score?: number;
  status?: 'completed' | 'available' | 'locked';
  is_completed?: boolean;
  is_locked?: boolean;
  missing_prerequisites?: string[];
}

export interface LearningPathAssessmentItem {
  id: string;
  assessment_id?: string;
  title: string;
  description?: string;
  reason?: string;
  readiness_state?: 'eligible' | 'locked' | 'completed';
  status?: 'completed' | 'eligible' | 'locked';
  is_completed?: boolean;
  is_locked?: boolean;
  missing_skills?: string[];
  last_score?: number;
}

export interface LearningPathMilestone {
  milestone_id: string;
  title: string;
  description: string;
  dependency_depth: number;
  course_ids: string[];
  courses?: (string | LearningPathCourseItem)[];
  skills: string[];
  estimated_hours: number;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  completed_course_ids: string[];
  remaining_course_ids: string[];
  next_course_id: string | null;
  project_ids: string[];
  projects?: (string | LearningPathProjectItem)[];
  assessment_ids: string[];
  assessments?: (string | LearningPathAssessmentItem)[];
}

export interface LearningPathResponse {
  success: boolean;
  goal: string;
  status?: 'active' | 'completed' | 'no_recommendations' | string;
  reason?: string;
  total_courses: number;
  total_milestones: number;
  courses: (string | LearningPathCourseItem)[];
  milestones: LearningPathMilestone[];
  progress: LearningPathProgress;
}

const getNormalizedApiUrl = (): string => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';
  const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
  if (cleanUrl.endsWith('/api/v1')) {
    return cleanUrl;
  }
  return `${cleanUrl}/api/v1`;
};

const BASE_URL = getNormalizedApiUrl();

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 20000
});

// Attach JWT access token if present in memory/sessionStorage
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for automatic 401 token refresh & transparent single retry
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and request has not been retried yet
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      if (originalRequest.url?.includes('/auth/refresh')) {
        // If refresh token request itself returned 401, clear session and reject
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('token');
          delete apiClient.defaults.headers.common.Authorization;
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        }
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(apiClient(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            }
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshResponse = await apiClient.post('/auth/refresh');
        const data = unwrapData<{ accessToken: string }>(refreshResponse.data);
        const newAccessToken = data?.accessToken;

        if (newAccessToken && typeof window !== 'undefined') {
          sessionStorage.setItem('token', newAccessToken);
          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('token');
          delete apiClient.defaults.headers.common.Authorization;
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper for unwrapping ApiResponse wrapper { statusCode, data, message, success }
function unwrapData<T>(responseData: any): T {
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return responseData.data as T;
  }
  return responseData as T;
}

export const api = {
  // Auth
  async getCurrentUser(): Promise<User | null> {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('token')) {
      return null;
    }
    try {
      const response = await apiClient.get('/auth/me');
      const data = unwrapData<{ user: any } | any>(response.data);
      const rawUser = data.user || data;
      if (!rawUser || !rawUser.email) return null;
      return {
        id: rawUser.id || rawUser._id?.toString() || rawUser._id,
        _id: rawUser._id?.toString() || rawUser.id,
        name: rawUser.name,
        email: rawUser.email,
        role: rawUser.role || 'user',
        avatar: rawUser.avatar || '',
        createdAt: rawUser.createdAt
      } as any;
    } catch (error: any) {
      return null;
    }
  },

  async login(email: string, pass: string): Promise<{ user: User; accessToken?: string }> {
    try {
      const response = await apiClient.post('/auth/login', { email, password: pass });
      const data = unwrapData<{ user: User; accessToken?: string }>(response.data);
      if (data.accessToken && typeof window !== 'undefined') {
        sessionStorage.setItem('token', data.accessToken);
      }
      return data;
    } catch (error: any) {
      if (!error.response) {
        throw new Error('Unable to connect to authentication server. Please ensure the backend server is running.');
      }
      throw error;
    }
  },

  async register(data: { name: string; email: string; password: string }): Promise<{ user: User; accessToken?: string }> {
    try {
      const response = await apiClient.post('/auth/register', data);
      const resData = unwrapData<{ user: User; accessToken?: string }>(response.data);
      if (resData.accessToken && typeof window !== 'undefined') {
        sessionStorage.setItem('token', resData.accessToken);
      }
      return resData;
    } catch (error: any) {
      if (!error.response) {
        throw new Error('Unable to connect to authentication server. Please ensure the backend server is running.');
      }
      throw error;
    }
  },

  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('token');
    }
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore
    }
  },

  async updateUser(data: { name?: string; avatar?: string }): Promise<User> {
    const response = await apiClient.patch('/auth/me', data);
    const res = unwrapData<{ user: User } | User>(response.data);
    return (res as any).user || (res as User);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await apiClient.put('/auth/change-password', { currentPassword, newPassword });
    return unwrapData<void>(response.data);
  },

  // Profile & Onboarding
  async getProfile(): Promise<LearnerProfile | null> {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('token')) {
      return null;
    }
    try {
      const response = await apiClient.get('/profile');
      const res = unwrapData<{ profile: LearnerProfile } | LearnerProfile>(response.data);
      return (res as any).profile || (res as LearnerProfile);
    } catch (error) {
      return null;
    }
  },


  async saveProfile(profile: Partial<LearnerProfile>): Promise<LearnerProfile> {
    const response = await apiClient.post('/profile', profile);
    const res = unwrapData<{ profile: LearnerProfile } | LearnerProfile>(response.data);
    return (res as any).profile || (res as LearnerProfile);
  },

  async deleteProfile(): Promise<boolean> {
    try {
      await apiClient.delete('/profile');
      return true;
    } catch (error) {
      console.error('[API] Error deleting profile:', error);
      return false;
    }
  },

  // Recommendations & AI Career Decision Engine
  async getRecommendations(): Promise<CareerRecommendation[]> {
    try {
      const response = await apiClient.get('/ai/careers/recommend');
      const res = unwrapData<{ recommendations: CareerRecommendation[]; topMatch?: CareerRecommendation; alternatives?: CareerRecommendation[] }>(response.data);
      return (res as any).recommendations || (Array.isArray(res) ? res : []);
    } catch (error) {
      try {
        const fallback = await apiClient.get('/recommendations');
        const res = unwrapData<{ recommendations: CareerRecommendation[] } | CareerRecommendation[]>(fallback.data);
        return (res as any).recommendations || (Array.isArray(res) ? res : []);
      } catch (err) {
        return [];
      }
    }
  },

  async compareCareers(careerIds: string[]): Promise<CareerComparison[]> {
    try {
      const response = await apiClient.post('/ai/careers/compare', { careerIds });
      const res = unwrapData<{ comparisons: CareerComparison[] }>(response.data);
      return (res as any).comparisons || [];
    } catch (error) {
      return [];
    }
  },

  async getProjectRecommendations(selectedCareer?: string, missingSkills?: string[]): Promise<AIProject[]> {
    try {
      const response = await apiClient.post('/ai/projects/recommend', { selectedCareer, missingSkills });
      const res = unwrapData<{ projects: AIProject[] }>(response.data);
      return (res as any).projects || [];
    } catch (error) {
      return [];
    }
  },

  async getResourceRecommendations(skills?: string[], selectedCareer?: string): Promise<AIResource[]> {
    try {
      const response = await apiClient.post('/ai/resources/recommend', { skills, selectedCareer });
      const res = unwrapData<{ resources: AIResource[] }>(response.data);
      return (res as any).resources || [];
    } catch (error) {
      return [];
    }
  },

  async getFlowchartData(role: string): Promise<FlowchartData> {
    try {
      const response = await apiClient.post('/ai/flowchart/generate', { role });
      const res = unwrapData<FlowchartData>(response.data);
      return res || { nodes: [], edges: [] };
    } catch (error) {
      return { nodes: [], edges: [] };
    }
  },


  async getRecommendationById(id: string): Promise<CareerRecommendation | null> {
    try {
      const response = await apiClient.get(`/recommendations/${id}`);
      const res = unwrapData<{ career: CareerRecommendation } | CareerRecommendation>(response.data);
      const raw: any = (res as any)?.career || res;
      if (!raw) return null;

      const title = raw.title || raw.career || 'Career Role';
      const whyMatches = Array.isArray(raw.whyMatches) && raw.whyMatches.length > 0
        ? raw.whyMatches
        : Array.isArray(raw.reasons) && raw.reasons.length > 0
          ? raw.reasons
          : [
            'Core technical requirements align with your learning goals.',
            'High industry demand and strong advancement opportunities.',
            'Structured transition path tailored to your skillset.'
          ];

      const skillGaps = Array.isArray(raw.skillGaps) ? raw.skillGaps : [];

      const keyResponsibilities = Array.isArray(raw.keyResponsibilities) && raw.keyResponsibilities.length > 0
        ? raw.keyResponsibilities
        : [
          'Design, build, and deploy production software components.',
          'Collaborate with cross-functional product teams on technical specifications.',
          'Optimize system performance, reliability, and security standards.',
          'Maintain comprehensive documentation and unit test coverage.'
        ];

      return {
        id: raw.id || id,
        title,
        matchScore: raw.matchScore ?? 85,
        difficulty: raw.difficulty || 'Intermediate',
        estimatedTransition: raw.estimatedTransition || '6 Months',
        description: raw.description || `Comprehensive career pathway for ${title}.`,
        whyMatches,
        skillGaps,
        keyResponsibilities,
        averageSalary: raw.averageSalary || '$125,000 / yr'
      };
    } catch (error) {
      return null;
    }
  },

  async getSkillGap(targetCareer?: string): Promise<SkillGapAnalysis | null> {
    try {
      const response = await apiClient.post('/recommendations/skill-gap', { targetCareer });
      const res = unwrapData<{ skillGap: SkillGapAnalysis } | SkillGapAnalysis>(response.data);
      return (res as any).skillGap || (res as SkillGapAnalysis) || null;
    } catch (error) {
      return null;
    }
  },

  // Roadmap API
  normalizeRoadmap(rawRoadmap: any): Roadmap {
    const phases = Array.isArray(rawRoadmap?.phases)
      ? rawRoadmap.phases.map((phase: any, phaseIdx: number) => {
        const milestones = Array.isArray(phase.milestones)
          ? phase.milestones.map((m: any) => ({
            id: m.milestoneId || m._id || m.id || `m_${phaseIdx}`,
            title: m.title || 'Milestone',
            description: m.description || '',
            estimatedHours: m.estimatedHours ?? 10,
            completed: m.completed ?? false,
            resourceType: m.resources?.[0]?.type || 'Course',
            resourceUrl: m.resources?.[0]?.url || '#'
          }))
          : [];

        let resources = Array.isArray(phase.milestones)
          ? phase.milestones.flatMap((m: any) =>
            Array.isArray(m.resources)
              ? m.resources.map((r: any, rIdx: number) => ({
                id: `${m.milestoneId || phaseIdx}_res_${rIdx}`,
                title: r.title || 'Resource',
                type: r.type || 'Course',
                duration: m.estimatedHours ? `${m.estimatedHours}h` : '2h',
                url: r.url || '#'
              }))
              : []
          )
          : [];

        const primarySkill = phase.skills?.[0] || (Array.isArray(phase.skillsCovered) && phase.skillsCovered[0]) || rawRoadmap.targetCareer || 'Core';

        const hasVideo = resources.some((r: any) => r.type === 'Video');
        const hasDocs = resources.some((r: any) => r.type === 'Docs' || r.type === 'Article');
        const hasProject = resources.some((r: any) => r.type === 'Project');

        if (!hasVideo) {
          resources.push({
            id: `res_vid_${phaseIdx}`,
            title: `${primarySkill} Video Course & Walkthrough`,
            type: 'Video',
            duration: '3h',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(primarySkill + ' course tutorial')}`
          });
        }

        if (!hasDocs) {
          resources.push({
            id: `res_docs_${phaseIdx}`,
            title: `${primarySkill} Official Documentation & Reference Guide`,
            type: 'Docs',
            duration: '1.5h',
            url: 'https://devdocs.io/'
          });
        }

        if (!hasProject) {
          resources.push({
            id: `res_proj_${phaseIdx}`,
            title: `${phase.title || primarySkill} Practical Hands-On Project`,
            type: 'Project',
            duration: '5h',
            url: `https://github.com/topics/${encodeURIComponent(primarySkill.toLowerCase().replace(/\s+/g, '-'))}`
          });
        }

        const completedCount = milestones.filter((m: any) => m.completed).length;
        const isCompleted = milestones.length > 0 && completedCount === milestones.length;
        const isCurrent = !isCompleted && phaseIdx === rawRoadmap.phases.findIndex((p: any) =>
          Array.isArray(p.milestones) && p.milestones.some((m: any) => !m.completed)
        );

        return {
          id: phase.phaseId || phase._id || `phase_${phaseIdx}`,
          phaseNumber: phaseIdx + 1,
          title: phase.title || `Phase ${phaseIdx + 1}`,
          summary: phase.description || phase.summary || '',
          durationWeeks: phase.estimatedWeeks ?? phase.durationWeeks ?? 4,
          skillsCovered: Array.isArray(phase.skills) ? phase.skills : [],
          milestones,
          resources,
          isCompleted,
          isCurrent,
          progressPercent: milestones.length > 0
            ? Math.round((completedCount / milestones.length) * 100)
            : 0
        };
      })
      : [];

    let nodes = Array.isArray(rawRoadmap.nodes) ? rawRoadmap.nodes : [];
    let edges = Array.isArray(rawRoadmap.edges) ? rawRoadmap.edges : [];

    if (nodes.length === 0 && phases.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Roadmap API] Graph nodes empty for roadmap "${rawRoadmap.title || rawRoadmap.targetCareer}", dynamically generating node DAG from phases.`);
      }
      let previousNodeId: string | null = null;
      let allPreviousCompleted = true;

      phases.forEach((phase: any, phaseIdx: number) => {
        const phaseId = phase.phaseId || phase.id || `phase-${phaseIdx + 1}`;
        const milestones = phase.milestones || [];

        milestones.forEach((m: any, mIdx: number) => {
          const milestoneId = m.milestoneId || m.id || `m_${phaseIdx + 1}_${mIdx + 1}`;
          const nodeId = `node_${phaseId}_${milestoneId}`;
          const isCompleted = !!m.completed;

          let status: 'MASTERED' | 'RECOMMENDED' | 'LOCKED' = 'LOCKED';
          if (isCompleted) {
            status = 'MASTERED';
          } else if (allPreviousCompleted) {
            status = 'RECOMMENDED';
            allPreviousCompleted = false;
          } else {
            status = 'LOCKED';
          }

          const categoryMap = ['foundation', 'core', 'intermediate', 'capstone'];
          const nodeType = categoryMap[phaseIdx] || 'core';
          const difficultyMap: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'capstone'> = {
            foundation: 'beginner',
            core: 'intermediate',
            intermediate: 'advanced',
            capstone: 'capstone'
          };

          nodes.push({
            nodeId,
            id: nodeId,
            title: m.title || `Milestone ${mIdx + 1}`,
            description: m.description || phase.summary || `Master ${m.title || 'milestone'} competencies.`,
            type: nodeType,
            difficulty: difficultyMap[nodeType] || 'intermediate',
            requiredLevel: 4,
            userLevel: isCompleted ? 4 : 0,
            skillGap: isCompleted ? 0 : 4,
            status,
            stateLabel: status,
            prerequisites: previousNodeId ? [previousNodeId] : [],
            resources: m.resources || [],
            topics: m.skills || phase.skillsCovered || []
          });

          if (previousNodeId) {
            edges.push({
              id: `edge_${previousNodeId}_${nodeId}`,
              source: previousNodeId,
              target: nodeId,
              type: 'prerequisite'
            });
          }

          previousNodeId = nodeId;
        });
      });
    }

    return {
      id: rawRoadmap._id || rawRoadmap.id || '',
      userId: rawRoadmap.userId || '',
      careerId: rawRoadmap.careerId || '',
      careerTitle: rawRoadmap.resolvedCareer || rawRoadmap.targetCareer || rawRoadmap.careerTitle || 'Target Career',
      requestedCareer: rawRoadmap.requestedCareer || rawRoadmap.targetCareer || '',
      resolvedCareer: rawRoadmap.resolvedCareer || rawRoadmap.targetCareer || '',
      domain: rawRoadmap.domain || 'technology',
      sourceProvider: rawRoadmap.sourceProvider || 'roadmap.sh',
      resolutionMethod: rawRoadmap.resolutionMethod || 'exact',
      totalDurationMonths: rawRoadmap.estimatedMonths ?? rawRoadmap.totalDurationMonths ?? Math.ceil((rawRoadmap.estimatedHours || 200) / 40),
      weeklyCommitmentHours: rawRoadmap.weeklyCommitmentHours ?? rawRoadmap.weeklyHours ?? 10,
      overallCompletionPercent: rawRoadmap.overallCompletionPercent ?? (() => {
        const allMilestones = phases.flatMap((p: any) => p.milestones);
        return allMilestones.length > 0
          ? Math.round((allMilestones.filter((m: any) => m.completed).length / allMilestones.length) * 100)
          : 0;
      })(),
      currentPhaseNumber: rawRoadmap.currentPhaseNumber ?? 1,
      nodes,
      edges,
      phases,
      adaptiveEvents: Array.isArray(rawRoadmap.adaptiveEvents) ? rawRoadmap.adaptiveEvents : [],
      profileVersion: rawRoadmap.profileVersion ?? 1,
      isStale: rawRoadmap.isStale ?? false,
      updatedAt: rawRoadmap.updatedAt || new Date().toISOString()
    };
  },

  async getRoadmaps(): Promise<Roadmap[]> {
    try {
      const response = await apiClient.get('/roadmaps');
      const raw = unwrapData<any>(response.data);
      const list = Array.isArray(raw) ? raw : raw?.roadmaps || (raw ? [raw] : []);
      return list.map((r: any) => this.normalizeRoadmap(r));
    } catch (error) {
      return [];
    }
  },

  async getRoadmap(roadmapId?: string): Promise<Roadmap | null> {
    try {
      const targetId = roadmapId || 'active';
      const response = await apiClient.get(`/roadmaps/${targetId}`);
      const raw = unwrapData<any>(response.data);
      if (!raw) return null;
      const rawRoadmap = (raw as any).roadmap || raw;
      return this.normalizeRoadmap(rawRoadmap);
    } catch (error) {
      return null;
    }
  },

  async getActiveRoadmap(): Promise<Roadmap | null> {
    return this.getRoadmap('active');
  },

  async getSupportedCareers(): Promise<{ count: number; careers: string[] }> {
    try {
      const response = await apiClient.get('/roadmaps/supported-careers');
      const res = unwrapData<{ count: number; careers: string[] }>(response.data);
      return res || { count: 0, careers: [] };
    } catch (error) {
      return { count: 0, careers: [] };
    }
  },

  async generateRoadmap(targetCareer: string): Promise<Roadmap | null> {
    try {
      const response = await apiClient.post('/roadmaps/generate', { targetCareer, careerId: targetCareer });
      const res = unwrapData<any>(response.data);
      const rawRoadmap = res?.roadmap || res;
      return this.normalizeRoadmap(rawRoadmap);
    } catch (error) {
      return null;
    }
  },

  async toggleMilestone(phaseId: string, milestoneId: string, roadmapId?: string): Promise<Roadmap | null> {
    try {
      const targetId = roadmapId || 'active';
      const response = await apiClient.patch(`/roadmaps/${targetId}`, { phaseId, milestoneId });
      const res = unwrapData<any>(response.data);
      const rawRoadmap = res?.roadmap || res;
      return this.normalizeRoadmap(rawRoadmap);
    } catch (error) {
      return null;
    }
  },

  async deleteRoadmap(roadmapId: string): Promise<boolean> {
    try {
      await apiClient.delete(`/roadmaps/${roadmapId}`);
      return true;
    } catch (error) {
      console.error('[API] Error deleting roadmap:', error);
      return false;
    }
  },

  // Dashboard
  async getDashboardData(): Promise<DashboardData | null> {
    try {
      const response = await apiClient.get('/dashboard');
      const raw = unwrapData<any>(response.data);

      if (!raw) return null;

      const user: User = {
        id: raw.user?.id || raw.user?._id || '',
        name: raw.user?.name || '',
        email: raw.user?.email || '',
        avatar: raw.user?.avatar || '',
        createdAt: raw.user?.createdAt || ''
      };

      const activeGoal = {
        careerId: raw.activeGoal?.careerId || raw.careerGoal?.careerId || '',
        title: raw.activeGoal?.title || raw.careerGoal?.targetCareer || raw.targetCareer || 'Career Goal',
        matchScore: raw.activeGoal?.matchScore ?? 0,
        estimatedMonths: raw.activeGoal?.estimatedMonths ?? 6
      };

      const currentProgress = {
        overallCompletionPercent: raw.currentProgress?.overallCompletionPercent ?? raw.progress?.overallCompletionPercent ?? 0,
        learningHours: raw.currentProgress?.learningHours ?? raw.progress?.totalLearningHours ?? 0,
        streakDays: raw.currentProgress?.streakDays ?? raw.progress?.streakDays ?? 0
      };

      const currentPhase = {
        phaseNumber: raw.currentPhase?.phaseNumber ?? 1,
        title: raw.currentPhase?.title || 'Phase 1',
        progressPercent: raw.currentPhase?.progressPercent ?? 0
      };

      const nextAction = {
        id: raw.nextAction?.id || '',
        title: raw.nextAction?.title || (raw.nextActions?.[0]?.label ?? 'No pending milestone'),
        phaseTitle: raw.nextAction?.phaseTitle || '',
        estimatedMinutes: raw.nextAction?.estimatedMinutes ?? 0,
        resourceType: raw.nextAction?.resourceType || ''
      };

      const skillGapSummary = {
        strong: raw.skillGapSummary?.strong ?? 0,
        needsWork: raw.skillGapSummary?.needsWork ?? 0,
        missing: raw.skillGapSummary?.missing ?? 0
      };

      const recommendedResources = Array.isArray(raw.recommendedResources) ? raw.recommendedResources : [];

      return {
        user,
        activeGoal,
        careerGoal: raw.careerGoal || { targetCareer: activeGoal.title },
        currentProgress,
        currentPhase,
        nextAction,
        nextActions: Array.isArray(raw.nextActions) ? raw.nextActions : [],
        skillGapSummary,
        skillGap: raw.skillGap || null,
        recommendedResources
      };
    } catch (error) {
      return null;
    }
  },

  // Progress
  async getProgress(roadmapId?: string): Promise<UserProgress | null> {
    try {
      const url = roadmapId ? `/progress/summary?roadmapId=${encodeURIComponent(roadmapId)}` : '/progress/summary';
      const response = await apiClient.get(url);
      const raw = unwrapData<any>(response.data);

      if (!raw) return null;

      const recentActivity = Array.isArray(raw.recentActivity)
        ? raw.recentActivity.map((item: any, idx: number) => ({
          id: item._id || item.id || `act_${idx}`,
          title: item.title || (item.milestoneId ? `Activity on ${item.milestoneId}` : 'Learning activity recorded'),
          type: item.type || (item.status === 'completed' ? 'Completed' : item.status === 'in_progress' ? 'In Progress' : 'Started'),
          status: item.status || 'in_progress',
          timestamp: item.updatedAt
            ? new Date(item.updatedAt).toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
            : 'Recently'
        }))
        : [];

      return {
        id: raw._id || raw.id || '',
        userId: raw.userId || '',
        activeRoadmapId: raw.activeRoadmapId || null,
        activeRoadmapTitle: raw.activeRoadmapTitle || null,
        totalLearningHours: raw.totalTimeSpentHours ?? raw.totalLearningHours ?? 0,
        currentStreakDays: raw.currentStreakDays ?? raw.streakDays ?? 0,
        completedMilestonesCount: raw.completedMilestones ?? raw.completedMilestonesCount ?? 0,
        totalMilestones: raw.totalMilestones ?? 0,
        remainingMilestones: raw.remainingMilestones ?? 0,
        overallPercentage: raw.overallPercentage ?? 0,
        acquiredSkillsCount: raw.acquiredSkillsCount ?? 0,
        completedProjectsCount: raw.completedProjectsCount ?? 0,
        phaseBreakdown: Array.isArray(raw.phaseBreakdown) ? raw.phaseBreakdown : [],
        recentActivity
      };
    } catch (error) {
      return null;
    }
  },

  // Assistant & Conversation API
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await apiClient.get('/conversation');
      const raw = unwrapData<any>(response.data);
      const list = Array.isArray(raw) ? raw : raw?.conversations || (raw ? [raw] : []);
      return list.map((c: any) => ({
        id: c._id || c.id,
        _id: c._id || c.id,
        userId: c.userId,
        title: c.title || 'Career Chat',
        updatedAt: c.updatedAt || new Date().toISOString(),
        createdAt: c.createdAt || new Date().toISOString(),
        messages: (Array.isArray(c.messages) ? c.messages : []).map((m: any, idx: number) => ({
          id: m._id || m.id || `msg_${idx}`,
          sender: m.role === 'user' || m.sender === 'user' ? 'user' : 'assistant',
          role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
          content: m.content || m.message || '',
          timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
          suggestedActions: Array.isArray(m.suggestedActions) ? m.suggestedActions : [],
          relatedSkills: Array.isArray(m.relatedSkills) ? m.relatedSkills : [],
          actionCard: m.metadata?.actionCard || m.actionCard
        }))
      }));
    } catch {
      return [];
    }
  },

  async getConversationById(id: string): Promise<Conversation | null> {
    try {
      const response = await apiClient.get(`/conversation/${id}`);
      const raw = unwrapData<any>(response.data);
      if (!raw) return null;
      return {
        id: raw._id || raw.id,
        _id: raw._id || raw.id,
        userId: raw.userId,
        title: raw.title || 'Career Chat',
        updatedAt: raw.updatedAt || new Date().toISOString(),
        createdAt: raw.createdAt || new Date().toISOString(),
        messages: (Array.isArray(raw.messages) ? raw.messages : []).map((m: any, idx: number) => ({
          id: m._id || m.id || `msg_${idx}`,
          sender: m.role === 'user' || m.sender === 'user' ? 'user' : 'assistant',
          role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
          content: m.content || m.message || '',
          timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
          suggestedActions: Array.isArray(m.suggestedActions) ? m.suggestedActions : [],
          relatedSkills: Array.isArray(m.relatedSkills) ? m.relatedSkills : [],
          actionCard: m.metadata?.actionCard || m.actionCard
        }))
      };
    } catch {
      return null;
    }
  },

  async createConversation(initialMessage?: string): Promise<Conversation> {
    const response = await apiClient.post('/conversation', { initialMessage });
    const raw = unwrapData<any>(response.data);
    return {
      id: raw._id || raw.id,
      _id: raw._id || raw.id,
      userId: raw.userId,
      title: raw.title || 'New Career Chat',
      updatedAt: raw.updatedAt || new Date().toISOString(),
      createdAt: raw.createdAt || new Date().toISOString(),
      messages: (Array.isArray(raw.messages) ? raw.messages : []).map((m: any, idx: number) => ({
        id: m._id || m.id || `msg_${idx}`,
        sender: m.role === 'user' || m.sender === 'user' ? 'user' : 'assistant',
        role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
        content: m.content || m.message || '',
        timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
        suggestedActions: Array.isArray(m.suggestedActions) ? m.suggestedActions : [],
        relatedSkills: Array.isArray(m.relatedSkills) ? m.relatedSkills : []
      }))
    };
  },

  async streamAssistantMessage(
    content: string,
    conversationId: string | undefined,
    onChunk: (chunk: string, convId: string) => void
  ): Promise<{ conversationId: string; fullContent: string }> {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
    const response = await fetch(`${BASE_URL}/conversation/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ message: content, conversationId, stream: true })
    });

    if (!response.ok) {
      // Fallback to standard HTTP POST if streaming headers or proxy fail
      const result = await this.sendAssistantMessage(content, conversationId);
      onChunk(result.message.content, result.conversationId);
      return { conversationId: result.conversationId, fullContent: result.message.content };
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let finalConvId = conversationId || '';

    if (reader) {
      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.chunk) {
                  fullContent += parsed.chunk;
                  if (parsed.conversationId) finalConvId = parsed.conversationId;
                  onChunk(parsed.chunk, finalConvId);
                }
              } catch {
                // ignore
              }
            }
          }
        }
      }
    }

    return { conversationId: finalConvId, fullContent };
  },

  async sendAssistantMessage(content: string, conversationId?: string): Promise<{ conversationId: string; message: AIMessage }> {
    const payload: Record<string, any> = { message: content };
    if (conversationId && conversationId !== 'new') {
      payload.conversationId = conversationId;
    }
    const response = await apiClient.post('/conversation/message', payload);
    const res = unwrapData<any>(response.data);

    const replyObj = res?.message || res?.reply || res;
    const resConvId = res?.conversationId || (res?.conversation?._id || res?.conversation?.id) || conversationId || '';

    const message: AIMessage = {
      id: replyObj?._id || replyObj?.id || `msg_${Date.now()}`,
      sender: replyObj?.role === 'user' || replyObj?.sender === 'user' ? 'user' : 'assistant',
      role: replyObj?.role || 'assistant',
      content: replyObj?.content || replyObj?.message || (typeof replyObj === 'string' ? replyObj : 'Response received.'),
      timestamp: replyObj?.timestamp
        ? new Date(replyObj.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Just now',
      suggestedActions: Array.isArray(replyObj?.suggestedActions) ? replyObj.suggestedActions : [],
      relatedSkills: Array.isArray(replyObj?.relatedSkills) ? replyObj.relatedSkills : [],
      actionCard: replyObj?.metadata?.actionCard || replyObj?.actionCard
    };

    return { conversationId: resConvId, message };
  },

  async deleteConversation(id: string): Promise<void> {
    await apiClient.delete(`/conversation/${id}`);
  },

  // Feedback
  async submitFeedback(data: { targetType: string; rating: 'positive' | 'negative'; comments?: string }): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.post('/feedback', data);
      return unwrapData<{ success: boolean }>(response.data);
    } catch (error) {
      return { success: false };
    }
  },

  // Learning Path
  async generateLearningPath(
    goal: string,
    skillGaps: any[] = []
  ): Promise<LearningPathResponse> {
    const response = await apiClient.post('/learning-path/generate', {
      goal,
      skill_gaps: skillGaps
    });

    return unwrapData<LearningPathResponse>(response.data);
  },

  async completeCourse(
    courseId: string,
    learner?: any
  ): Promise<any> {
    const response = await apiClient.post(
      `/courses/${encodeURIComponent(courseId)}/complete`,
      { learner: learner || { id: 'guest_user' } }
    );

    return unwrapData<any>(response.data);
  },

  async completeProject(
    projectId: string,
    learner?: any
  ): Promise<any> {
    const response = await apiClient.post(
      `/projects/${encodeURIComponent(projectId)}/complete`,
      { learner: learner || { id: 'guest_user' } }
    );

    return unwrapData<any>(response.data);
  },

  async submitAssessment(
    assessmentId: string,
    score: number,
    metadata?: any
  ): Promise<any> {
    const response = await apiClient.post(
      `/assessments/${encodeURIComponent(assessmentId)}/submit`,
      {
        score,
        learner: { id: 'guest_user' },
        ...(metadata || {}),
      }
    );

    return unwrapData<any>(response.data);
  }
};
