export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Skill {
  name: string;
  category?: 'programming' | 'framework' | 'tool' | 'soft' | 'domain';
  proficiency: SkillProficiency;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  createdAt: string;
}


export interface LearnerProfile {
  id: string;
  userId: string;
  skills: Skill[];
  interests: string[];
  education: string;
  experienceLevel: 'Entry' | 'Mid' | 'Senior' | 'Lead';
  targetCareerGoal?: string;
  goalReason?: string;
  learningPreferences: {
    formats: ('Videos' | 'Reading' | 'Projects' | 'Interactive' | 'Courses' | 'Docs')[];
    weeklyHours: number;
  };
  updatedAt: string;
}

export interface SkillGapItem {
  skillName: string;
  currentProficiency: SkillProficiency | 'None';
  requiredProficiency: SkillProficiency;
  priority: 'High' | 'Medium' | 'Low';
  category: 'Strong' | 'Needs Improvement' | 'Missing';
}

export interface ScoreBreakdown {
  skill?: number;
  interest?: number;
  goal?: number;
  experience?: number;
  education?: number;
  semantic?: number;
  skill_match?: number;
  interest_match?: number;
  goal_match?: number;
  experience_match?: number;
  education_match?: number;
  semantic_similarity?: number;
}

export interface CareerRecommendation {
  id: string;
  career_id?: string;
  title: string;
  career?: string;
  finalScore?: number;
  matchScore: number;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  difficulty: 'Entry' | 'Intermediate' | 'Advanced' | string;
  estimatedTransition: string;
  transition_estimate?: string;
  description: string;
  whyMatches: string[];
  strengths?: string[];
  skillGaps: string[];
  skill_gaps?: string[];
  keyResponsibilities?: string[];
  averageSalary?: string;
  reasoning?: string;
  nextBestAction?: string;
  next_best_action?: string;
  scoreBreakdown?: ScoreBreakdown;
  score_breakdown?: any;
}

export interface CareerComparison {
  careerId: string;
  careerTitle: string;
  score: number;
  matchScore: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  transitionEffort: string;
  missingSkills: string[];
  overlapSkills: string[];
  overlapCount: number;
  estimatedLearningHours: number;
  careerRisks: string[];
  bestFitExplanation: string;
  difficulty: string;
  scoreBreakdown: ScoreBreakdown;
}

export interface AIProject {
  title: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  description: string;
  skillsPracticed: string[];
  prerequisites: string[];
  estimatedHours: number;
  expectedOutcome: string;
  suggestedTechStack: string[];
}

export interface AIResource {
  title: string;
  type: 'Documentation' | 'Course' | 'Article' | 'Video' | 'Tutorial';
  skill: string;
  difficulty?: string;
  reason: string;
  url: string | null;
}

export interface FlowchartNode {
  id: string;
  label: string;
  category?: string;
  description?: string;
}

export interface FlowchartEdge {
  id: string;
  source: string;
  target: string;
}

export interface FlowchartData {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
}


export interface SkillGapDetail {
  name: string;
  currentLevel: number; // 0 to 4
  requiredLevel: number; // 4
  gap: number;
  priority: 'high' | 'medium' | 'low';
  category: 'strong' | 'needsWork' | 'missing';
}

export interface SkillGapAnalysis {
  career?: string;
  currentSkills?: string[];
  missingSkills?: string[];
  skillsToImprove?: string[];
  priority?: string[];
  details?: SkillGapDetail[];
  summary?: {
    strongCount: number;
    needsWorkCount: number;
    missingCount: number;
  };
  careerId?: string;
  careerTitle?: string;
  matchScore?: number;
  strongCount?: number;
  improvementCount?: number;
  missingCount?: number;
  items?: any[];
}

export interface RoadmapResource {
  id: string;
  title: string;
  type: 'Video' | 'Article' | 'Course' | 'Project' | 'Docs' | 'Interactive';
  url: string;
  duration: string;
  completed?: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface RoadmapPhase {
  id: string;
  phaseNumber: number;
  title: string;
  durationWeeks: number;
  skillsCovered: string[];
  summary: string;
  resources: RoadmapResource[];
  milestones: Milestone[];
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface AdaptiveEvent {
  message?: string;
  date?: string;
  reason?: string;
  adjustment?: string;
  previousDurationWeeks?: number;
  newDurationWeeks?: number;
}


export interface RoadmapGraphNode {
  nodeId: string;
  id?: string;
  title: string;
  type?: string;
  description?: string;
  topics?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'capstone';
  importance?: number;
  userLevel?: number;
  requiredLevel?: number;
  skillGap?: number;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'MASTERED' | 'RECOMMENDED' | 'LOCKED' | 'OPTIONAL';
  stateLabel?: string;
  prerequisites?: string[];
  resources?: RoadmapResource[];
}

export interface RoadmapGraphEdge {
  source: string;
  target: string;
  type?: string;
}

export interface Roadmap {
  id: string;
  userId: string;
  careerId: string;
  careerTitle: string;
  requestedCareer?: string;
  resolvedCareer?: string;
  domain?: string;
  sourceProvider?: string;
  resolutionMethod?: string;
  totalDurationMonths: number;
  weeklyCommitmentHours: number;
  overallCompletionPercent: number;
  currentPhaseNumber: number;
  nodes?: RoadmapGraphNode[];
  edges?: RoadmapGraphEdge[];
  phases: RoadmapPhase[];
  adaptiveEvents?: AdaptiveEvent[];
  profileVersion?: number;
  isStale?: boolean;
  updatedAt: string;
}

export interface UserProgress {
  id: string;
  userId: string;
  activeRoadmapId?: string | null;
  activeRoadmapTitle?: string | null;
  totalLearningHours: number;
  currentStreakDays: number;
  completedMilestonesCount: number;
  totalMilestones?: number;
  remainingMilestones?: number;
  overallPercentage?: number;
  roadmapCompletionPercentage?: number;
  learningPathCompletionPercentage?: number;
  skillGrowthPercentage?: number;
  baselineSkillsCount?: number;
  currentSkillsCount?: number;
  acquiredSkillsCount: number;
  skillsGainedCount?: number;
  completedCoursesCount?: number;
  completedProjectsCount: number;
  completedAssessmentsCount?: number;
  completedLearningPathItemsCount?: number;
  phaseBreakdown?: {
    phaseId: string;
    title: string;
    description?: string;
    totalMilestones: number;
    completedMilestones: number;
    completionPercentage: number;
    status: 'not_started' | 'in_progress' | 'completed';
  }[];
  recentActivity: {
    id: string;
    title: string;
    type: string;
    status?: string;
    timestamp: string;
  }[];
}

export interface DashboardData {
  user: User;
  activeGoal: {
    careerId: string;
    title: string;
    matchScore: number;
    estimatedMonths: number;
  };
  currentProgress: {
    overallCompletionPercent: number;
    completedMilestones?: number;
    totalMilestones?: number;
    learningHours: number;
    streakDays: number;
  };
  currentPhase: {
    phaseNumber: number;
    title: string;
    progressPercent: number;
  };
  nextAction: {
    id: string;
    title: string;
    phaseTitle: string;
    estimatedMinutes: number;
    resourceType: string;
  };
  nextActions?: { action: string; label: string }[];
  careerGoal?: {
    targetCareer: string;
    experienceLevel?: string;
    weeklyLearningHours?: number;
  };
  skillGapSummary?: {
    strong: number;
    needsWork: number;
    missing: number;
  };
  skillGap?: SkillGapAnalysis;
  roadmap?: any;
  progress?: any;
  recommendedResources: {
    id: string;
    title: string;
    type: 'Course' | 'Project' | 'Skill' | 'Article';
    tag: string;
    duration: string;
  }[];
}

export interface AIMessage {
  id: string;
  sender: 'user' | 'assistant';
  role?: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestedActions?: string[];
  relatedSkills?: string[];
  actionCard?: {
    title: string;
    description: string;
    ctaText: string;
    actionType: 'ADD_TO_ROADMAP' | 'EXPLORE_CAREER' | 'VIEW_LESSON';
    payload?: Record<string, any>;
  };
}

export interface Conversation {
  id: string;
  _id?: string;
  userId: string;
  title: string;
  messages: AIMessage[];
  updatedAt: string;
  createdAt?: string;
}
