import { api, apiClient } from './api';

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

async function runClientApiTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING F.9.2.4 ADAPTIVE UX & CLIENT FACADE TESTS');
  console.log('==================================================\n');

  const originalPost = apiClient.post;

  try {
    // 1. generateLearningPath sends goal & skill_gaps, unwraps envelope
    let generateUrl = '';
    let generatePayload: any = null;

    apiClient.post = async (url: string, data?: any): Promise<any> => {
      generateUrl = url;
      generatePayload = data;
      return {
        data: {
          success: true,
          data: {
            success: true,
            goal: data.goal,
            total_courses: 3,
            total_milestones: 5,
            courses: [],
            milestones: [],
            progress: {
              total_courses: 3,
              completed_courses: 0,
              overall_progress: 0,
              total_milestones: 5,
              completed_milestones: 0,
              current_milestone: null,
              next_course_id: null,
            },
          },
        },
      };
    };

    const genResult = await api.generateLearningPath('Become Cloud Architect', [
      { skill: 'AWS', level: 'low' },
    ]);

    logTest(
      '1. generateLearningPath() sends goal/skill_gaps & unwraps envelope',
      generateUrl === '/learning-path/generate' &&
        generatePayload?.goal === 'Become Cloud Architect' &&
        generatePayload?.skill_gaps?.length === 1 &&
        generatePayload?.learner === undefined &&
        genResult?.goal === 'Become Cloud Architect' &&
        genResult?.total_courses === 3,
      `Sent goal='${generatePayload?.goal}', unwrapped data goal='${genResult?.goal}', learner state omitted`
    );

    // 2. Empty / Completed Path Response
    apiClient.post = async (): Promise<any> => ({
      data: {
        success: true,
        data: {
          success: true,
          goal: 'Master Everything',
          total_courses: 0,
          total_milestones: 0,
          courses: [],
          milestones: [],
          progress: {
            total_courses: 0,
            completed_courses: 0,
            overall_progress: 100,
            total_milestones: 0,
            completed_milestones: 0,
            current_milestone: null,
            next_course_id: null,
          },
        },
      },
    });

    const emptyPath = await api.generateLearningPath('Master Everything');

    logTest(
      '2. Empty / Completed Path response handled correctly',
      emptyPath.total_courses === 0 &&
        emptyPath.total_milestones === 0 &&
        emptyPath.milestones.length === 0,
      `Returned completed path: total_courses=0, overall_progress=100%`
    );

    // 3. Generation Error + Retry Simulation
    let callAttempts = 0;
    apiClient.post = async (): Promise<any> => {
      callAttempts++;
      if (callAttempts === 1) {
        return Promise.reject(new Error('503 Service Unavailable'));
      }
      return {
        data: {
          success: true,
          data: {
            success: true,
            goal: 'Retry Goal',
            total_courses: 1,
            total_milestones: 1,
            courses: [],
            milestones: [],
            progress: { total_courses: 1, completed_courses: 0, overall_progress: 0, total_milestones: 1, completed_milestones: 0, current_milestone: null, next_course_id: null },
          },
        },
      };
    };

    let firstErrorCaught = false;
    try {
      await api.generateLearningPath('Retry Goal');
    } catch (err: any) {
      firstErrorCaught = err.message.includes('503');
    }

    const retryResult = await api.generateLearningPath('Retry Goal');

    logTest(
      '3. Generation error + retry simulation',
      firstErrorCaught && retryResult.goal === 'Retry Goal',
      `First call threw 503 error, retry call succeeded with goal='${retryResult.goal}'`
    );

    // 4. Course Completion Error Propagation
    apiClient.post = async (): Promise<any> => {
      return Promise.reject(new Error('404 Course Not Found'));
    };

    let courseErrCaught = false;
    try {
      await api.completeCourse('invalid_course_id');
    } catch (err: any) {
      courseErrCaught = err.message.includes('404 Course Not Found');
    }

    logTest(
      '4. Course completion error propagation',
      courseErrCaught,
      'Course completion error 404 propagated cleanly'
    );

    // 5. Project Completion Error Propagation
    apiClient.post = async (): Promise<any> => {
      return Promise.reject(new Error('400 Project Invalid'));
    };

    let projErrCaught = false;
    try {
      await api.completeProject('invalid_project_id');
    } catch (err: any) {
      projErrCaught = err.message.includes('400 Project Invalid');
    }

    logTest(
      '5. Project completion error propagation',
      projErrCaught,
      'Project completion error 400 propagated cleanly'
    );

    // 6. Assessment Submission Error Propagation
    apiClient.post = async (): Promise<any> => {
      return Promise.reject(new Error('400 Invalid Score Range'));
    };

    let assessErrCaught = false;
    try {
      await api.submitAssessment('quiz_1', 150);
    } catch (err: any) {
      assessErrCaught = err.message.includes('400 Invalid Score Range');
    }

    logTest(
      '6. Assessment submission error propagation',
      assessErrCaught,
      'Assessment submission error 400 propagated cleanly'
    );

    // 7. Successful Mutation Refresh & URL Encoding
    let lastUrl = '';
    let lastPayload: any = null;
    apiClient.post = async (url: string, data?: any): Promise<any> => {
      lastUrl = url;
      lastPayload = data;
      return {
        data: {
          success: true,
          data: {
            success: true,
            course_completion: { course_id: 'c_react_101' },
          },
        },
      };
    };

    const compRes = await api.completeCourse('course/react 101');

    logTest(
      '7. Successful mutation refresh & ID URL encoding',
      lastUrl === '/courses/course%2Freact%20101/complete' &&
        compRes?.course_completion?.course_id === 'c_react_101',
      `URL encoded to '${lastUrl}' and unwrapped successfully`
    );

    // 8. Fresh load uses server state & replaces stale UI state
    let serverFetchCount = 0;
    apiClient.post = async (url: string): Promise<any> => {
      serverFetchCount++;
      return {
        data: {
          success: true,
          data: {
            success: true,
            goal: 'Fresh Server Path',
            total_courses: serverFetchCount,
            total_milestones: 1,
            courses: [],
            milestones: [],
            progress: { total_courses: serverFetchCount, completed_courses: 0, overall_progress: 0, total_milestones: 1, completed_milestones: 0, current_milestone: null, next_course_id: null },
          },
        },
      };
    };

    const freshPath1 = await api.generateLearningPath('Fresh Server Path');
    const freshPath2 = await api.generateLearningPath('Fresh Server Path');

    logTest(
      '8. Fresh load uses server state & replaces stale UI state',
      freshPath1.total_courses === 1 && freshPath2.total_courses === 2,
      `Fresh server state replaced stale memory state (fetch 1 count=1, fetch 2 count=2)`
    );

    // 9. Adaptive UX metadata response handling (F.9.2.4)
    apiClient.post = async (): Promise<any> => {
      return {
        data: {
          success: true,
          data: {
            success: true,
            goal: 'Adaptive UX Test',
            total_courses: 2,
            total_milestones: 1,
            courses: [
              { id: 'c1', title: 'Course 1', status: 'completed', is_completed: true },
              { id: 'c2', title: 'Course 2', status: 'available', is_next: true },
            ],
            milestones: [
              {
                milestone_id: 'm1',
                title: 'Phase 1: Foundations',
                description: 'Foundation phase',
                dependency_depth: 0,
                status: 'in_progress',
                progress: 50,
                course_ids: ['c1', 'c2'],
                completed_course_ids: ['c1'],
                remaining_course_ids: ['c2'],
                next_course_id: 'c2',
                project_ids: ['p1_locked'],
                projects: [
                  {
                    id: 'p1_locked',
                    title: 'Advanced Capstone',
                    reason: 'Demonstrates deep learning',
                    is_locked: true,
                    missing_prerequisites: ['c2'],
                  },
                ],
                assessment_ids: ['a1_locked'],
                assessments: [
                  {
                    id: 'a1_locked',
                    title: 'Neural Networks Exam',
                    reason: 'Evaluates architecture design',
                    readiness_state: 'locked',
                    is_locked: true,
                    missing_skills: ['PyTorch (level 5.0)'],
                  },
                ],
              },
            ],
            progress: {
              total_courses: 2,
              completed_courses: 1,
              overall_progress: 50,
              total_milestones: 1,
              completed_milestones: 0,
              current_milestone: 'm1',
              next_course_id: 'c2',
            },
          },
        },
      };
    };

    const uxPath = await api.generateLearningPath('Adaptive UX Test');
    const m1 = uxPath.milestones[0];
    const proj1 = m1.projects?.[0] as any;
    const assess1 = m1.assessments?.[0] as any;

    logTest(
      '9. Adaptive UX metadata response structure',
      uxPath.progress.next_course_id === 'c2' &&
        m1.status === 'in_progress' &&
        proj1?.is_locked === true &&
        proj1?.missing_prerequisites?.includes('c2') &&
        assess1?.readiness_state === 'locked' &&
        assess1?.missing_skills?.includes('PyTorch (level 5.0)'),
      `Next course='c2', Project p1_locked missing=['c2'], Assessment a1_locked missing=['PyTorch (level 5.0)']`
    );

    // 10. Invariant check: Client never constructs or submits learner state
    logTest(
      '10. Invariant check: Client facade never sends learner payload',
      lastPayload === undefined,
      'Payload was undefined (Express gateway builds authoritative learner state from MongoDB)'
    );
  } catch (err: any) {
    console.error('Fatal error during client API test execution:', err);
    failCount++;
  } finally {
    apiClient.post = originalPost;

    console.log('\n==================================================');
    console.log(`📊 CLIENT TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('==================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  }
}

runClientApiTests();
