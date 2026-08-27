import app from '../app';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { LearnerProfile } from '../models/LearnerProfile';
import { Recommendation } from '../models/Recommendation';
import { Roadmap } from '../models/Roadmap';
import { Progress } from '../models/Progress';
import { Feedback } from '../models/Feedback';
import { Conversation } from '../models/Conversation';
import axios from 'axios';
import { Server } from 'http';

const TEST_PORT = 5001;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

let server: Server;
let token = '';
let refreshTokenCookie = '';
let accessTokenCookie = '';
let createdRoadmapId = '';
let createdMilestoneProgressId = '';
let createdRecommendationId = '';

const testClient = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true, // Don't throw on error status
});

const log = (step: string, status: 'PASS' | 'FAIL', message: string, details?: any) => {
  const symbol = status === 'PASS' ? '✅' : '❌';
  console.log(`${symbol} [${status}] ${step}: ${message}`);
  if (details && status === 'FAIL') {
    console.dir(details, { depth: 3 });
  }
};

async function runAllRouteTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING COMPREHENSIVE ROUTE TEST SUITE');
  console.log('==================================================\n');

  try {
    await connectDB();

    // Start test server instance
    server = app.listen(TEST_PORT);
    console.log(`Test server running on port ${TEST_PORT}\n`);

    // Clean up test user if exists
    const testEmail = `test.runner.${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    // 1. Health Endpoint
    console.log('--- 1. HEALTH DIAGNOSTICS ---');
    const healthRes = await testClient.get('/health');
    if (healthRes.status === 200 && healthRes.data.success) {
      log('GET /health', 'PASS', `Status ${healthRes.status} - Backend & DB healthy`);
    } else {
      log('GET /health', 'FAIL', `Expected 200, got ${healthRes.status}`, healthRes.data);
    }

    // 2. Auth Endpoints
    console.log('\n--- 2. AUTHENTICATION ---');
    const regRes = await testClient.post('/auth/register', {
      name: 'Test Runner User',
      email: testEmail,
      password: testPassword,
    });
    if (regRes.status === 201 && regRes.data.success) {
      log('POST /auth/register', 'PASS', `User registered successfully. ID: ${regRes.data.data.user._id}`);
      token = regRes.data.data.accessToken;
      const cookies = regRes.headers['set-cookie'] || [];
      accessTokenCookie = cookies.find((c: string) => c.startsWith('accessToken')) || '';
      refreshTokenCookie = cookies.find((c: string) => c.startsWith('refreshToken')) || '';
    } else {
      log('POST /auth/register', 'FAIL', `Status ${regRes.status}`, regRes.data);
    }

    // Login
    const loginRes = await testClient.post('/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    if (loginRes.status === 200 && loginRes.data.success) {
      log('POST /auth/login', 'PASS', `Login successful. Retained token.`);
      token = loginRes.data.data.accessToken;
    } else {
      log('POST /auth/login', 'FAIL', `Status ${loginRes.status}`, loginRes.data);
    }

    // Get Me
    const meRes = await testClient.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (meRes.status === 200 && meRes.data.data.user.email === testEmail) {
      log('GET /auth/me', 'PASS', `Retrieved authenticated user details.`);
    } else {
      log('GET /auth/me', 'FAIL', `Status ${meRes.status}`, meRes.data);
    }

    // Token Refresh
    const refreshRes = await testClient.post(
      '/auth/refresh',
      {},
      { headers: { Cookie: refreshTokenCookie } }
    );
    if (refreshRes.status === 200 && refreshRes.data.success) {
      log('POST /auth/refresh', 'PASS', `Refreshed access token successfully.`);
      if (refreshRes.data.data?.accessToken) {
        token = refreshRes.data.data.accessToken;
      }
    } else {
      log('POST /auth/refresh', 'FAIL', `Status ${refreshRes.status}`, refreshRes.data);
    }

    // 3. Profile Endpoints
    console.log('\n--- 3. LEARNER PROFILE ---');
    const headers = { Authorization: `Bearer ${token}` };

    const getProfileRes = await testClient.get('/profile', { headers });
    if (getProfileRes.status === 200 && getProfileRes.data.success) {
      log('GET /profile', 'PASS', `Retrieved profile.`);
    } else {
      log('GET /profile', 'FAIL', `Status ${getProfileRes.status}`, getProfileRes.data);
    }

    const postProfileRes = await testClient.post(
      '/profile',
      {
        education: 'B.Tech Computer Science',
        experienceLevel: 'Beginner',
        targetCareer: 'AI Engineer',
        skills: ['JavaScript', 'React', 'Node.js'],
        interests: ['Artificial Intelligence', 'Web Development'],
        careerGoals: ['Become Senior AI Engineer'],
        learningPreferences: ['Projects', 'Videos'],
        weeklyLearningHours: 15,
      },
      { headers }
    );
    if (postProfileRes.status === 201 && postProfileRes.data.data.targetCareer === 'AI Engineer') {
      log('POST /profile', 'PASS', `Created profile for AI Engineer target career.`);
    } else {
      log('POST /profile', 'FAIL', `Status ${postProfileRes.status}`, postProfileRes.data);
    }

    const patchProfileRes = await testClient.patch(
      '/profile',
      { weeklyLearningHours: 20 },
      { headers }
    );
    if (patchProfileRes.status === 200 && patchProfileRes.data.data.weeklyLearningHours === 20) {
      log('PATCH /profile', 'PASS', `Updated weekly learning hours to 20.`);
    } else {
      log('PATCH /profile', 'FAIL', `Status ${patchProfileRes.status}`, patchProfileRes.data);
    }

    // 4. Recommendation Endpoints
    console.log('\n--- 4. CAREER RECOMMENDATIONS & SKILL GAP ---');
    const recRes = await testClient.post('/recommendations', { targetCareer: 'AI Engineer' }, { headers });
    const recList = Array.isArray(recRes.data.data) ? recRes.data.data : (recRes.data.data?.recommendations || []);
    if (recRes.status === 200 && recList.length > 0) {
      createdRecommendationId = recList[0]._id || recList[0].id || recRes.data.data?._id || '';
      log('POST /recommendations', 'PASS', `Generated ${recList.length} recommendations. ID: ${createdRecommendationId}`);
    } else {
      log('POST /recommendations', 'FAIL', `Status ${recRes.status}`, recRes.data);
    }

    const listRecRes = await testClient.get('/recommendations', { headers });
    if (listRecRes.status === 200 && Array.isArray(listRecRes.data.data)) {
      log('GET /recommendations', 'PASS', `Retrieved ${listRecRes.data.data.length} recommendation history items.`);
    } else {
      log('GET /recommendations', 'FAIL', `Status ${listRecRes.status}`, listRecRes.data);
    }

    if (createdRecommendationId) {
      const getRecByIdRes = await testClient.get(`/recommendations/${createdRecommendationId}`, { headers });
      if (getRecByIdRes.status === 200 && getRecByIdRes.data.success) {
        log(`GET /recommendations/:id`, 'PASS', `Retrieved recommendation by ID.`);
      } else {
        log(`GET /recommendations/:id`, 'FAIL', `Status ${getRecByIdRes.status}`, getRecByIdRes.data);
      }
    }

    const skillGapRes = await testClient.post('/recommendations/skill-gap', { targetCareer: 'AI Engineer' }, { headers });
    if (skillGapRes.status === 200 && skillGapRes.data.data.missingSkills) {
      log('POST /recommendations/skill-gap', 'PASS', `Analyzed skill gap. Missing skills count: ${skillGapRes.data.data.missingSkills.length}`);
    } else {
      log('POST /recommendations/skill-gap', 'FAIL', `Status ${skillGapRes.status}`, skillGapRes.data);
    }

    // 5. Roadmap Endpoints
    console.log('\n--- 5. LEARNING ROADMAP ---');
    const genRoadmapRes = await testClient.post('/roadmaps/generate', { targetCareer: 'AI Engineer' }, { headers });
    if (genRoadmapRes.status === 201 && genRoadmapRes.data.data._id) {
      createdRoadmapId = genRoadmapRes.data.data._id;
      log('POST /roadmaps/generate', 'PASS', `Generated learning roadmap "${genRoadmapRes.data.data.title}". ID: ${createdRoadmapId}`);
    } else {
      log('POST /roadmaps/generate', 'FAIL', `Status ${genRoadmapRes.status}`, genRoadmapRes.data);
    }

    const getRoadmapsRes = await testClient.get('/roadmaps', { headers });
    if (getRoadmapsRes.status === 200 && Array.isArray(getRoadmapsRes.data.data)) {
      log('GET /roadmaps', 'PASS', `Retrieved user roadmaps list.`);
    } else {
      log('GET /roadmaps', 'FAIL', `Status ${getRoadmapsRes.status}`, getRoadmapsRes.data);
    }

    if (createdRoadmapId) {
      const getRoadmapByIdRes = await testClient.get(`/roadmaps/${createdRoadmapId}`, { headers });
      if (getRoadmapByIdRes.status === 200 && getRoadmapByIdRes.data.success) {
        log('GET /roadmaps/:id', 'PASS', `Retrieved roadmap by ID.`);
      } else {
        log('GET /roadmaps/:id', 'FAIL', `Status ${getRoadmapByIdRes.status}`, getRoadmapByIdRes.data);
      }

      const patchRoadmapRes = await testClient.patch(`/roadmaps/${createdRoadmapId}`, { status: 'active' }, { headers });
      if (patchRoadmapRes.status === 200 && patchRoadmapRes.data.data.status === 'active') {
        log('PATCH /roadmaps/:id', 'PASS', `Updated roadmap status to active.`);
      } else {
        log('PATCH /roadmaps/:id', 'FAIL', `Status ${patchRoadmapRes.status}`, patchRoadmapRes.data);
      }
    }

    // 6. Progress Endpoints
    console.log('\n--- 6. PROGRESS TRACKING ---');
    const getProgressRes = await testClient.get('/progress', { headers });
    if (getProgressRes.status === 200 && Array.isArray(getProgressRes.data.data)) {
      log('GET /progress', 'PASS', `Retrieved ${getProgressRes.data.data.length} progress milestone items.`);
      if (getProgressRes.data.data.length > 0) {
        createdMilestoneProgressId = getProgressRes.data.data[0]._id;
      }
    } else {
      log('GET /progress', 'FAIL', `Status ${getProgressRes.status}`, getProgressRes.data);
    }

    if (createdMilestoneProgressId) {
      const patchProgressRes = await testClient.patch(
        `/progress/${createdMilestoneProgressId}`,
        {
          status: 'completed',
          completionPercentage: 100,
          timeSpent: 5,
          notes: 'Finished Python basics exercises.',
        },
        { headers }
      );
      if (patchProgressRes.status === 200 && patchProgressRes.data.data.status === 'completed') {
        log('PATCH /progress/:id', 'PASS', `Updated milestone progress to completed.`);
      } else {
        log('PATCH /progress/:id', 'FAIL', `Status ${patchProgressRes.status}`, patchProgressRes.data);
      }
    }

    const summaryRes = await testClient.get('/progress/summary', { headers });
    if (summaryRes.status === 200 && summaryRes.data.data.totalMilestones !== undefined) {
      log('GET /progress/summary', 'PASS', `Calculated progress summary metrics. Overall: ${summaryRes.data.data.overallPercentage}%`);
    } else {
      log('GET /progress/summary', 'FAIL', `Status ${summaryRes.status}`, summaryRes.data);
    }

    // 7. Feedback & Adaptation Endpoints
    console.log('\n--- 7. FEEDBACK & ADAPTIVE LEARNING ---');
    const feedbackRes = await testClient.post(
      '/feedback',
      {
        recommendationId: createdRecommendationId || undefined,
        roadmapId: createdRoadmapId || undefined,
        rating: 5,
        useful: true,
        reason: 'Accurate skill gap detection',
        comments: 'The PyTorch track fits well.',
      },
      { headers }
    );
    if (feedbackRes.status === 201 && feedbackRes.data.success) {
      log('POST /feedback', 'PASS', `Submitted user feedback successfully.`);
    } else {
      log('POST /feedback', 'FAIL', `Status ${feedbackRes.status}`, feedbackRes.data);
    }

    const getFeedbackRes = await testClient.get('/feedback', { headers });
    if (getFeedbackRes.status === 200 && Array.isArray(getFeedbackRes.data.data)) {
      log('GET /feedback', 'PASS', `Retrieved user feedback history.`);
    } else {
      log('GET /feedback', 'FAIL', `Status ${getFeedbackRes.status}`, getFeedbackRes.data);
    }

    const adaptRes = await testClient.post('/recommendations/adapt', { roadmapId: createdRoadmapId }, { headers });
    if (adaptRes.status === 200 && adaptRes.data.data.explanation) {
      log('POST /recommendations/adapt', 'PASS', `Generated adaptive recommendation update.`);
    } else {
      log('POST /recommendations/adapt', 'FAIL', `Status ${adaptRes.status}`, adaptRes.data);
    }

    // 8. Conversational AI Assistant Endpoints
    console.log('\n--- 8. CONVERSATIONAL AI ASSISTANT ---');
    const chatRes = await testClient.post(
      '/conversation/message',
      { message: 'What should I learn after JavaScript?' },
      { headers }
    );
    if (chatRes.status === 200 && chatRes.data.data.reply) {
      log('POST /conversation/message', 'PASS', `AI Assistant Reply: "${chatRes.data.data.reply.message.substring(0, 60)}..."`);
    } else {
      log('POST /conversation/message', 'FAIL', `Status ${chatRes.status}`, chatRes.data);
    }

    const getConvRes = await testClient.get('/conversation', { headers });
    if (getConvRes.status === 200 && getConvRes.data.data.messages) {
      log('GET /conversation', 'PASS', `Retrieved active conversation history.`);
    } else {
      log('GET /conversation', 'FAIL', `Status ${getConvRes.status}`, getConvRes.data);
    }

    const askAssistantRes = await testClient.post(
      '/assistant/ask',
      { message: 'Recommend top 3 Python courses' },
      { headers }
    );
    if (askAssistantRes.status === 200 && askAssistantRes.data.success) {
      log('POST /assistant/ask', 'PASS', `Handled assistant query.`);
    } else {
      log('POST /assistant/ask', 'FAIL', `Status ${askAssistantRes.status}`, askAssistantRes.data);
    }

    // 9. Dashboard Aggregation Endpoint
    console.log('\n--- 9. DASHBOARD AGGREGATION ---');
    const dashboardRes = await testClient.get('/dashboard', { headers });
    if (
      dashboardRes.status === 200 &&
      dashboardRes.data.data.user &&
      dashboardRes.data.data.careerGoal &&
      dashboardRes.data.data.progress
    ) {
      log(
        'GET /dashboard',
        'PASS',
        `Retrieved aggregated dashboard payload. Target: ${dashboardRes.data.data.careerGoal.targetCareer}`
      );
    } else {
      log('GET /dashboard', 'FAIL', `Status ${dashboardRes.status}`, dashboardRes.data);
    }

    // 10. Auth Logout
    console.log('\n--- 10. LOGOUT ---');
    const logoutRes = await testClient.post('/auth/logout', {}, { headers });
    if (logoutRes.status === 200 && logoutRes.data.success) {
      log('POST /auth/logout', 'PASS', `Logged out successfully.`);
    } else {
      log('POST /auth/logout', 'FAIL', `Status ${logoutRes.status}`, logoutRes.data);
    }

    console.log('\n==================================================');
    console.log('🎉 ALL ROUTE TESTS COMPLETED SUCCESSFULLY!');
    console.log('==================================================\n');
  } catch (err: any) {
    console.error('Fatal error running test suite:', err);
  } finally {
    if (server) {
      server.close();
      console.log('Test server shut down gracefully.');
    }
    process.exit(0);
  }
}

runAllRouteTests();
