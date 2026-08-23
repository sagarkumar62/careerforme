import app from '../app';
import { pythonAIService } from '../services/python-ai.service';
import axios from 'axios';
import { Server } from 'http';

const TEST_PORT = 5003;
const client = axios.create({
  baseURL: `http://localhost:${TEST_PORT}/api/v1`,
  validateStatus: () => true,
});

let server: Server;
let passCount = 0;
let failCount = 0;

function logTestResult(name: string, passed: boolean, message: string, details?: any) {
  if (passed) {
    passCount++;
    console.log(`✅ [PASS] ${name}: ${message}`);
  } else {
    failCount++;
    console.error(`❌ [FAIL] ${name}: ${message}`);
    if (details) console.error(JSON.stringify(details, null, 2));
  }
}

async function runGatewayTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING F.9.1.2 LEARNING PATH GATEWAY TESTS');
  console.log('==================================================\n');

  server = app.listen(TEST_PORT);

  try {
    // 1. Successful forwarding & payload forwarding: generateLearningPath
    const originalGenerate = pythonAIService.generateLearningPath;
    let capturedGeneratePayload: any = null;

    pythonAIService.generateLearningPath = async (payload) => {
      capturedGeneratePayload = payload;
      return {
        success: true,
        goal: payload.goal,
        total_courses: 2,
        total_milestones: 4,
        courses: [{ id: 'c1', title: 'Course 1' }],
        milestones: [{ id: 'm1', title: 'Milestone 1' }],
        progress: {
          total_courses: 2,
          completed_courses: 0,
          overall_progress: 0,
          total_milestones: 4,
          completed_milestones: 0,
        },
      };
    };

    const genRes = await client.post('/learning-path/generate', {
      goal: 'Become AI Architect',
      learner: { id: 'learner_101', name: 'Alice' },
      skill_gaps: [{ skill: 'PyTorch', gap_level: 'high' }],
    });

    logTestResult(
      'POST /learning-path/generate (success & payload forwarding)',
      genRes.status === 200 &&
        genRes.data.success === true &&
        capturedGeneratePayload?.goal === 'Become AI Architect' &&
        capturedGeneratePayload?.learner?.id === 'learner_101' &&
        capturedGeneratePayload?.skill_gaps?.length === 1,
      `Status ${genRes.status}, Payload forwarded accurately`
    );

    // 2. Route parameters & payload forwarding: completeCourse
    let capturedCourseId = '';
    let capturedCoursePayload: any = null;

    pythonAIService.completeCourse = async (courseId, payload) => {
      capturedCourseId = courseId;
      capturedCoursePayload = payload;
      return {
        success: true,
        learner: { ...payload.learner, completed: [courseId] },
        course_completion: { course_id: courseId, status: 'completed' },
      };
    };

    const courseRes = await client.post('/courses/course_react_101/complete', {
      learner: { id: 'learner_101' },
    });

    logTestResult(
      'POST /courses/:courseId/complete (route param & forwarding)',
      courseRes.status === 200 &&
        courseRes.data.success === true &&
        capturedCourseId === 'course_react_101' &&
        capturedCoursePayload?.learner?.id === 'learner_101',
      `Status ${courseRes.status}, CourseId '${capturedCourseId}' forwarded`
    );

    // 3. Route parameters & payload forwarding: completeProject
    let capturedProjectId = '';
    let capturedProjectPayload: any = null;

    pythonAIService.completeProject = async (projectId, payload) => {
      capturedProjectId = projectId;
      capturedProjectPayload = payload;
      return {
        success: true,
        learner: { ...payload.learner, completed_projects: [projectId] },
        project_completion: { project_id: projectId, status: 'completed' },
      };
    };

    const projectRes = await client.post('/projects/proj_neural_net/complete', {
      learner: { id: 'learner_101' },
    });

    logTestResult(
      'POST /projects/:projectId/complete (route param & forwarding)',
      projectRes.status === 200 &&
        projectRes.data.success === true &&
        capturedProjectId === 'proj_neural_net' &&
        capturedProjectPayload?.learner?.id === 'learner_101',
      `Status ${projectRes.status}, ProjectId '${capturedProjectId}' forwarded`
    );

    // 4. Route parameters & payload forwarding: submitAssessment
    let capturedAssessmentId = '';
    let capturedAssessmentPayload: any = null;

    pythonAIService.submitAssessment = async (assessmentId, payload) => {
      capturedAssessmentId = assessmentId;
      capturedAssessmentPayload = payload;
      return {
        success: true,
        learner: payload.learner,
        assessment_result: { assessment_id: assessmentId, score: payload.score },
      };
    };

    const assessRes = await client.post('/assessments/quiz_python_basics/submit', {
      learner: { id: 'learner_101' },
      score: 92.5,
      user_answers: { q1: 'B', q2: 'D' },
    });

    logTestResult(
      'POST /assessments/:assessmentId/submit (route param & forwarding)',
      assessRes.status === 200 &&
        assessRes.data.success === true &&
        capturedAssessmentId === 'quiz_python_basics' &&
        capturedAssessmentPayload?.score === 92.5 &&
        capturedAssessmentPayload?.user_answers?.q1 === 'B',
      `Status ${assessRes.status}, AssessmentId '${capturedAssessmentId}' & score 92.5 forwarded`
    );

    // 5. Missing / Invalid request data validation
    const missingGoalRes = await client.post('/learning-path/generate', {
      learner: { id: 'learner_101' },
    });

    logTestResult(
      'Validation: Missing goal in /learning-path/generate',
      missingGoalRes.status === 400 && missingGoalRes.data.success === false,
      `Status ${missingGoalRes.status} Bad Request returned`
    );

    const missingLearnerRes = await client.post('/courses/c1/complete', {});

    logTestResult(
      'Validation: Missing learner in /courses/:courseId/complete',
      missingLearnerRes.status === 400 && missingLearnerRes.data.success === false,
      `Status ${missingLearnerRes.status} Bad Request returned`
    );

    const invalidScoreRes = await client.post('/assessments/a1/submit', {
      learner: { id: 'learner_101' },
      score: 'ninety-two',
    });

    logTestResult(
      'Validation: Invalid score in /assessments/:assessmentId/submit',
      invalidScoreRes.status === 400 && invalidScoreRes.data.success === false,
      `Status ${invalidScoreRes.status} Bad Request returned`
    );

    // 6. FastAPI / PythonAIService error translation
    pythonAIService.generateLearningPath = async () => {
      throw new Error('Learning path generation service is temporarily unavailable.');
    };

    const errorRes = await client.post('/learning-path/generate', {
      goal: 'Become AI Engineer',
      learner: { id: 'learner_101' },
    });

    logTestResult(
      'Error handling: Translate PythonAIService failure',
      errorRes.status >= 400 &&
        errorRes.data.success === false &&
        typeof errorRes.data.message === 'string',
      `Status ${errorRes.status}, Error message: '${errorRes.data.message}'`
    );

    // Restore original method
    pythonAIService.generateLearningPath = originalGenerate;
  } catch (err: any) {
    console.error('Fatal error during gateway test execution:', err);
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

runGatewayTests();
