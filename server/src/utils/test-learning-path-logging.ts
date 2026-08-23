import { logger, sanitizeLogContext, StructuredLogMeta } from './logger';

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

async function runLoggingTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING F.9.3.1 STRUCTURED LOGGING & OBSERVABILITY TESTS');
  console.log('==================================================\n');

  try {
    // 1. Sensitive Payload Redaction
    const sensitivePayload = {
      user_id: 'user_123',
      password: 'supersecretpassword123',
      token: 'bearer_token_xyz',
      jwt: 'ey.jwt.token',
      user_answers: { q1: 'A', q2: 'B' },
      learner: { skills: { python: 5.0 } },
      operation: 'assessment_submit',
    };

    const sanitized = sanitizeLogContext(sensitivePayload);

    logTest(
      '1. Sensitive payload redaction',
      sanitized.password === '[REDACTED]' &&
        sanitized.token === '[REDACTED]' &&
        sanitized.jwt === '[REDACTED]' &&
        sanitized.user_answers === '[REDACTED]' &&
        sanitized.learner === '[REDACTED]' &&
        sanitized.user_id === 'user_123',
      'Passwords, tokens, JWTs, user_answers, and learner objects redacted'
    );

    // 2. Successful Operation Logging Output
    const metaInfo: StructuredLogMeta = {
      requestId: 'req_test_123',
      userId: 'user_456',
      operation: 'learning_path_generate',
      downstreamEndpoint: '/learning-path/generate',
      durationMs: 42,
      statusCode: 200,
      success: true,
      details: { goal: 'Become AI Architect' },
    };

    const logEntry = logger.structured('info', metaInfo);

    logTest(
      '2. Successful operation logging output',
      logEntry.requestId === 'req_test_123' &&
        logEntry.operation === 'learning_path_generate' &&
        logEntry.statusCode === 200 &&
        logEntry.success === true,
      `Logged requestId='${logEntry.requestId}', durationMs=${logEntry.durationMs}ms, statusCode=200`
    );

    // 3. Downstream FastAPI Failure Logging
    const metaError: StructuredLogMeta = {
      requestId: 'req_err_789',
      userId: 'user_456',
      operation: 'course_complete',
      downstreamEndpoint: '/courses/c1/complete',
      durationMs: 120,
      statusCode: 503,
      success: false,
      errorCategory: 'DOWNSTREAM_OR_INTERNAL_FAILURE',
      errorMessage: 'FastAPI learning recommendation engine unavailable',
    };

    const logErrEntry = logger.structured('error', metaError);

    logTest(
      '3. Downstream FastAPI failure logging',
      logErrEntry.statusCode === 503 &&
        logErrEntry.errorCategory === 'DOWNSTREAM_OR_INTERNAL_FAILURE' &&
        logErrEntry.success === false,
      `Error logged with statusCode=503, category='DOWNSTREAM_OR_INTERNAL_FAILURE'`
    );

    // 4. Request / Correlation ID Propagation
    const metaCorrelation: StructuredLogMeta = {
      requestId: 'corr_hdr_abc123',
      operation: 'project_complete',
      downstreamEndpoint: '/projects/p1/complete',
      durationMs: 15,
      statusCode: 200,
      success: true,
    };

    const corrLog = logger.structured('info', metaCorrelation);

    logTest(
      '4. Request / Correlation ID propagation',
      corrLog.requestId === 'corr_hdr_abc123',
      `Correlation ID '${corrLog.requestId}' propagated cleanly into log output`
    );

    // 5. Learner State Synchronization Failure Logging
    const metaSyncErr: StructuredLogMeta = {
      requestId: 'sync_err_001',
      userId: 'user_999',
      operation: 'learner_state_sync',
      statusCode: 500,
      success: false,
      errorCategory: 'SYNC_FAILURE',
      errorMessage: 'MongoDB write timeout during state sync',
    };

    const syncLog = logger.structured('error', metaSyncErr);

    logTest(
      '5. Learner state synchronization failure logging',
      syncLog.operation === 'learner_state_sync' &&
        syncLog.errorCategory === 'SYNC_FAILURE' &&
        syncLog.statusCode === 500,
      `Sync failure logged with category='SYNC_FAILURE' and statusCode=500`
    );

    // 6. HTTP Error Status Preservation
    logTest(
      '6. HTTP error status preservation',
      logErrEntry.statusCode === 503 && syncLog.statusCode === 500,
      'HTTP status codes (503, 500) preserved accurately without silent conversion'
    );
  } catch (err: any) {
    console.error('Fatal error during logging test execution:', err);
    failCount++;
  } finally {
    console.log('\n==================================================');
    console.log(`📊 LOGGING TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('==================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  }
}

runLoggingTests();
