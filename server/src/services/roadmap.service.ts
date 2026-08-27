import mongoose from 'mongoose';
import { Roadmap, IRoadmap } from '../models/Roadmap';
import { Progress } from '../models/Progress';
import { LearnerProfile } from '../models/LearnerProfile';
import { aiService } from './ai.service';
import { pythonAIService } from './python-ai.service';
import { recommendationService } from './recommendation.service';
import { progressService } from './progress.service';
import { ApiError } from '../utils/ApiError';

export function deriveGraphFromPhases(phases: any[], domain: string = 'technology') {
  const nodes: any[] = [];
  const edges: any[] = [];
  let previousNodeId: string | null = null;
  let allPreviousCompleted = true;

  if (!phases || !Array.isArray(phases)) return { nodes, edges };

  phases.forEach((phase: any, phaseIdx: number) => {
    const phaseId = phase.phaseId || `phase-${phaseIdx + 1}`;
    const milestones = phase.milestones || [];

    milestones.forEach((m: any, mIdx: number) => {
      const milestoneId = m.milestoneId || `m_${phaseIdx + 1}_${mIdx + 1}`;
      const nodeId = `node_${phaseId}_${milestoneId}`;
      const isCompleted = !!m.completed;

      let status = 'LOCKED';
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
      const difficultyMap: Record<string, string> = {
        foundation: 'beginner',
        core: 'intermediate',
        intermediate: 'advanced',
        capstone: 'capstone'
      };

      nodes.push({
        nodeId,
        id: nodeId,
        title: m.title || `Milestone ${mIdx + 1}`,
        description: m.description || phase.description || `Master ${m.title || 'milestone'} competencies.`,
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

  return { nodes, edges };
}

export class RoadmapService {
  async generateRoadmap(userId: string, targetCareerInput?: string): Promise<IRoadmap> {
    const profile = await LearnerProfile.findOne({ userId });
    if (!profile) {
      throw ApiError.badRequest('Learner profile is required to generate a learning roadmap.');
    }

    let targetCareer = (targetCareerInput || profile.targetCareer || (profile as any).targetCareerGoal || '').trim();
    if (!targetCareer) {
      try {
        const topRecs = await recommendationService.getRecommendations(userId);
        if (topRecs && topRecs.length > 0) {
          targetCareer = topRecs[0].career;
        }
      } catch {
        // fallback
      }
    }

    if (!targetCareer) {
      targetCareer = 'Frontend Developer';
    }

    console.log(`[ROADMAP] requested career: ${targetCareerInput || profile.targetCareer}`);
    console.log(`[ROADMAP] normalized career: ${targetCareer}`);

    const normalizeCareerKey = (str: string): string => {
      return (str || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const normTarget = normalizeCareerKey(targetCareer);

    // Reuse existing roadmap if already created for this career field (prevent duplicate roadmaps)
    const existingRoadmaps = await Roadmap.find({ userId }).sort({ updatedAt: -1 });
    const existingMatch = existingRoadmaps.find((r) => {
      const rTitle = normalizeCareerKey(r.targetCareer || r.title || '');
      const rResolved = normalizeCareerKey((r as any).resolvedCareer || '');
      const rCareerId = normalizeCareerKey((r as any).careerId || '');
      const rReq = normalizeCareerKey((r as any).requestedCareer || '');

      return rTitle === normTarget || rResolved === normTarget || rCareerId === normTarget || rReq === normTarget;
    });

    if (existingMatch) {
      console.log(`[ROADMAP] Reusing existing roadmap '${existingMatch.title}' (${existingMatch._id}) for career '${targetCareer}'`);

      await Roadmap.updateMany(
        { userId, _id: { $ne: existingMatch._id } },
        { $set: { status: 'archived' } }
      );

      existingMatch.status = 'active';
      await existingMatch.save();

      profile.targetCareer = existingMatch.targetCareer || targetCareer;
      await profile.save();

      return existingMatch;
    }

    // 1. Authoritative Roadmap Structure from Python AI Service
    let pythonRoadmap: any = null;
    try {
      pythonRoadmap = await pythonAIService.generateRoadmapStructure(profile.toObject(), targetCareer);
      if (pythonRoadmap && pythonRoadmap.success === false) {
        console.warn(`[RoadmapService] Python service returned success=false for '${targetCareer}', engaging Gemini dynamic fallback.`);
        pythonRoadmap = null;
      }
    } catch (err: any) {
      console.warn(`[RoadmapService] Python microservice fallback: ${err.message}`);
    }

    // Fallback if Python failed
    if (!pythonRoadmap || !pythonRoadmap.phases) {
      const skillGap = await recommendationService.getSkillGapAnalysis(userId, targetCareer);
      const fallbackAi = await aiService.generateRoadmap({
        userId,
        profile: profile.toObject(),
        targetCareer,
        skillGap,
      });
      pythonRoadmap = {
        careerTitle: targetCareer,
        careerId: targetCareer.toLowerCase(),
        duration: 6,
        durationUnit: 'Months',
        estimatedHours: fallbackAi.estimatedHours || 200,
        phases: fallbackAi.phases || [],
        missingSkills: skillGap.missingSkills || [],
        resolution_method: 'fallback',
        confidence: 0.8,
      };
    }

    console.log(`[ROADMAP] resolved career: ${pythonRoadmap.resolved_career || pythonRoadmap.careerTitle}`);
    console.log(`[ROADMAP] resolved career ID: ${pythonRoadmap.career_id || pythonRoadmap.careerId}`);
    console.log(`[ROADMAP] resolution method: ${pythonRoadmap.resolution_method || 'exact'}`);
    console.log(`[ROADMAP] confidence: ${pythonRoadmap.confidence || 1.0}`);
    console.log(`[ROADMAP] required skills: ${JSON.stringify(pythonRoadmap.missingSkills || [])}`);

    // Sanity Check: Domain Consistency Validation (CAREER_ROADMAP_MISMATCH)
    const nonTechRoles = ['pilot', 'commercial pilot', 'airline pilot', 'civil engineer', 'accountant'];
    const lowerTarget = targetCareer.toLowerCase();
    const isNonTech = nonTechRoles.some(r => lowerTarget.includes(r));
    const allSkillsStr = JSON.stringify(pythonRoadmap.phases).toLowerCase();

    if (isNonTech && (allSkillsStr.includes('pytorch') || allSkillsStr.includes('linear algebra') || allSkillsStr.includes('react.js'))) {
      throw ApiError.badRequest(`CAREER_ROADMAP_MISMATCH: Non-tech career '${targetCareer}' erroneously contains software development skills.`);
    }

    // Ensure nodes & edges are derived if empty
    if (!pythonRoadmap.nodes || pythonRoadmap.nodes.length === 0) {
      const derived = deriveGraphFromPhases(pythonRoadmap.phases, pythonRoadmap.domain);
      pythonRoadmap.nodes = derived.nodes;
      pythonRoadmap.edges = derived.edges;
    }

    // 2. Gemini AI Content Enrichment (Projects, Docs, Videos, Flowchart)
    const enrichment = await aiService.enrichRoadmap({
      roadmapStructure: pythonRoadmap,
      profile: profile.toObject(),
      targetCareer: pythonRoadmap.careerTitle || targetCareer,
    });

    console.log(`[ROADMAP] final roadmap career: ${pythonRoadmap.careerTitle || targetCareer}`);

    // Deactivate all previous active roadmaps for this user so only the new career roadmap is active
    await Roadmap.updateMany(
      { userId, status: 'active' },
      { $set: { status: 'archived' } }
    );

    // 3. Strict Backend Validation: Filter out generic fallback URLs and enforce careers.csv metadata
    const sanitizeVerifiedResources = (phases: any[]) => {
      if (!Array.isArray(phases)) return [];
      return phases.map((phase) => {
        const rawRes = Array.isArray(phase.resources) ? phase.resources : [];
        const cleanRes = rawRes
          .filter((r: any) => {
            if (!r || typeof r !== 'object') return false;
            const url = (r.url || r.videoUrl || '').trim();
            if (!url || url === '#' || url.startsWith('javascript:')) return false;

            const genericFallbacks = [
              'https://youtube.com',
              'https://www.youtube.com/',
              'https://devdocs.io',
              'https://devdocs.io/',
              'https://github.com',
              'https://github.com/',
              'https://google.com/search'
            ];
            if (genericFallbacks.includes(url.toLowerCase()) || url.endsWith('youtube.com/') || url.endsWith('devdocs.io/')) {
              return false;
            }
            return true;
          })
          .map((r: any) => ({
            ...r,
            source: 'careers.csv',
            verified: true,
            provider: r.provider || 'Verified Educator',
            rating: r.rating || 4.8,
          }));

        const rawMilestones = Array.isArray(phase.milestones) ? phase.milestones : [];
        const cleanMilestones = rawMilestones.map((m: any, mIdx: number) => ({
          ...m,
          order: typeof m.order === 'number' ? m.order : mIdx + 1,
        }));

        return {
          ...phase,
          milestones: cleanMilestones,
          resources: cleanRes,
        };
      });
    };

    const sanitizedPhases = sanitizeVerifiedResources(pythonRoadmap.phases || []);

    console.log(`[ROADMAP_GENERATION] careerId=${pythonRoadmap.career_id || targetCareer} profileVersion=${profile.profileVersion || 1} masteredSkills=${(pythonRoadmap.masteredSkills || []).length} missingSkills=${(pythonRoadmap.missingSkills || []).length}`);

    // Create new Roadmap
    const roadmap = await Roadmap.create({
      userId,
      title: `${pythonRoadmap.resolved_career || pythonRoadmap.careerTitle || targetCareer} Learning Roadmap`,
      targetCareer: pythonRoadmap.careerTitle || targetCareer,
      requestedCareer: targetCareerInput || profile.targetCareer || targetCareer,
      resolvedCareer: pythonRoadmap.resolved_career || pythonRoadmap.careerTitle || targetCareer,
      careerId: pythonRoadmap.career_id || pythonRoadmap.careerId || targetCareer.toLowerCase(),
      domain: pythonRoadmap.domain || 'technology',
      sourceProvider: pythonRoadmap.source_provider || 'roadmap.sh',
      resolutionMethod: pythonRoadmap.resolution_method || 'exact',
      resolutionConfidence: pythonRoadmap.confidence || 1.0,
      duration: `${pythonRoadmap.duration || 6} ${pythonRoadmap.durationUnit || 'Months'}`,
      estimatedHours: pythonRoadmap.estimatedHours || 200,
      prerequisites: pythonRoadmap.phases?.[0]?.prerequisites || [],
      nodes: pythonRoadmap.nodes || [],
      edges: pythonRoadmap.edges || [],
      phases: sanitizedPhases,
      aiEnrichment: enrichment,
      profileVersion: profile.profileVersion || 1,
      isStale: false,
      status: 'active',
    });

    console.log(`[ROADMAP_SAVED] roadmapId=${roadmap._id} careerId=${roadmap.careerId} profileVersion=${roadmap.profileVersion}`);

    // Synchronize active career in LearnerProfile
    profile.targetCareer = pythonRoadmap.careerTitle || targetCareer;
    profile.targetCareerId = pythonRoadmap.career_id || targetCareer.toLowerCase();
    await profile.save();

    // Auto-create initial Progress documents for milestones
    if (roadmap.phases && Array.isArray(roadmap.phases)) {
      const progressDocs = [];
      for (const phase of roadmap.phases) {
        if (phase.milestones && Array.isArray(phase.milestones)) {
          for (const milestone of phase.milestones) {
            progressDocs.push({
              userId,
              roadmapId: roadmap._id,
              phaseId: phase.phaseId,
              milestoneId: milestone.milestoneId,
              status: 'not_started',
              completionPercentage: 0,
              timeSpent: 0,
            });
          }
        }
      }
      if (progressDocs.length > 0) {
        await Progress.insertMany(progressDocs);
      }
    }

    return roadmap;
  }

  async getUserRoadmaps(userId: string): Promise<IRoadmap[]> {
    const profile = await LearnerProfile.findOne({ userId });
    let userTargetCareer = (profile?.targetCareer || (profile as any)?.targetCareerGoal || '').trim();

    if (!userTargetCareer) {
      try {
        const topRecs = await recommendationService.getRecommendations(userId);
        if (topRecs && topRecs.length > 0) {
          userTargetCareer = topRecs[0].career;
        }
      } catch {
        // fallback
      }
    }

    const normalizeCareerKey = (str: string): string => {
      return (str || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    let roadmaps = await Roadmap.find({ userId }).sort({ createdAt: -1 });

    if (userTargetCareer) {
      const normTarget = normalizeCareerKey(userTargetCareer);

      let matchingRoadmap: any = roadmaps.find((r) => {
        const rTitle = normalizeCareerKey(r.targetCareer || r.title || '');
        const rResolved = normalizeCareerKey((r as any).resolvedCareer || '');
        const rCareerId = normalizeCareerKey((r as any).careerId || '');
        const rReq = normalizeCareerKey((r as any).requestedCareer || '');
        return rTitle === normTarget || rResolved === normTarget || rCareerId === normTarget || rReq === normTarget || rTitle.includes(normTarget) || normTarget.includes(rTitle);
      });

      if (!matchingRoadmap) {
        try {
          matchingRoadmap = await this.generateRoadmap(userId, userTargetCareer);
          roadmaps = await Roadmap.find({ userId }).sort({ createdAt: -1 });
        } catch (err) {
          console.warn('[RoadmapService] Error auto-generating roadmap for userTargetCareer:', err);
        }
      }

      if (matchingRoadmap) {
        if (matchingRoadmap.status !== 'active') {
          await Roadmap.updateMany({ userId }, { $set: { status: 'archived' } });
          matchingRoadmap.status = 'active';
          await matchingRoadmap.save();

          roadmaps.forEach((r) => {
            if (r._id.toString() === matchingRoadmap!._id.toString()) {
              r.status = 'active';
            } else {
              r.status = 'archived';
            }
          });
        }
      }
    }

    if (roadmaps.length === 0) {
      try {
        const generated = await this.generateRoadmap(userId, userTargetCareer || undefined);
        return [generated];
      } catch (err) {
        console.warn('[RoadmapService] Auto-generating roadmap error:', err);
        return [];
      }
    }

    const seenCareers = new Set<string>();
    const uniqueRoadmaps: typeof roadmaps = [];

    for (const rm of roadmaps) {
      const key = normalizeCareerKey(rm.targetCareer || rm.title || '');
      if (!seenCareers.has(key)) {
        seenCareers.add(key);
        uniqueRoadmaps.push(rm);
      }
    }

    // Sort active roadmap to top so active goal is selected first
    uniqueRoadmaps.sort((a, b) => (b.status === 'active' ? 1 : 0) - (a.status === 'active' ? 1 : 0));
    roadmaps = uniqueRoadmaps;

    // Ensure graph nodes and edges are populated and persisted for stored roadmaps
    for (const rm of roadmaps) {
      if (!rm.nodes || rm.nodes.length === 0) {
        console.warn(`[RoadmapService] Graph nodes empty for stored roadmap "${rm.title}", deriving graph DAG from phases.`);
        const derived = deriveGraphFromPhases(rm.phases, rm.domain);
        (rm as any).nodes = derived.nodes;
        (rm as any).edges = derived.edges;
        Roadmap.updateOne({ _id: rm._id }, { $set: { nodes: derived.nodes, edges: derived.edges } }).catch(err =>
          console.error('[RoadmapService] Failed to persist derived graph nodes:', err)
        );
      }
    }

    return roadmaps;
  }

  async getRoadmapById(id: string, userId: string): Promise<IRoadmap> {
    const profile = await LearnerProfile.findOne({ userId });
    let userTargetCareer = (profile?.targetCareer || (profile as any)?.targetCareerGoal || '').trim();

    if (!userTargetCareer) {
      try {
        const topRecs = await recommendationService.getRecommendations(userId);
        if (topRecs && topRecs.length > 0) {
          userTargetCareer = topRecs[0].career;
        }
      } catch {
        // fallback
      }
    }

    const normTarget = userTargetCareer ? userTargetCareer.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim() : '';
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);

    let result: IRoadmap | null = null;

    if (id === 'active') {
      result = await Roadmap.findOne({ userId, status: 'active' }).sort({ updatedAt: -1, createdAt: -1 });

      if (userTargetCareer) {
        const activeTarget = (result?.targetCareer || result?.title || result?.careerId || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

        if (!result || (!activeTarget.includes(normTarget) && !normTarget.includes(activeTarget))) {
          const targetMatch = await Roadmap.findOne({
            userId,
            $or: [
              { targetCareer: new RegExp(`^${userTargetCareer}$`, 'i') },
              { careerId: normTarget.replace(/\s+/g, '-') },
              { title: new RegExp(userTargetCareer, 'i') }
            ]
          }).sort({ updatedAt: -1 });

          if (targetMatch) {
            await Roadmap.updateMany({ userId }, { $set: { status: 'archived' } });
            targetMatch.status = 'active';
            await targetMatch.save();
            result = targetMatch;
          } else {
            result = await this.generateRoadmap(userId, userTargetCareer);
          }
        }
      }
    } else if (isValidObjectId) {
      result = await Roadmap.findOne({ _id: id, userId });
    }

    if (!result) {
      result = await Roadmap.findOne({ userId, $or: [{ careerId: id }, { targetCareer: id }] }).sort({ updatedAt: -1 });
    }

    if (!result) {
      result = await Roadmap.findOne({ userId, status: 'active' }).sort({ updatedAt: -1, createdAt: -1 });
    }

    if (!result) {
      result = await Roadmap.findOne({ userId }).sort({ updatedAt: -1, createdAt: -1 });
    }

    if (!result) {
      throw ApiError.notFound('Roadmap not found.');
    }

    // Check if roadmap is stale due to profile update
    if (profile && (result.profileVersion || 1) < (profile.profileVersion || 1)) {
      result.isStale = true;
    } else {
      result.isStale = false;
    }

    // Ensure graph nodes and edges are populated and persisted for stored roadmap
    if (!result.nodes || result.nodes.length === 0) {
      console.warn(`[RoadmapService] Graph nodes empty for roadmap "${result.title}", deriving graph DAG from phases.`);
      const derived = deriveGraphFromPhases(result.phases, result.domain);
      (result as any).nodes = derived.nodes;
      (result as any).edges = derived.edges;
      Roadmap.updateOne({ _id: result._id }, { $set: { nodes: derived.nodes, edges: derived.edges } }).catch(err =>
        console.error('[RoadmapService] Failed to persist derived graph nodes:', err)
      );
    }

    return result;
  }

  async toggleRoadmapMilestone(userId: string, roadmapId: string, phaseId: string, milestoneId: string): Promise<IRoadmap> {
    let roadmap = (roadmapId === 'active' || !roadmapId)
      ? await Roadmap.findOne({ userId, status: 'active' }).sort({ createdAt: -1 })
      : await Roadmap.findOne({ _id: roadmapId, userId });

    if (!roadmap) {
      roadmap = await Roadmap.findOne({ userId }).sort({ createdAt: -1 });
    }

    if (!roadmap) {
      throw ApiError.notFound('Roadmap not found.');
    }

    let milestoneToggled = false;
    let targetPhaseId = phaseId;
    let targetMilestoneId = milestoneId;
    let isCompleted = false;

    for (const phase of roadmap.phases) {
      if (!phaseId || phase.phaseId === phaseId || (phase as any)._id?.toString() === phaseId) {
        for (const milestone of phase.milestones) {
          if (milestone.milestoneId === milestoneId || (milestone as any)._id?.toString() === milestoneId) {
            milestone.completed = !milestone.completed;
            isCompleted = milestone.completed;
            targetPhaseId = phase.phaseId;
            targetMilestoneId = milestone.milestoneId;
            milestoneToggled = true;
            break;
          }
        }
      }
      if (milestoneToggled) break;
    }

    if (!milestoneToggled) {
      for (const phase of roadmap.phases) {
        for (const milestone of phase.milestones) {
          if (milestone.milestoneId === milestoneId || (milestone as any)._id?.toString() === milestoneId) {
            milestone.completed = !milestone.completed;
            isCompleted = milestone.completed;
            targetPhaseId = phase.phaseId;
            targetMilestoneId = milestone.milestoneId;
            milestoneToggled = true;
            break;
          }
        }
        if (milestoneToggled) break;
      }
    }

    // Ensure Progress document exists & delegate real-time updates & skill acquisition
    if (milestoneToggled) {
      await Progress.findOneAndUpdate(
        { userId, milestoneId: targetMilestoneId },
        {
          $setOnInsert: {
            userId,
            roadmapId: roadmap._id,
            phaseId: targetPhaseId,
            milestoneId: targetMilestoneId,
            status: 'not_started',
            completionPercentage: 0,
            timeSpent: 0,
          },
        },
        { upsert: true, new: true }
      );

      await progressService.updateProgress(userId, targetMilestoneId, {
        status: isCompleted ? 'completed' : 'in_progress',
        completionPercentage: isCompleted ? 100 : 0,
      });
    }

    const allMilestones = roadmap.phases.flatMap((p) => p.milestones);
    const completedCount = allMilestones.filter((m) => m.completed).length;
    const newPercent = allMilestones.length > 0
      ? Math.round((completedCount / allMilestones.length) * 100)
      : 0;

    if (!Array.isArray(roadmap.adaptiveEvents)) {
      roadmap.adaptiveEvents = [];
    }

    if (newPercent > (roadmap.overallCompletionPercent || 0)) {
      roadmap.adaptiveEvents.unshift({
        id: `adapt_${Date.now()}`,
        type: 'milestone_completed',
        message: `Milestone completed! Roadmap updated (${newPercent}% total progress achieved). Next prerequisite module unlocked.`,
        timestamp: new Date().toISOString()
      });
    }

    roadmap.overallCompletionPercent = newPercent;
    await roadmap.save();
    return roadmap;
  }


  async updateRoadmapStatus(id: string, userId: string, status: 'active' | 'completed' | 'archived'): Promise<IRoadmap> {
    const roadmap = await Roadmap.findOne({ _id: id, userId });
    if (!roadmap) {
      throw ApiError.notFound('Roadmap not found.');
    }
    roadmap.status = status;
    await roadmap.save();
    return roadmap;
  }

  async deleteRoadmap(id: string, userId: string): Promise<void> {
    const roadmap = await Roadmap.findOneAndDelete({ _id: id, userId });
    if (!roadmap) {
      throw ApiError.notFound('Roadmap not found.');
    }
    await Progress.deleteMany({ roadmapId: id, userId });
  }
}

export const roadmapService = new RoadmapService();
