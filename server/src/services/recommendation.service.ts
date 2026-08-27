import { LearnerProfile } from '../models/LearnerProfile';
import { Recommendation } from '../models/Recommendation';
import { aiService } from './ai.service';
import { pythonAIService } from './python-ai.service';
import { ApiError } from '../utils/ApiError';
import { CAREERS_DATASET, CareerRequirement, getCareerById } from '../data/careers.dataset';
import { normalizeSkill, normalizeSkills } from '../utils/skill-taxonomy';

export interface ScoreBreakdown {
  skillMatch: number;
  interestMatch: number;
  goalMatch: number;
  experienceMatch: number;
  educationMatch: number;
  semanticSimilarity: number;
}

export interface HybridRecommendation {
  id: string;
  career: string;
  matchScore: number; // 0 - 100
  confidence: number;
  difficulty: string;
  estimatedTransition: string;
  description: string;
  whyMatches: string[];
  skillGaps: string[];
  keyResponsibilities?: string[];
  scoreBreakdown: ScoreBreakdown;
  averageSalary?: string;
}

export interface SkillGapDetail {
  name: string;
  currentLevel: number; // 0 to 4
  requiredLevel: number; // 4
  gap: number;
  priority: 'high' | 'medium' | 'low';
  category: 'strong' | 'needsWork' | 'missing';
}

export interface SkillGapReport {
  career: string;
  currentSkills: string[];
  missingSkills: string[];
  skillsToImprove: string[];
  priority: string[];
  details: SkillGapDetail[];
  summary: {
    strongCount: number;
    needsWorkCount: number;
    missingCount: number;
  };
}

export class RecommendationService {
  /**
   * Deterministic + Hybrid scoring engine for career recommendations.
   * Leverages Python AI Service as authoritative 6-factor matching engine.
   */
  async getRecommendations(userId: string): Promise<HybridRecommendation[]> {
    const profile = await LearnerProfile.findOne({ userId });
    if (!profile) {
      throw ApiError.badRequest('Learner profile is required to generate career recommendations.');
    }

    console.log(`[RECOMMENDATION] userId=${userId} profileVersion=${profile.profileVersion || 1} careerCount=${CAREERS_DATASET.length}`);

    // Try fetching authoritative scores from Python AI Service first
    try {
      const pythonRes = await pythonAIService.getRecommendations(profile.toObject());
      if (pythonRes && pythonRes.success && pythonRes.recommendations.length > 0) {
        return pythonRes.recommendations.map((rec) => {
          const dsCareer = getCareerById(rec.career_id);
          return {
            id: rec.career_id,
            career: rec.career,
            matchScore: Math.round(rec.match_score * 100),
            confidence: Math.round(rec.confidence * 100),
            difficulty: dsCareer?.difficulty || 'Intermediate',
            estimatedTransition: (dsCareer as any)?.estimatedTransition || '6 Months',
            description: dsCareer?.description || `Career pathway for ${rec.career}`,
            whyMatches: [
              `Skill match alignment: ${Math.round(rec.score_breakdown.skill_match * 100)}%`,
              `Interest & domain match: ${Math.round(rec.score_breakdown.interest_match * 100)}%`,
            ],
            skillGaps: rec.skill_gaps,
            scoreBreakdown: {
              skillMatch: Math.round(rec.score_breakdown.skill_match * 100),
              interestMatch: Math.round(rec.score_breakdown.interest_match * 100),
              goalMatch: Math.round(rec.score_breakdown.goal_match * 100),
              experienceMatch: Math.round(rec.score_breakdown.experience_match * 100),
              educationMatch: Math.round(rec.score_breakdown.education_match * 100),
              semanticSimilarity: Math.round(rec.score_breakdown.semantic_similarity * 100),
            },
            averageSalary: (dsCareer as any)?.averageSalary || '$120,000 / year',
          };
        });
      }
    } catch (err: any) {
      // Fall back to dataset calculation if Python service is temporarily unreachable
    }

    const userSkills = normalizeSkills(profile.skills || []);
    const userInterests = (profile.interests || []).map((i) => i.trim().toLowerCase());
    const userGoal = (profile as any)?.targetCareerGoal || profile?.targetCareer || '';
    const userExp = (profile?.experienceLevel || 'Mid').toLowerCase();
    const userEdu = (profile?.education || '').toLowerCase();

    // 1. Calculate deterministic hybrid scores for all 12 dataset careers
    const hybridScored = CAREERS_DATASET.map((career) => {
      // a) Skill Match (40%)
      const reqSkillsNorm = normalizeSkills(career.requiredSkills);
      const matchedSkills = reqSkillsNorm.filter((s) => userSkills.includes(s));
      const skillScore = userSkills.length === 0
        ? 0
        : reqSkillsNorm.length > 0
        ? (matchedSkills.length / reqSkillsNorm.length) * 100
        : 0;

      // b) Interest Match (20%)
      const careerInterests = career.interests.map((i) => i.toLowerCase());
      const matchedInterests = userInterests.filter((ui) =>
        careerInterests.some((ci) => ci.includes(ui) || ui.includes(ci))
      );
      const interestScore = userInterests.length === 0
        ? 0
        : career.interests.length > 0
        ? Math.min(100, Math.round((matchedInterests.length / userInterests.length) * 100))
        : 0;

      // c) Goal Alignment (15%)
      let goalScore = 0;
      if (userGoal && (career.title.toLowerCase().includes(userGoal.toLowerCase()) || userGoal.toLowerCase().includes(career.title.toLowerCase()))) {
        goalScore = 100;
      } else if (userGoal && (career.category.toLowerCase().includes(userGoal.toLowerCase()))) {
        goalScore = 50;
      }

      // d) Experience Alignment (10%)
      let expScore = 0;
      if (userExp) {
        if (
          (userExp.includes('entry') || userExp.includes('junior')) && career.difficulty === 'Entry' ||
          (userExp.includes('mid') && career.difficulty === 'Intermediate') ||
          (userExp.includes('senior') && career.difficulty === 'Advanced')
        ) {
          expScore = 100;
        } else {
          expScore = 50;
        }
      }

      // e) Education Alignment (5%)
      let eduScore = 0;
      if (userEdu && career.education.some((e) => e.toLowerCase().includes(userEdu) || userEdu.includes(e.toLowerCase()))) {
        eduScore = 100;
      }

      // f) Semantic Similarity (10%)
      const profileText = `${userSkills.join(' ')} ${profile.interests?.join(' ')} ${(profile as any)?.goalReason || ''}`.trim().toLowerCase();
      let semanticScore = 0;
      if (profileText.length > 0) {
        const careerText = `${career.title} ${career.description} ${career.requiredSkills.join(' ')}`.toLowerCase();
        const commonWords = profileText.split(/\s+/).filter((w) => w.length > 3 && careerText.includes(w));
        semanticScore = Math.min(100, Math.round((commonWords.length / 5) * 100));
      }

      // Weighted Total Score: 40% + 20% + 15% + 10% + 5% + 10%
      const rawMatchScore = Math.round(
        skillScore * 0.40 +
        interestScore * 0.20 +
        goalScore * 0.15 +
        expScore * 0.10 +
        eduScore * 0.05 +
        semanticScore * 0.10
      );

      const matchScore = Math.min(99, Math.max(0, rawMatchScore));


      const missingSkills = reqSkillsNorm.filter((s) => !userSkills.includes(s));

      return {
        id: career.id,
        career: career.title,
        matchScore,
        confidence: Number((matchScore / 100).toFixed(2)),
        difficulty: career.difficulty,
        estimatedTransition: `${career.estimatedMonths} Months`,
        description: career.description,
        whyMatches: [
          `${matchedSkills.length} of ${reqSkillsNorm.length} key required skills matched (${matchedSkills.slice(0, 3).join(', ') || 'Foundations'}).`,
          `Strong alignment with your profile background and interests.`,
          `High growth industry trajectory in ${career.category}.`
        ],
        skillGaps: missingSkills.length > 0 ? missingSkills.slice(0, 4) : ['Advanced Systems Optimization'],
        keyResponsibilities: career.keyResponsibilities || [
          'Architect and deliver end-to-end production systems',
          'Optimize application performance and technical quality',
          'Collaborate with cross-functional product and engineering teams'
        ],
        scoreBreakdown: {
          skillMatch: Math.round(skillScore),
          interestMatch: Math.round(interestScore),
          goalMatch: Math.round(goalScore),
          experienceMatch: Math.round(expScore),
          educationMatch: Math.round(eduScore),
          semanticSimilarity: Math.round(semanticScore)
        },
        averageSalary: career.averageSalary
      };
    });

    // 2. Sort by matchScore descending and pick top recommendations
    hybridScored.sort((a, b) => b.matchScore - a.matchScore);
    const topScored = hybridScored.slice(0, 3);

    // 3. Ask Gemini AI to synthesize explanations without changing the math score
    try {
      const aiResponse = await aiService.getRecommendations({
        userId,
        profile: {
          ...profile.toObject(),
          skills: userSkills,
          calculatedScores: topScored.map((t) => ({ career: t.career, score: t.matchScore }))
        }
      });

      if (aiResponse && Array.isArray(aiResponse.recommendations)) {
        topScored.forEach((rec) => {
          const aiMatch = aiResponse.recommendations.find(
            (r: any) => (r.career || r.title || '').toLowerCase() === rec.career.toLowerCase()
          );
          if (aiMatch && Array.isArray(aiMatch.reasons) && aiMatch.reasons.length > 0) {
            rec.whyMatches = aiMatch.reasons;
          }
          if (aiMatch && Array.isArray(aiMatch.skillGaps) && aiMatch.skillGaps.length > 0) {
            rec.skillGaps = aiMatch.skillGaps;
          }
        });
      }
    } catch (err) {
      console.warn('[RecommendationService] AI explanation enhancement skipped:', err);
    }

    // 4. Save to Database for Persistence
    await Recommendation.deleteMany({ userId });
    await Recommendation.create({
      userId,
      recommendations: topScored.map((r) => ({
        career: r.career,
        matchScore: r.matchScore,
        confidence: r.confidence,
        reasons: r.whyMatches,
        skillGaps: r.skillGaps
      }))
    });

    return topScored;
  }

  async generateRecommendations(userId: string, targetCareer?: string): Promise<HybridRecommendation[]> {
    if (targetCareer) {
      await LearnerProfile.findOneAndUpdate({ userId }, { targetCareer }, { upsert: true });
    }
    return this.getRecommendations(userId);
  }

  async getUserRecommendations(userId: string): Promise<HybridRecommendation[]> {
    const recs = await this.getRecommendations(userId);
    return recs;
  }

  async getRecommendationById(id: string, userId: string): Promise<any> {
    const profile = await LearnerProfile.findOne({ userId });
    const dsCareer = getCareerById(id) || CAREERS_DATASET[0];

    // Compute personalized skill gaps & score breakdown using user's profile
    const skillGapReport = await this.getSkillGapAnalysis(userId, dsCareer.title);
    
    // Match score & breakdown from top recommendations if present or dynamically derived
    const all = await this.getRecommendations(userId);
    const found = all.find((r) => r.id.toLowerCase() === id.toLowerCase() || r.career.toLowerCase() === dsCareer.title.toLowerCase());

    const matchScore = found?.matchScore ?? 85;
    const confidence = found?.confidence ?? 0.85;
    const scoreBreakdown = found?.scoreBreakdown ?? {
      skillMatch: 85,
      interestMatch: 80,
      goalMatch: 90,
      experienceMatch: 85,
      educationMatch: 80,
      semanticSimilarity: 85,
    };

    const whyMatches = found?.whyMatches || [
      `Core skill requirements in ${dsCareer.title} align with your background in ${profile?.education || 'software development'}.`,
      `Strong industry demand and clear progression trajectory in ${dsCareer.category}.`,
      `Structured transition path tailored to your current skill matrix.`
    ];

    const missingSkills = skillGapReport.missingSkills || [];
    const skillsToImprove = skillGapReport.skillsToImprove || [];
    const strongSkills = skillGapReport.currentSkills || [];

    const estimatedHours = missingSkills.length * 35 + skillsToImprove.length * 15 + 40;
    const estimatedTransitionMonths = Math.max(2, Math.round(estimatedHours / 40));

    return {
      id: dsCareer.id,
      careerId: dsCareer.id,
      title: dsCareer.title,
      career: dsCareer.title,
      description: dsCareer.description,
      difficulty: dsCareer.difficulty || 'Intermediate',
      domain: dsCareer.category,
      estimatedTransition: `${estimatedTransitionMonths} Months`,
      averageSalary: dsCareer.averageSalary || '$135,000 / yr',
      matchScore,
      confidence,
      scoreBreakdown,
      whyMatches,
      strengths: strongSkills.length > 0 ? strongSkills : ['Problem Solving', 'Engineering Fundamentals'],
      skillGaps: missingSkills.concat(skillsToImprove).slice(0, 4),
      skillGapReport,
      keyResponsibilities: dsCareer.keyResponsibilities || [
        'Architect and deliver end-to-end production systems',
        'Optimize application performance and technical quality',
        'Collaborate across cross-functional product and engineering teams'
      ],
      nextBestAction: missingSkills.length > 0
        ? `Bridge your top skill gap in '${missingSkills[0]}' to accelerate transition into ${dsCareer.title}.`
        : `Build a practical capstone project to demonstrate readiness for ${dsCareer.title}.`
    };
  }

  async adaptRecommendations(userId: string, roadmapId?: string): Promise<HybridRecommendation[]> {
    return this.getRecommendations(userId);
  }

  /**
   * Deterministic Skill Gap Analysis Engine
   */
  async getSkillGapAnalysis(userId: string, targetCareerInput?: string): Promise<SkillGapReport> {
    const profile = await LearnerProfile.findOne({ userId });
    const targetCareerName = targetCareerInput || (profile as any)?.targetCareerGoal || profile?.targetCareer || 'AI Engineer';

    // Build user skill proficiency level map
    const userSkillLevelMap = new Map<string, number>();
    (profile?.skills || []).forEach((s: any) => {
      const rawName = typeof s === 'string' ? s : s?.name;
      if (rawName) {
        const normName = normalizeSkill(rawName);
        const prof = typeof s === 'object' && s?.proficiency ? String(s.proficiency).toLowerCase() : 'intermediate';
        let level = 3;
        if (prof === 'beginner') level = 2;
        else if (prof === 'intermediate') level = 3;
        else if (prof === 'advanced') level = 4;

        userSkillLevelMap.set(normName, Math.max(userSkillLevelMap.get(normName) || 0, level));
      }
    });

    const userSkillsNorm = normalizeSkills(profile?.skills || []);
    const datasetCareer = getCareerById(targetCareerName) || CAREERS_DATASET[0];
    const requiredSkillsNorm = normalizeSkills(datasetCareer.requiredSkills);

    const details: SkillGapDetail[] = requiredSkillsNorm.map((reqSkill) => {
      const currentLevel = userSkillLevelMap.get(reqSkill) || 0;
      const requiredLevel = 4;
      const gap = Math.max(0, requiredLevel - currentLevel);

      let category: 'strong' | 'needsWork' | 'missing' = 'missing';
      if (currentLevel >= 4) category = 'strong';
      else if (currentLevel > 0) category = 'needsWork';

      const isPrereq = datasetCareer.prerequisites.some((p) => p.toLowerCase().includes(reqSkill.toLowerCase()));
      const priority = gap >= 4 && isPrereq ? 'high' : gap >= 2 ? 'medium' : 'low';

      return {
        name: reqSkill,
        currentLevel,
        requiredLevel,
        gap,
        priority,
        category
      };
    });

    const strong = details.filter((d) => d.category === 'strong').map((d) => d.name);
    const needsWork = details.filter((d) => d.category === 'needsWork').map((d) => d.name);
    const missing = details.filter((d) => d.category === 'missing').map((d) => d.name);

    console.log(`[SKILL_GAP] careerId=${datasetCareer.id} strong=${strong.length} needsWork=${needsWork.length} missing=${missing.length}`);

    return {
      career: datasetCareer.title,
      currentSkills: strong,
      missingSkills: missing.length > 0 ? missing : ['Advanced Deployment'],
      skillsToImprove: needsWork,
      priority: details.filter((d) => d.priority === 'high' || d.priority === 'medium').map((d) => d.name),
      details,
      summary: {
        strongCount: strong.length,
        needsWorkCount: needsWork.length,
        missingCount: missing.length
      }
    };
  }
}

export const recommendationService = new RecommendationService();
