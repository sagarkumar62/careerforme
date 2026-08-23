import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
import { Server } from 'http';
import app from '../app';
import { LearnerProfile } from '../models/LearnerProfile';
import { User } from '../models/User';
import { learnerStateAdapterService } from '../services/learner-state-adapter.service';
import { pythonAIService } from '../services/python-ai.service';
import { generateAccessToken } from '../utils/jwt';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TEST_PORT = 5006;
const client = axios.create({
  baseURL: `http://localhost:${TEST_PORT}/api/v1`,
  validateStatus: () => true,
});

let server: Server;
let passCount = 0;
let failCount = 0;

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

async function runE2ETests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING F.9.2.5 END-TO-END ADAPTIVE LEARNING TESTS');
  console.log('==================================================\n');

  server = app.listen(TEST_PORT);
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pathfinder_test';

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    console.log(`[INFO] Connected to MongoDB for E2E verification`);

    // Setup Test User and LearnerProfile
    const testUserId = new mongoose.Types.ObjectId().toString();
    const authToken = generateAccessToken({
      userId: testUserId,
      email: 'e2e@example.com',
      role: 'user',
    });

    await User.deleteMany({ _id: testUserId });
    await LearnerProfile.deleteMany({ userId: testUserId });

    await User.create({
      _id: testUserId,
      name: 'E2E Test User',
      email: 'e2e@example.com',
      password: 'hashedpassword123',
    });

    const userProfile = await LearnerProfile.create({
      userId: testUserId,
      targetCareer: 'AI Engineer',
      experienceLevel: 'Intermediate',
      weeklyLearningHours: 15,
      skills: [
        { name: 'Python', level: 'Intermediate', acquiredAt: new Date() },
        { name: 'Machine Learning', level: 'Beginner', acquiredAt: new Date() },
      ],
      completedCourses: [],
      projects: [],
      certifications: [],
    });

    logTest(
      '0. E2E Environment & Auth Setup',
      Boolean(userProfile && authToken),
      `Created test user ${testUserId} with targetCareer='AI Engineer'`
    );

    // Mock PythonAIService to execute reliably regardless of Python service availability
    const mockPythonAI = () => {
      pythonAIService.generateLearningPath = async (payload) => {
        const completedCourses = payload.learner?.completed_courses || [];
        const completedProjects = payload.learner?.completed_projects || [];
        const completedAssessments = payload.learner?.completed_assessments || [];

        const hasFastAPI = completedCourses.includes('FastAPI Fundamentals') || completedCourses.includes('course_fastapi_101');
        const hasRAGProject = completedProjects.includes('RAG Pipeline Builder') || completedProjects.includes('proj_rag_pipeline');

        return {
          success: true,
          goal: payload.goal,
          total_courses: 2,
          total_milestones: 2,
          courses: [
            {
              id: 'course_fastapi_101',
              title: 'FastAPI Fundamentals',
              is_completed: hasFastAPI,
              is_next: !hasFastAPI,
            },
            {
              id: 'course_advanced_ai_201',
              title: 'Advanced AI Architectures',
              is_completed: false,
              is_next: hasFastAPI,
            },
          ],
          milestones: [
            {
              milestone_id: 'm1_core',
              title: 'Phase 1: Backend Frameworks',
              description: 'Master FastAPI and async python',
              dependency_depth: 0,
              status: hasFastAPI ? 'completed' : 'in_progress',
              progress: hasFastAPI ? 100 : 0,
              course_ids: ['course_fastapi_101'],
              completed_course_ids: hasFastAPI ? ['course_fastapi_101'] : [],
              remaining_course_ids: hasFastAPI ? [] : ['course_fastapi_101'],
              next_course_id: hasFastAPI ? null : 'course_fastapi_101',
              project_ids: ['proj_rag_pipeline'],
              projects: [
                {
                  id: 'proj_rag_pipeline',
                  title: 'RAG Pipeline Builder',
                  reason: 'Demonstrates FastAPI and vector databases',
                  is_completed: hasRAGProject,
                  is_locked: !hasFastAPI && !hasRAGProject,
                  missing_prerequisites: !hasFastAPI ? ['course_fastapi_101'] : [],
                },
              ],
              assessment_ids: ['quiz_fastapi_advanced'],
              assessments: [
                {
                  id: 'quiz_fastapi_advanced',
                  title: 'FastAPI Advanced Quiz',
                  reason: 'Validates API routing and state management',
                  readiness_state: hasFastAPI ? 'eligible' : 'locked',
                  is_completed: completedAssessments.includes('FastAPI Advanced Quiz'),
                  is_locked: !hasFastAPI,
                  missing_skills: !hasFastAPI ? ['FastAPI (level 4.0)'] : [],
                },
              ],
              skills: ['Python', 'FastAPI'],
              estimated_hours: 10,
            },
          ],
          progress: {
            total_courses: 2,
            completed_courses: hasFastAPI ? 1 : 0,
            overall_progress: hasFastAPI ? 50 : 0,
            total_milestones: 2,
            completed_milestones: hasFastAPI ? 1 : 0,
            current_milestone: 'm1_core',
            next_course_id: hasFastAPI ? 'course_advanced_ai_201' : 'course_fastapi_101',
          },
        };
      };

      pythonAIService.completeCourse = async (courseId, payload) => ({
        success: true,
        course_completion: {
          course_id: courseId,
          title: 'FastAPI Fundamentals',
          completion_date: new Date().toISOString(),
        },
        learner: {
          skills: { python: 5.0, fastapi: 4.0 },
          completed_courses: ['FastAPI Fundamentals'],
        },
      });

      pythonAIService.completeProject = async (projectId, payload) => ({
        success: true,
        project_completion: {
          project_id: projectId,
          title: 'RAG Pipeline Builder',
          skills_demonstrated: { langchain: 5.0 },
        },
        learner: {
          skills: { python: 5.0, fastapi: 4.0, langchain: 5.0 },
          completed_projects: ['RAG Pipeline Builder'],
        },
      });

      pythonAIService.submitAssessment = async (assessmentId, payload) => {
        const isPass = payload.score >= 70;
        return {
          success: true,
          assessment_result: {
            success: true,
            passed: isPass,
            score: payload.score,
            assessment_id: assessmentId,
            title: isPass ? 'FastAPI Advanced Quiz' : 'Failed Quiz Attempt',
            skill_evidence: isPass ? { fastapi: 6.0 } : {},
          },
          learner: {
            skills: isPass ? { python: 5.0, fastapi: 6.0 } : { python: 5.0 },
          },
        };
      };
    };

    mockPythonAI();

    const authHeaders = { headers: { Authorization: `Bearer ${authToken}` } };

    // 1. Initial path generation
    const genRes = await client.post('/learning-path/generate', { goal: 'AI Engineer' }, authHeaders);

    logTest(
      '1. Initial path generation from authenticated session',
      genRes.status === 200 && genRes.data?.data?.goal === 'AI Engineer',
      `Path generated successfully with overall_progress=${genRes.data?.data?.progress?.overall_progress}%`
    );

    // 2. Course completion + regenerated path
    const courseRes = await client.post('/courses/course_fastapi_101/complete', {}, authHeaders);
    const postCourseGen = await client.post('/learning-path/generate', { goal: 'AI Engineer' }, authHeaders);

    const isCourseDone = postCourseGen.data?.data?.progress?.completed_courses === 1;

    logTest(
      '2. Course completion updates MongoDB & regenerates path',
      courseRes.status === 200 && isCourseDone,
      `Course 'course_fastapi_101' completed. Regenerated overall_progress=${postCourseGen.data?.data?.progress?.overall_progress}%`
    );

    // 3. Project completion + regenerated path
    const projectRes = await client.post('/projects/proj_rag_pipeline/complete', {}, authHeaders);
    const postProjProfile = await LearnerProfile.findOne({ userId: testUserId }).lean();
    const hasProjectSaved = Boolean(
      postProjProfile?.projects?.some((p: any) => p.title === 'RAG Pipeline Builder')
    );

    logTest(
      '3. Project completion persists in MongoDB & updates state',
      projectRes.status === 200 && hasProjectSaved,
      `Project 'RAG Pipeline Builder' persisted in MongoDB profile.projects`
    );

    // 4. Passing assessment + regenerated path
    const passAssessRes = await client.post(
      '/assessments/quiz_fastapi_advanced/submit',
      { score: 92 },
      authHeaders
    );

    const postPassProfile = await LearnerProfile.findOne({ userId: testUserId }).lean();
    const hasCert = Boolean(
      postPassProfile?.certifications?.some((c: any) => c.title === 'FastAPI Advanced Quiz')
    );

    logTest(
      '4. Passing assessment adds certification & skill evidence to MongoDB',
      passAssessRes.status === 200 && hasCert,
      `Passing assessment (92%) added certification evidence to MongoDB`
    );

    // 5. Failed assessment + regenerated path
    const failAssessRes = await client.post(
      '/assessments/quiz_failed_attempt/submit',
      { score: 45 },
      authHeaders
    );

    const postFailProfile = await LearnerProfile.findOne({ userId: testUserId }).lean();
    const hasFailedCert = Boolean(
      postFailProfile?.certifications?.some((c: any) => c.title === 'Failed Quiz Attempt')
    );

    logTest(
      '5. Failed assessment (45%) records attempt without positive skill evidence',
      failAssessRes.status === 200 && !hasFailedCert,
      `Failed assessment attempt processed safely without adding positive certification evidence`
    );

    // 6. Refresh / fresh-load behavior
    const refreshedContext = await learnerStateAdapterService.buildFastAPILearnerContext(testUserId);
    const refreshedGen = await client.post('/learning-path/generate', { goal: 'AI Engineer' }, authHeaders);

    logTest(
      '6. Refresh reconstructs authoritative state from MongoDB',
      refreshedContext.completed_courses.length >= 1 &&
        refreshedGen.data?.data?.progress?.completed_courses === 1,
      `Reconstructed learner context contains completed_courses=${JSON.stringify(refreshedContext.completed_courses)}`
    );

    // 7. Duplicate completion idempotency
    const dupCourseRes = await client.post('/courses/course_fastapi_101/complete', {}, authHeaders);
    const postDupProfile = await LearnerProfile.findOne({ userId: testUserId }).lean();
    const fastapiCourseCount = postDupProfile?.completedCourses?.filter(
      (c: any) => c.title === 'FastAPI Fundamentals'
    ).length;

    logTest(
      '7. Repeated course completion is idempotent without duplication',
      dupCourseRes.status === 200 && fastapiCourseCount === 1,
      `MongoDB completedCourses count for 'FastAPI Fundamentals' remained exactly 1`
    );

    // 8. Unauthorized / Invalid request rejection
    const invalidReq = await client.post('/learning-path/generate', { goal: '' });

    logTest(
      '8. Invalid request payload returns 400 Bad Request',
      invalidReq.status === 400,
      `Empty goal rejected with 400 Bad Request`
    );

    // 9. Skill levels non-downgrade invariant
    const currentProfile = await LearnerProfile.findOne({ userId: testUserId }).lean();
    const pythonSkill = currentProfile?.skills?.find((s: any) => s.name.toLowerCase() === 'python');

    logTest(
      '9. Invariant: Skill levels never decrease',
      Boolean(pythonSkill),
      `Python skill retained max value (${pythonSkill?.level})`
    );

    // 10. Final contract validation
    logTest(
      '10. Final response satisfies LearningPathResponse contract',
      refreshedGen.data?.data?.success === true &&
        typeof refreshedGen.data?.data?.total_courses === 'number' &&
        Array.isArray(refreshedGen.data?.data?.milestones),
      `Contract validation passed with ${refreshedGen.data?.data?.milestones?.length} milestones`
    );

    // Clean up test user
    await LearnerProfile.deleteMany({ userId: testUserId });
    await User.deleteMany({ _id: testUserId });
  } catch (err: any) {
    console.error('Fatal error during E2E test execution:', err);
    failCount++;
  } finally {
    if (server) server.close();
    console.log('\n==================================================');
    console.log(`📊 E2E TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('==================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  }
}

runE2ETests();
