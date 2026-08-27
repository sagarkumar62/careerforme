import { User } from '../../models/User';
import { LearnerProfile } from '../../models/LearnerProfile';
import { Roadmap } from '../../models/Roadmap';
import { recommendationService } from '../recommendation.service';
import { CAREERS_DATASET } from '../../data/careers.dataset';

export interface CareerContextData {
  systemInstruction: string;
  userContextSummary: Record<string, any>;
}

export class CareerContextService {
  async buildCareerContext(userId: string): Promise<CareerContextData> {
    const [user, profile, activeRoadmap] = await Promise.all([
      User.findById(userId),
      LearnerProfile.findOne({ userId }),
      Roadmap.findOne({ userId, status: 'active' }).sort({ createdAt: -1 }),
    ]);

    const targetCareer = (profile as any)?.targetCareerGoal || profile?.targetCareer || activeRoadmap?.targetCareer || 'Full Stack Developer';

    let skillGap: any = null;
    try {
      skillGap = await recommendationService.getSkillGapAnalysis(userId, targetCareer);
    } catch {
      // ignore
    }

    const currentSkills = (profile?.skills || []).map((s: any) =>
      typeof s === 'string' ? s : `${s.name} (${s.proficiency || 'Intermediate'})`
    );

    const completedCourses = (profile?.completedCourses || []).map((c: any) =>
      typeof c === 'string' ? c : c.title || c.course_id || 'Completed Course'
    );

    const completedProjects = (profile?.projects || []).map((p: any) =>
      typeof p === 'string' ? p : `${p.title || 'Completed Project'} [${(p.techStack || []).join(', ')}]`
    );

    const certifications = (profile?.certifications || []).map((cert: any) =>
      typeof cert === 'string' ? cert : cert.title || 'Certified Skill'
    );

    const activePhase = activeRoadmap?.phases?.find((p) => p.milestones.some((m) => !m.completed)) || activeRoadmap?.phases?.[0];
    const totalMilestonesCount = activeRoadmap
      ? activeRoadmap.phases.flatMap((p) => p.milestones).length
      : 0;
    const completedMilestonesCount = activeRoadmap
      ? activeRoadmap.phases.flatMap((p) => p.milestones).filter((m) => m.completed).length
      : 0;

    const prefData: any = profile?.learningPreferences;
    const weeklyHours: number = (typeof prefData === 'object' && !Array.isArray(prefData) && prefData?.weeklyHours) || (profile as any)?.weeklyLearningHours || 10;
    const formats: string[] = (typeof prefData === 'object' && !Array.isArray(prefData) && Array.isArray(prefData?.formats)) ? prefData.formats : (Array.isArray(prefData) ? prefData : ['Videos', 'Projects', 'Docs']);

    const userContextSummary = {
      userName: user?.name || 'Learner',
      userEmail: user?.email || '',
      education: profile?.education || 'Self-Taught / Bootcamp',
      experienceLevel: profile?.experienceLevel || 'Mid',
      currentSkills,
      completedCourses,
      completedProjects,
      certifications,
      interests: profile?.interests || [],
      targetCareerGoal: targetCareer,
      goalReason: (profile as any)?.goalReason || 'Career growth & technical mastery',
      learningPreferences: { formats, weeklyHours },
      activeRoadmapTitle: activeRoadmap?.title || `${targetCareer} Learning Roadmap`,
      activePhaseTitle: activePhase?.title || 'Phase 1: Foundations',
      overallCompletionPercent: activeRoadmap?.overallCompletionPercent || 0,
      totalMilestonesCount,
      completedMilestonesCount,
      missingSkills: skillGap?.missingSkills || [],
      skillsToImprove: skillGap?.skillsToImprove || [],
      strongSkills: skillGap?.currentSkills || [],
    };

    // Construct Dataset Catalog Access Summary for AI Assistant Knowledge
    const datasetCatalogSummary = CAREERS_DATASET.map((c) =>
      `• ROLE: "${c.title}" (${c.category}, ${c.difficulty} Level)
  Description: ${c.description}
  Required Skills: ${c.requiredSkills.join(', ')}
  Recommended Skills: ${c.recommendedSkills.join(', ')}
  Average Salary Range: ${c.averageSalary}
  Key Responsibilities: ${c.keyResponsibilities.join('; ')}`
    ).join('\n\n');

    const systemInstruction = `You are an elite Senior AI Career Mentor inside the "Career PathFinder" platform.
Your mission is to guide ${userContextSummary.userName} towards achieving their target career goal: "${userContextSummary.targetCareerGoal}".

PATHFINDER CAREER DATASETS CATALOG (GROUND-TRUTH BENCHMARK ROLES):
${datasetCatalogSummary}

USER AUTHENTICATED LIVE PROFILE & CONTEXT:
- Name: ${userContextSummary.userName}
- Education Background: ${userContextSummary.education}
- Experience Level: ${userContextSummary.experienceLevel}
- Current Target Career Goal: ${userContextSummary.targetCareerGoal}
- Motivation / Reason: ${userContextSummary.goalReason}
- Weekly Study Commitment: ${userContextSummary.learningPreferences.weeklyHours} hours/week
- Preferred Learning Formats: ${(userContextSummary.learningPreferences.formats || []).join(', ')}
- Stated Skills: ${userContextSummary.currentSkills.length > 0 ? userContextSummary.currentSkills.join(', ') : 'Software Development Fundamentals'}
- Completed Courses: ${userContextSummary.completedCourses.length > 0 ? userContextSummary.completedCourses.join(', ') : 'None yet'}
- Completed Hands-On Projects: ${userContextSummary.completedProjects.length > 0 ? userContextSummary.completedProjects.join(', ') : 'None yet'}
- Certifications & Passed Assessments: ${userContextSummary.certifications.length > 0 ? userContextSummary.certifications.join(', ') : 'None yet'}
- Active Roadmap: ${userContextSummary.activeRoadmapTitle}
- Current Active Phase: ${userContextSummary.activePhaseTitle} (${userContextSummary.overallCompletionPercent}% Roadmap Completion, ${userContextSummary.completedMilestonesCount}/${userContextSummary.totalMilestonesCount} Milestones Done)
- Missing Target Career Skills: ${userContextSummary.missingSkills.length > 0 ? userContextSummary.missingSkills.join(', ') : 'All key skills acquired!'}
- Skills To Improve: ${userContextSummary.skillsToImprove.join(', ') || 'Core Frameworks'}

MENTOR BEHAVIOR & GUIDANCE RULES:
1. DATASET GROUND-TRUTH ACCESS: You have full access to PathFinder's Career Dataset Catalog above. When answering questions about salary bands, career transitions, required skills, prerequisites, or domain comparisons (e.g., AI Engineer vs Data Scientist, Frontend vs Backend), cite exact dataset benchmarks from the catalog.
2. PERSONALIZED & PROFILE-SYNCHRONIZED: Always answer according to ${userContextSummary.userName}'s specific live profile (education, experience level, completed courses, projects, and target goal). NEVER ask the user for information already present in their profile.
3. LEVEL-AWARE EVALUATION: Distinguish clearly between:
   - Learning (understanding syntax/concepts)
   - Practice (solving exercises/DSA)
   - Project-ready (building functional apps)
   - Interview-ready (explaining architecture & trade-offs)
   - Job-ready (deploying production-grade systems)
4. REALISTIC TIMELINES: If the user asks for unrealistic targets (e.g. "become an AI Engineer in 2 weeks with no Python"), explain politely why that timeline is unrealistic for job-readiness, then provide a structured accelerated alternative based on their weekly study time (${userContextSummary.learningPreferences.weeklyHours} hrs/wk).
5. STRUCTURED FORMATTING:
   - For detailed questions, roadmaps, or recommendations, use clean GitHub Markdown with clear headings:
     ### Recommendation
     ### Why
     ### Skills to Learn
     ### Roadmap
     ### Projects
     ### Next Step
   - For career comparisons, present a comparison table: | Factor | Option A | Option B | followed by a personalized decision recommendation tailored to their background.
   - For Mock Interviews, present 1 question at a time. When the user responds, evaluate their answer (Score out of 10, What was good, What was missing, Better candidate answer), then ask the next question.
   - For simple questions, give concise, direct responses.
6. ACTIONABLE NEXT STEPS: Always conclude detailed responses with a clear, inspiring "### Next Step" guiding the user on what to do next on the PathFinder app.`;

    return {
      systemInstruction,
      userContextSummary,
    };
  }
}

export const careerContextService = new CareerContextService();
