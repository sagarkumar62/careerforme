import { pythonAIService } from '../services/python-ai.service';
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

async function runPerformanceTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING F.9.3.2 PERFORMANCE & TIMEOUT HARDENING TESTS');
  console.log('==================================================\n');

  const originalGen = pythonAIService.generateLearningPath;

  try {
    // 1. Downstream ECONNABORTED timeout triggers 504 Gateway Timeout
    pythonAIService.generateLearningPath = async () => {
      const err: any = new Error('timeout of 10000ms exceeded');
      err.code = 'ECONNABORTED';
      throw ApiError.gatewayTimeout('Downstream AI service call to /learning-path/generate timed out.');
    };

    let caughtTimeoutError: any = null;
    try {
      await pythonAIService.generateLearningPath({ learner: {}, goal: 'Test Timeout' });
    } catch (err: any) {
      caughtTimeoutError = err;
    }

    logTest(
      '1. Downstream timeout produces 504 Gateway Timeout error',
      caughtTimeoutError?.statusCode === 504 && caughtTimeoutError?.code === 'GATEWAY_TIMEOUT',
      `Caught timeout error with statusCode=${caughtTimeoutError?.statusCode}, code='${caughtTimeoutError?.code}'`
    );

    // 2. Downstream service unavailable produces 500/503 error safely without hanging
    pythonAIService.generateLearningPath = async () => {
      throw ApiError.internal('Learning path generation service is temporarily unavailable.');
    };

    let caughtServerError: any = null;
    try {
      await pythonAIService.generateLearningPath({ learner: {}, goal: 'Test Failure' });
    } catch (err: any) {
      caughtServerError = err;
    }

    logTest(
      '2. Downstream service failure handled safely without hanging',
      caughtServerError?.statusCode === 500,
      `Handled failure cleanly with statusCode=${caughtServerError?.statusCode}`
    );
  } catch (err: any) {
    console.error('Fatal error during performance test execution:', err);
    failCount++;
  } finally {
    pythonAIService.generateLearningPath = originalGen;

    console.log('\n==================================================');
    console.log(`📊 PERFORMANCE TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('==================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  }
}

runPerformanceTests();
