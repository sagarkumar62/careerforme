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
  
  if (error.response) {
    const status = error.response.status;
    const detail = error.response.data?.detail;
    const message = typeof detail === 'string'
      ? detail
      : (detail?.error || error.response.data?.message || error.message);

    if (status === 400 || status === 422) {
      return ApiError.badRequest(message);
    }
    if (status === 404) {
      return ApiError.notFound(message);
    }
    if (status === 401 || status === 403) {
      return ApiError.unauthorized(message);
    }
  }

  if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
    return ApiError.gatewayTimeout(`Downstream AI service call to ${endpoint} timed out.`);
  }

  return ApiError.internal(error.message || 'Learning path generation service is temporarily unavailable.');
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

  private getMockLearningPath(payload: GenerateLearningPathRequest): GenerateLearningPathResponse {
    const goal = (payload.goal || 'Software Engineer').trim();
    const slug = goal.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    const courses = [
      {
        id: `course_${slug}_101`,
        title: `Foundations of ${goal}`,
        description: `Comprehensive introductory course covering fundamental principles and core tools required for ${goal}.`,
        provider: 'PathFinder AI Academy',
        estimated_hours: 12,
        difficulty: 'Beginner',
        match_score: 95,
        reason: `Essential prerequisite knowledge for ${goal}`,
        status: 'in_progress',
        is_next: true,
        skills_covered: ['Fundamentals', 'Core Concepts', 'Problem Solving']
      },
      {
        id: `course_${slug}_201`,
        title: `Advanced ${goal} Architecture & Practice`,
        description: `In-depth exploration of advanced patterns, system design, and production workflows for ${goal}.`,
        provider: 'PathFinder AI Academy',
        estimated_hours: 20,
        difficulty: 'Intermediate',
        match_score: 90,
        reason: `Builds key practical capabilities for ${goal}`,
        status: 'available',
        is_next: false,
        skills_covered: ['System Design', 'Best Practices', 'Production Architecture']
      }
    ];

    const milestones = [
      {
        milestone_id: 'milestone-1',
        title: `Core ${goal} Mastery`,
        description: `Establish strong fundamental understanding of ${goal} methodologies.`,
        dependency_depth: 0,
        status: 'in_progress',
        progress: 0,
        course_ids: [courses[0].id],
        completed_course_ids: [],
        remaining_course_ids: [courses[0].id],
        next_course_id: courses[0].id,
        project_ids: [`proj_${slug}_1`],
        assessment_ids: [`quiz_${slug}_1`],
        skills: ['Fundamentals', 'Core Concepts'],
        estimated_hours: 12
      },
      {
        milestone_id: 'milestone-2',
        title: `Advanced ${goal} Engineering`,
        description: `Master complex system design and production readiness for ${goal}.`,
        dependency_depth: 1,
        status: 'not_started',
        progress: 0,
        course_ids: [courses[1].id],
        completed_course_ids: [],
        remaining_course_ids: [courses[1].id],
        next_course_id: courses[1].id,
        project_ids: [`proj_${slug}_2`],
        assessment_ids: [`quiz_${slug}_2`],
        skills: ['System Design', 'Production Architecture'],
        estimated_hours: 20
      }
    ];

    return {
      success: true,
      goal,
      status: 'active',
      total_courses: courses.length,
      total_milestones: milestones.length,
      courses,
      milestones,
      progress: {
        total_courses: courses.length,
        completed_courses: 0,
        overall_progress: 0,
        total_milestones: milestones.length,
        completed_milestones: 0,
        current_milestone: 'milestone-1',
        next_course_id: courses[0].id
      }
    };
  }

  private getMockCompleteCourse(courseId: string, payload: CompleteCourseRequest): CompleteCourseResponse {
    const learner = payload.learner || {};
    const updatedCompletedCourses = Array.from(
      new Set([...(learner.completed_courses || []), courseId])
    );
    return {
      success: true,
      learner: {
        ...learner,
        completed_courses: updatedCompletedCourses
      },
      course_completion: {
        course_id: courseId,
        completed_at: new Date().toISOString(),
        status: 'completed'
      }
    };
  }

  private getMockCompleteProject(projectId: string, payload: CompleteProjectRequest): CompleteProjectResponse {
    const learner = payload.learner || {};
    const updatedCompletedProjects = Array.from(
      new Set([...(learner.completed_projects || []), projectId])
    );
    return {
      success: true,
      learner: {
        ...learner,
        completed_projects: updatedCompletedProjects
      },
      project_completion: {
        project_id: projectId,
        completed_at: new Date().toISOString(),
        status: 'completed'
      }
    };
  }

  private getMockSubmitAssessment(assessmentId: string, payload: SubmitAssessmentRequest): SubmitAssessmentResponse {
    const learner = payload.learner || {};
    const score = payload.score ?? 80;
    const passed = score >= 70;
    const updatedAssessments = passed
      ? Array.from(new Set([...(learner.completed_assessments || []), assessmentId]))
      : (learner.completed_assessments || []);
    return {
      success: true,
      learner: {
        ...learner,
        completed_assessments: updatedAssessments
      },
      assessment_result: {
        assessment_id: assessmentId,
        score,
        passed,
        submitted_at: new Date().toISOString()
      }
    };
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

  async compareCareers(careerIds: string[], profile: Record<string, any>): Promise<any> {
    try {
      const response = await this.client.post('/careers/compare', {
        user_id: profile.userId || profile._id || 'user',
        career_ids: careerIds,
        profile,
      });
      return response.data;
    } catch (error: any) {
      throw handleAxiosError('/careers/compare', error);
    }
  }

  async analyzeSkillGap(targetCareer: string, profile: Record<string, any>): Promise<any> {
    try {
      const response = await this.client.post('/skill-gap', {
        user_id: profile.userId || profile._id || 'user',
        target_career: targetCareer,
        profile,
      });
      return response.data;
    } catch (error: any) {
      throw handleAxiosError('/skill-gap', error);
    }
  }

  async adaptRoadmap(payload: Record<string, any>): Promise<any> {
    try {
      const response = await this.client.post('/roadmap/adapt', payload);
      return response.data;
    } catch (error: any) {
      throw handleAxiosError('/roadmap/adapt', error);
    }
  }

  async getHealth(): Promise<any> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error: any) {
      throw handleAxiosError('/health', error);
    }
  }

  async generateRoadmapStructure(profile: Record<string, any>, targetCareer: string): Promise<PythonRoadmapResponse> {
    try {
      const response = await this.client.post('/roadmap/generate', {
        user_id: profile.userId || profile._id || 'user',
        careerId: targetCareer,
        target_career: targetCareer,
        targetCareer: targetCareer,
        profile,
      });
      return response.data;
    } catch (error: any) {
      throw handleAxiosError('/roadmap/generate', error);
    }
  }

  async generateLearningPath(payload: GenerateLearningPathRequest): Promise<GenerateLearningPathResponse> {
    if (env.AI_MOCK_MODE) {
      logger.info(`[PythonAIService] AI_MOCK_MODE enabled - returning mock learning path for "${payload.goal}"`);
      return this.getMockLearningPath(payload);
    }

    try {
      const response = await this.client.post('/learning-path/generate', payload);
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
        logger.warn(`[PythonAIService] Downstream AI service unavailable at ${this.client.defaults.baseURL} (${error.code}). Falling back to mock learning path.`);
        return this.getMockLearningPath(payload);
      }
      throw handleAxiosError('/learning-path/generate', error);
    }
  }

  async completeCourse(courseId: string, payload: CompleteCourseRequest): Promise<CompleteCourseResponse> {
    if (env.AI_MOCK_MODE) {
      return this.getMockCompleteCourse(courseId, payload);
    }

    try {
      const response = await this.client.post(`/courses/${encodeURIComponent(courseId)}/complete`, payload);
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
        logger.warn(`[PythonAIService] Downstream AI service unavailable. Falling back to mock course completion.`);
        return this.getMockCompleteCourse(courseId, payload);
      }
      throw handleAxiosError(`/courses/${courseId}/complete`, error);
    }
  }

  async completeProject(projectId: string, payload: CompleteProjectRequest): Promise<CompleteProjectResponse> {
    if (env.AI_MOCK_MODE) {
      return this.getMockCompleteProject(projectId, payload);
    }

    try {
      const response = await this.client.post(`/projects/${encodeURIComponent(projectId)}/complete`, payload);
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
        logger.warn(`[PythonAIService] Downstream AI service unavailable. Falling back to mock project completion.`);
        return this.getMockCompleteProject(projectId, payload);
      }
      throw handleAxiosError(`/projects/${projectId}/complete`, error);
    }
  }

  async submitAssessment(assessmentId: string, payload: SubmitAssessmentRequest): Promise<SubmitAssessmentResponse> {
    if (env.AI_MOCK_MODE) {
      return this.getMockSubmitAssessment(assessmentId, payload);
    }

    try {
      const response = await this.client.post(`/assessments/${encodeURIComponent(assessmentId)}/submit`, payload);
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
        logger.warn(`[PythonAIService] Downstream AI service unavailable. Falling back to mock assessment submission.`);
        return this.getMockSubmitAssessment(assessmentId, payload);
      }
      throw handleAxiosError(`/assessments/${assessmentId}/submit`, error);
    }
  }
}

export const pythonAIService = new PythonAIService();

