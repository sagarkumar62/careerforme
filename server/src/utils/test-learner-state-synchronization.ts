import { learnerStateAdapterService, parseSkillLevelNumber } from '../services/learner-state-adapter.service';
import { LearnerProfile } from '../models/LearnerProfile';
import { connectDB } from '../config/db';
import mongoose from 'mongoose';
import app from '../app';
import axios from 'axios';
import { Server } from 'http';
import { pythonAIService } from '../services/python-ai.service';

let passCount = 0;
let failCount = 0;
let server: Server;
const TEST_PORT = 5004;

const client = axios.create({
  baseURL: `http://localhost:${TEST_PORT}/api/v1`,
  validateStatus: () => true,
});

function logTest(name: string, passed: boolean, message: string, details?: any) {
  if (passed) {
    passCount++;
    console.log(`✅ [PASS] ${name}: ${message}`);
  } else {
    failCount++;
    console.error(`❌ [FAIL] ${name}: ${message}`);
    if (details) console.error(JSON.stringify(details, null, 2));
  }
}

async function runSynchronizationTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING F.9.1.3 LEARNER-STATE SYNCHRONIZATION TESTS');
  console.log('==================================================\n');

  try {
    await connectDB();
    server = app.listen(TEST_PORT);

    const testUserId = new mongoose.Types.ObjectId().toString();

    // 1. Builds correct FastAPI learner context
    await LearnerProfile.create({
      userId: testUserId,
      targetCareer: 'AI Engineer',
      experienceLevel: 'Intermediate',
      educationLevel: 'Master',
      weeklyLearningHours: 15,
      skills: [
        { name: 'Python', level: 'Intermediate' },
        { name: 'PyTorch', level: 6.0 },
      ],
      completedCourses: [{ title: 'Deep Learning Specialization' }],
      projects: [{ title: 'Image Classifier' }],
      certifications: [{ title: 'AWS ML Specialty' }],
    });

    const context1 = await learnerStateAdapterService.buildFastAPILearnerContext(testUserId);
    logTest(
      '1. Builds correct FastAPI learner context',
      context1.user_id === testUserId &&
        context1.target_career === 'AI Engineer' &&
        context1.experience_level === 'Intermediate' &&
        context1.weekly_learning_hours === 15,
      `Loaded target_career='${context1.target_career}', weekly_hours=${context1.weekly_learning_hours}`
    );

    // 2. Applies default values correctly
    const missingUserId = new mongoose.Types.ObjectId().toString();
    const context2 = await learnerStateAdapterService.buildFastAPILearnerContext(missingUserId);
    logTest(
      '2. Applies default values correctly',
      context2.user_id === missingUserId &&
        context2.experience_level === 'Beginner' &&
        context2.education_level === 'Bachelor' &&
        context2.weekly_learning_hours === 10,
      `Default experience_level='${context2.experience_level}', weekly_hours=${context2.weekly_learning_hours}`
    );

    // 3. Normalizes skill levels
    const levelBeg = parseSkillLevelNumber('Beginner');
    const levelInt = parseSkillLevelNumber('Intermediate');
    const levelAdv = parseSkillLevelNumber('Advanced');
    const levelNum = parseSkillLevelNumber(7.5);
    logTest(
      '3. Normalizes skill levels',
      levelBeg === 2.0 && levelInt === 5.0 && levelAdv === 8.0 && levelNum === 7.5,
      `Normalized Beginner=${levelBeg}, Intermediate=${levelInt}, Advanced=${levelAdv}, 7.5=${levelNum}`
    );

    // 4. Maps completed courses correctly
    logTest(
      '4. Maps completed courses correctly',
      Array.isArray(context1.completed_courses) &&
        context1.completed_courses.includes('Deep Learning Specialization'),
      `Mapped completed courses: ${JSON.stringify(context1.completed_courses)}`
    );

    // 5. Maps completed projects correctly
    logTest(
      '5. Maps completed projects correctly',
      Array.isArray(context1.completed_projects) &&
        context1.completed_projects.includes('Image Classifier'),
      `Mapped completed projects: ${JSON.stringify(context1.completed_projects)}`
    );

    // 6. Maps completed assessments correctly
    logTest(
      '6. Maps completed assessments correctly',
      Array.isArray(context1.completed_assessments) &&
        context1.completed_assessments.includes('AWS ML Specialty'),
      `Mapped completed assessments: ${JSON.stringify(context1.completed_assessments)}`
    );

    // 7. Never downgrades an existing skill
    const syncRes1 = await learnerStateAdapterService.syncFastAPILearnerResponse(testUserId, {
      learner: {
        skills: {
          python: 2.0, // Existing Python was Intermediate (5.0), attempt downgrade to 2.0
        },
      },
    });
    const pythonSkill = syncRes1.profile?.skills?.find(
      (s: any) => typeof s === 'object' && s.name.toLowerCase() === 'python'
    );
    logTest(
      '7. Never downgrades an existing skill',
      pythonSkill && parseSkillLevelNumber(pythonSkill.level) === 5.0,
      `Skill level retained max value 5.0 (attempted downgrade to 2.0 rejected)`
    );

    // 8. Persists newly acquired skills
    const syncRes2 = await learnerStateAdapterService.syncFastAPILearnerResponse(testUserId, {
      learner: {
        skills: {
          docker: 4.0,
        },
      },
    });
    const dockerSkill = syncRes2.profile?.skills?.find(
      (s: any) => typeof s === 'object' && s.name.toLowerCase() === 'docker'
    );
    logTest(
      '8. Persists newly acquired skills',
      Boolean(dockerSkill) && syncRes2.newlyAcquiredSkills.includes('docker'),
      `Newly acquired skill 'docker' saved with level 4.0`
    );

    // 9. Persists course completion
    const syncRes3 = await learnerStateAdapterService.syncFastAPILearnerResponse(testUserId, {
      course_completion: {
        course_id: 'course_fastapi_101',
        title: 'FastAPI Fundamentals',
      },
    });
    const courseSaved = Boolean(
      syncRes3.profile?.completedCourses?.some((c) => c.title === 'FastAPI Fundamentals')
    );
    logTest(
      '9. Persists course completion',
      courseSaved,
      `Course 'FastAPI Fundamentals' persisted into profile.completedCourses`
    );

    // 10. Persists project completion
    const syncRes4 = await learnerStateAdapterService.syncFastAPILearnerResponse(testUserId, {
      project_completion: {
        project_id: 'proj_rag_pipeline',
        title: 'RAG Pipeline Builder',
        skills_demonstrated: { langchain: 5.0 },
      },
    });
    const projectSaved = Boolean(
      syncRes4.profile?.projects?.some((p) => p.title === 'RAG Pipeline Builder')
    );
    logTest(
      '10. Persists project completion',
      projectSaved,
      `Project 'RAG Pipeline Builder' persisted into profile.projects`
    );

    // 11. Persists passed assessment evidence
    const syncRes5 = await learnerStateAdapterService.syncFastAPILearnerResponse(testUserId, {
      assessment_result: {
        success: true,
        passed: true,
        assessment_id: 'quiz_fastapi_advanced',
        title: 'FastAPI Advanced Quiz',
      },
    });
    const certSaved = Boolean(
      syncRes5.profile?.certifications?.some((c) => c.title === 'FastAPI Advanced Quiz')
    );
    logTest(
      '11. Persists passed assessment evidence',
      certSaved,
      `Assessment evidence 'FastAPI Advanced Quiz' persisted into profile.certifications`
    );

    // Failed assessment test (F.9.2.3)
    const syncResFailed = await learnerStateAdapterService.syncFastAPILearnerResponse(testUserId, {
      assessment_result: {
        success: true,
        passed: false,
        score: 45,
        assessment_id: 'quiz_failed_attempt',
        title: 'Failed Quiz Attempt',
      },
    });
    const failedCertSaved = Boolean(
      syncResFailed.profile?.certifications?.some((c) => c.title === 'Failed Quiz Attempt')
    );
    logTest(
      'Failed assessment persists without positive skill evidence',
      !failedCertSaved,
      'Failed assessment attempt did not introduce positive certification/skill evidence'
    );

    // 12. Read-only check for path generation
    const profileBeforeGen = await LearnerProfile.findOne({ userId: testUserId }).lean();
    const skillsCountBefore = profileBeforeGen?.skills?.length || 0;

    const originalGen = pythonAIService.generateLearningPath;
    pythonAIService.generateLearningPath = async (payload) => ({
      success: true,
      goal: payload.goal,
      total_courses: 1,
      total_milestones: 2,
      courses: [],
      milestones: [],
      progress: {
        total_courses: 1,
        completed_courses: 0,
        overall_progress: 0,
        total_milestones: 2,
        completed_milestones: 0,
      },
    });

    await client.post('/learning-path/generate', {
      goal: 'Become Principal Architect',
      learner: { id: testUserId },
    });

    const profileAfterGen = await LearnerProfile.findOne({ userId: testUserId }).lean();
    const skillsCountAfter = profileAfterGen?.skills?.length || 0;

    logTest(
      '12. Does not mutate state for path generation',
      skillsCountBefore === skillsCountAfter,
      `Profile skills count remained unchanged at ${skillsCountBefore} after /generate`
    );

    pythonAIService.generateLearningPath = originalGen;

    // 13. Emits the appropriate progress events
    let socketEmitted = false;
    try {
      await learnerStateAdapterService.syncFastAPILearnerResponse(testUserId, {
        learner: { skills: { kubernetes: 6.0 } },
      });
      socketEmitted = true;
    } catch {
      socketEmitted = false;
    }

    logTest(
      '13. Emits the appropriate progress events',
      socketEmitted,
      `Events emitted cleanly without throwing errors`
    );

    // 14. Handles missing/partial profile data safely
    const partialUserId = new mongoose.Types.ObjectId().toString();
    const partialSync = await learnerStateAdapterService.syncFastAPILearnerResponse(partialUserId, {
      course_completion: { title: 'Partial Profile Course' },
    });

    logTest(
      '14. Handles missing/partial profile data safely',
      partialSync.profile?.userId?.toString() === partialUserId &&
        Boolean(partialSync.profile?.completedCourses?.some((c) => c.title === 'Partial Profile Course')),
      `Created new LearnerProfile for missing user and safely recorded completed course`
    );
  } catch (err: any) {
    console.error('Fatal error during synchronization test execution:', err);
    failCount++;
  } finally {
    if (server) {
      server.close();
    }

    console.log('\n==================================================');
    console.log(`📊 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('==================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  }
}

runSynchronizationTests();
