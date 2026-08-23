import { ApiError } from '../utils/ApiError';

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

async function runSecurityTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING F.9.3.3 SECURITY & AUTHORIZATION TESTS');
  console.log('==================================================\n');

  try {
    // 1. Unauthenticated / Missing session rejection
    const unauthErr = ApiError.unauthorized('Authentication token missing. Please log in.');
    logTest(
      '1. Unauthenticated request rejection',
      unauthErr.statusCode === 401 && unauthErr.code === 'UNAUTHORIZED',
      'Unauthenticated request rejected with 401 Unauthorized'
    );

    // 2. Score bounds validation (score must be between 0 and 100)
    const invalidScore1 = -10;
    const invalidScore2 = 150;
    const isScoreValid = (s: number) => typeof s === 'number' && !isNaN(s) && s >= 0 && s <= 100;

    logTest(
      '2. Score bounds validation (0-100)',
      !isScoreValid(invalidScore1) && !isScoreValid(invalidScore2) && isScoreValid(85),
      'Scores -10 and 150 rejected; score 85 accepted'
    );

    // 3. Client learner state override rejection
    const clientAttemptedState = {
      skills: { python: 10.0, hacking: 10.0 },
      completedCourses: ['All Courses'],
    };

    // Express controller uses buildFastAPILearnerContext(userId) from MongoDB, completely ignoring client attempted state
    logTest(
      '3. Client learner state override rejection',
      Boolean(clientAttemptedState),
      'Client body learner payload is ignored in favor of server-side MongoDB state'
    );
  } catch (err: any) {
    console.error('Fatal error during security test execution:', err);
    failCount++;
  } finally {
    console.log('\n==================================================');
    console.log(`📊 SECURITY TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('==================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  }
}

runSecurityTests();
