import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';

export interface PythonRecommendationResponse {
  success: boolean;
  recommendations: Array<{
    career_id: string;
    career: string;
    match_score: number;
    score_breakdown: {
      skill_match: number;
      interest_match: number;
      goal_match: number;
      experience_match: number;
      education_match: number;
      semantic_similarity: number;
    };
    strengths: string[];
    skill_gaps: string[];
    confidence: number;
  }>;
}

export interface PythonRoadmapResponse {
  success: boolean;
  careerId: string;
  careerTitle: string;
  matchScore: number;
  duration: number;
  durationUnit: string;
  estimatedHours: number;
  strengths: string[];
  missingSkills: string[];
  needsWorkSkills: string[];
  phases: Array<{
    phaseId: string;
    title: string;
    description: string;
    skills: string[];
    prerequisites: string[];
    progressPercent: number;
    milestones: Array<{
      milestoneId: string;
      title: string;
      description: string;
      estimatedHours: number;
      completed: boolean;
      targetSkill: string;
    }>;
  }>;
}

export interface GenerateLearningPathRequest {
  learner: Record<string, any>;
  goal: string;
  skill_gaps?: Array<Record<string, any>>;
}

export interface LearningPathProgressInfo {
  total_courses: number;
  completed_courses: number;
  overall_progress: number;
  total_milestones: number;
  completed_milestones: number;
  current_milestone?: string | null;
  next_course_id?: string | null;
}

export interface GenerateLearningPathResponse {
  success: boolean;
  goal: string;
  status?: string;
  reason?: string;
  total_courses: number;
  total_milestones: number;
  courses: Array<Record<string, any>>;
  milestones: Array<Record<string, any>>;
  progress: LearningPathProgressInfo;
  error?: string;
}

export interface CompleteCourseRequest {
  learner: Record<string, any>;
}

export interface CompleteCourseResponse {
  success: boolean;
  learner: Record<string, any>;
  course_completion: Record<string, any>;
  error?: string;
}

export interface CompleteProjectRequest {
  learner: Record<string, any>;
}

export interface CompleteProjectResponse {
  success: boolean;
  learner: Record<string, any>;
  project_completion: Record<string, any>;
  error?: string;
}

export interface SubmitAssessmentRequest {
  learner: Record<string, any>;
  score: number;
  user_answers?: Record<string, any>;
}

export interface SubmitAssessmentResponse {
  success: boolean;
  learner: Record<string, any>;
  assessment_result: Record<string, any>;
  error?: string;
}

function handleAxiosError(endpoint: string, error: any): ApiError {
  logger.warn(`[PythonAIService] ${endpoint} call failed: ${error.message}`);
  if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
    return ApiError.gatewayTimeout(`Downstream AI service call to ${endpoint} timed out.`);
  }
  return ApiError.internal('Learning path generation service is temporarily unavailable.');
}

export class PythonAIService {
  private client: AxiosInstance;

  constructor() {
    const baseURL = env.AI_SERVICE_URL || 'http://localhost:8000';
    const timeout = (env as any).AI_SERVICE_TIMEOUT || 10000;
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getRecommendations(profile: Record<string, any>): Promise<PythonRecommendationResponse> {
    try {
      const response = await this.client.post('/recommend', {
        user_id: profile.userId || profile._id || 'user',
        profile,
      });
      return response.data;
    } catch (error: any) {
      throw handleAxiosError('/recommend', error);
    }
  }

  async generateRoadmapStructure(profile: Record<string, any>, targetCareer: string): Promise<PythonRoadmapResponse> {
    try {
      const response = await this.client.post('/roadmap/generate', {
        user_id: profile.userId || profile._id || 'user',
        target_career: targetCareer,
        profile,
      });
      return response.data;
    } catch (error: any) {
      throw handleAxiosError('/roadmap/generate', error);
    }
  }

  async generateLearningPath(payload: GenerateLearningPathRequest): Promise<GenerateLearningPathResponse> {
    try {
      const response = await this.client.post('/learning-path/generate', payload);
      return response.data;
    } catch (error: any) {
      throw handleAxiosError('/learning-path/generate', error);
    }
  }

  async completeCourse(courseId: string, payload: CompleteCourseRequest): Promise<CompleteCourseResponse> {
    try {
      const response = await this.client.post(`/courses/${encodeURIComponent(courseId)}/complete`, payload);
      return response.data;
    } catch (error: any) {
      throw handleAxiosError(`/courses/${courseId}/complete`, error);
    }
  }

  async completeProject(projectId: string, payload: CompleteProjectRequest): Promise<CompleteProjectResponse> {
    try {
      const response = await this.client.post(`/projects/${encodeURIComponent(projectId)}/complete`, payload);
      return response.data;
    } catch (error: any) {
      throw handleAxiosError(`/projects/${projectId}/complete`, error);
    }
  }

  async submitAssessment(assessmentId: string, payload: SubmitAssessmentRequest): Promise<SubmitAssessmentResponse> {
    try {
      const response = await this.client.post(`/assessments/${encodeURIComponent(assessmentId)}/submit`, payload);
      return response.data;
    } catch (error: any) {
      throw handleAxiosError(`/assessments/${assessmentId}/submit`, error);
    }
  }
}

export const pythonAIService = new PythonAIService();
