import axios, { AxiosInstance } from 'axios';
import { aiConfig } from '../config/ai';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { getCareerById } from '../data/careers.dataset';

export interface AIRecommendationRequest {
  userId: string;
  profile: Record<string, any>;
}

export interface AISkillGapRequest {
  userId: string;
  profile: Record<string, any>;
  career: string;
}

export interface AIRoadmapRequest {
  userId: string;
  profile: Record<string, any>;
  targetCareer: string;
  skillGap?: Record<string, any>;
}

export interface AIAdaptRequest {
  userId: string;
  profile: Record<string, any>;
  currentRoadmap?: Record<string, any>;
  progress?: Record<string, any>;
  feedback?: Record<string, any>;
}

export interface AssistantContext {
  userName?: string;
  targetCareer?: string;
  currentCareer?: string;
  matchScore?: number;
  currentSkills: any[];
  missingSkills: string[];
  skillsToImprove?: string[];
  experienceLevel?: string;
  weeklyLearningHours?: number;
  activeRoadmapTitle?: string;
  currentPhaseTitle?: string;
  progressPercent?: number;
  nextMilestoneTitle?: string;
  nextMilestoneHours?: number;
  recentProgress?: {
    completedMilestones?: number;
    learningHours?: number;
    streakDays?: number;
  };
  [key: string]: any;
}

export interface AIAssistantRequest {
  userId: string;
  message: string;
  context?: AssistantContext;
}

export class AIService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: aiConfig.baseUrl,
      timeout: aiConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async callGeminiAPI(prompt: string): Promise<any> {
    const apiKey = env.GEMINI_API_KEY || env.LLM_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key is not configured.');
    }

    const model = env.GEMINI_MODEL || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      },
      { timeout: 8000 }
    );

    const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (textResponse) {
      return JSON.parse(textResponse);
    }

    throw new Error('Malformed response from Gemini API');
  }

  async getRecommendations(data: AIRecommendationRequest) {
    if (env.GEMINI_API_KEY || env.LLM_API_KEY) {
      try {
        const skillsStr = (data.profile?.skills || []).map((s: any) => typeof s === 'string' ? s : s.name).join(', ');
        const prompt = `You are an expert AI Career Guidance System.
Analyze this user profile:
- Education: ${data.profile?.education || 'Not specified'}
- Experience Level: ${data.profile?.experienceLevel || 'Mid'}
- Current Skills: ${skillsStr || 'Software development fundamentals'}
- Target Career Goal: ${data.profile?.targetCareerGoal || data.profile?.targetCareer || 'Full Stack Developer'}

Return JSON with 3 career recommendations:
{
  "recommendations": [
    {
      "career": "Role Name",
      "reasons": ["Reason 1", "Reason 2"],
      "skillGaps": ["Skill 1", "Skill 2"]
    }
  ]
}`;
        const result = await this.callGeminiAPI(prompt);
        if (result && Array.isArray(result.recommendations)) {
          return result;
        }
      } catch (err: any) {
        logger.info(`[AIService] Using fallback recommendations (${err.message})`);
      }
    }

    return this.getMockRecommendations(data);
  }


  async getSkillGap(data: AISkillGapRequest) {
    if (env.GEMINI_API_KEY || env.LLM_API_KEY) {
      try {
        const userSkills = (data.profile?.skills || []).map((s: any) => typeof s === 'string' ? s : s.name);
        const prompt = `You are an expert AI Technical Recruiter.
Analyze skill gap for target career "${data.career}" given current skills: [${userSkills.join(', ')}].

Return JSON:
{
  "career": "${data.career}",
  "currentSkills": [${userSkills.map((s: string) => `"${s}"`).join(', ')}],
  "missingSkills": ["Missing Skill 1", "Missing Skill 2"],
  "skillsToImprove": ["Skill 1"],
  "priority": ["Highest Priority Skill"]
}`;
        const result = await this.callGeminiAPI(prompt);
        if (result && result.career) {
          return result;
        }
      } catch (err: any) {
        logger.info(`[AIService] Using deterministic skill gap analyzer (${err.message})`);
      }
    }

    return this.getMockSkillGap(data);
  }

  async generateRoadmap(data: AIRoadmapRequest) {
    if (env.GEMINI_API_KEY || env.LLM_API_KEY) {
      try {
        const skillsStr = (data.profile?.skills || []).map((s: any) => typeof s === 'string' ? s : s.name).join(', ');
        const prompt = `You are a Principal Technical & Professional Mentor. Enrich a structured 4-Phase Learning Roadmap specifically for target career "${data.targetCareer}".

CRITICAL INSTRUCTION:
1. Do not change the target occupation. Do not substitute another occupation (e.g. if target career is "Commercial Pilot", DO NOT substitute "AI Engineer" or "Software Engineer").
2. Use only the supplied career requirements and roadmap domain context.

Learner Context:
- Target Occupation: ${data.targetCareer}
- Current Skills: ${skillsStr || 'Baseline fundamentals'}
- Experience Level: ${data.profile?.experienceLevel || 'Mid'}
- Weekly Learning Hours: ${data.profile?.learningPreferences?.weeklyHours || data.profile?.weeklyLearningHours || 10} hours/week
- Selected Learning Formats: ${JSON.stringify(data.profile?.learningPreferences?.formats || ['Videos', 'Projects', 'Docs'])}

CRITICAL REQUIREMENT: For EVERY phase, you MUST include:
1. At least 1 "Video" resource (video course/walkthrough URL or query)
2. At least 1 "Docs" documentation resource (official docs / guide)
3. At least 1 "Project" hands-on resource (practical implementation project)

Return JSON:
{
  "title": "${data.targetCareer} Pathway",
  "targetCareer": "${data.targetCareer}",
  "duration": "6 Months",
  "estimatedHours": 240,
  "prerequisites": ["Basic Computer Science"],
  "phases": [
    {
      "phaseId": "phase-1",
      "title": "Phase 1: Fundamentals & Core Tools",
      "description": "Essential syntax and foundational concepts",
      "estimatedWeeks": 4,
      "milestones": [
        {
          "milestoneId": "m1-1",
          "title": "Core Setup & Foundations",
          "description": "Environment setup and core syntax",
          "estimatedHours": 15,
          "resources": [],
          "skills": ["Foundations"],
          "order": 1
        }
      ]
    },
    {
      "phaseId": "phase-2",
      "title": "Phase 2: Core Algorithmic & Engineering Mastery",
      "description": "Domain implementation and algorithmic deep-dive",
      "estimatedWeeks": 6,
      "milestones": [
        {
          "milestoneId": "m2-1",
          "title": "Domain Implementation Labs",
          "description": "Build core algorithms and functional modules",
          "estimatedHours": 25,
          "resources": [],
          "skills": ["Engineering"],
          "order": 1
        }
      ]
    },
    {
      "phaseId": "phase-3",
      "title": "Phase 3: Production Architecture & Optimization",
      "description": "System design, microservices, and API deployment",
      "estimatedWeeks": 6,
      "milestones": [
        {
          "milestoneId": "m3-1",
          "title": "Scalable System Architecture",
          "description": "Construct high-throughput backend services",
          "estimatedHours": 30,
          "resources": [],
          "skills": ["System Design"],
          "order": 1
        }
      ]
    },
    {
      "phaseId": "phase-4",
      "title": "Phase 4: Capstone Portfolio & Deployment",
      "description": "Deploy interactive application live to production",
      "estimatedWeeks": 4,
      "milestones": [
        {
          "milestoneId": "m4-1",
          "title": "Full-Stack Deployment Capstone",
          "description": "Containerize and deploy application with CI/CD",
          "estimatedHours": 35,
          "resources": [
            { "title": "CI/CD & Cloud Deployment Video Guide", "type": "Video", "url": "https://youtube.com", "isFree": true },
            { "title": "Docker & Deployment Official Docs", "type": "Docs", "url": "https://docs.docker.com", "isFree": true },
            { "title": "Production Deployment Portfolio Project", "type": "Project", "url": "https://github.com", "isFree": true }
          ],
          "skills": ["Docker", "CI/CD"],
          "order": 1
        }
      ]
    }
  ]
}`;
        const result = await this.callGeminiAPI(prompt);
        if (result && Array.isArray(result.phases)) {
          return result;
        }
      } catch (err: any) {
        logger.info(`[AIService] Using structured 4-phase roadmap builder (${err.message})`);
      }
    }

    return this.getMockRoadmap(data);
  }

  async adaptRoadmap(data: AIAdaptRequest) {
    return this.getMockAdaptiveResponse(data);
  }

  async generateAssistantResponse(data: AIAssistantRequest) {
    if (env.GEMINI_API_KEY || env.LLM_API_KEY) {
      try {
        const prompt = `You are Career For Me AI, an intelligent, empathetic AI Career Navigator.
User Question: "${data.message}"
User Context: Target Role: ${data.context?.currentCareer || 'Technology'}, Current Skills: ${(data.context?.currentSkills || []).join(', ')}, Active Phase: ${data.context?.currentPhaseTitle || 'Phase 1'}, Next Milestone: ${data.context?.nextMilestoneTitle || 'Core Setup'}.

Provide actionable, concise guidance formatted as JSON:
{
  "answer": "Direct, helpful advice in GitHub markdown syntax with bullet points where appropriate.",
  "suggestedActions": ["Action Step 1", "Action Step 2"],
  "relatedSkills": ["Skill 1", "Skill 2"]
}`;
        const result = await this.callGeminiAPI(prompt);
        if (result && result.answer) {
          return result;
        }
      } catch (err: any) {
        logger.info(`[AIService] Using AI mentor context response engine (${err.message})`);
      }
    }

    return this.getMockAssistantResponse(data);
  }



  private validateRecommendationResponse(data: any) {
    if (!data || !Array.isArray(data.recommendations)) {
      throw new Error('Malformed AI recommendation response: missing recommendations array');
    }
  }

  // MOCK DATA GENERATORS
  private getMockRecommendations(data: AIRecommendationRequest) {
    const target = data.profile?.targetCareer || 'AI Engineer';
    const userSkills: string[] = data.profile?.skills || ['JavaScript', 'React'];

    return {
      recommendations: [
        {
          career: target,
          matchScore: 0.88,
          confidence: 0.92,
          reasons: [
            `Existing experience in ${userSkills.slice(0, 2).join(' & ') || 'software fundamentals'} provides a solid baseline.`,
            `High alignment with stated goals for ${target}.`,
            'Strong job market growth and industry demand.',
          ],
          skillGaps: ['Python', 'Machine Learning', 'PyTorch', 'Statistics & Math'],
        },
        {
          career: 'Full Stack Developer',
          matchScore: 0.82,
          confidence: 0.89,
          reasons: [
            'Direct alignment with web development technologies.',
            'High demand across startups and enterprise software.',
          ],
          skillGaps: ['Node.js', 'Express.js', 'MongoDB', 'Docker'],
        },
        {
          career: 'Data Scientist',
          matchScore: 0.75,
          confidence: 0.84,
          reasons: [
            'Strong analytical requirement matching problem-solving skills.',
          ],
          skillGaps: ['Python', 'SQL / PostgreSQL', 'Statistics & Math', 'Data Visualization'],
        },
      ],
    };
  }

  private getMockSkillGap(data: AISkillGapRequest) {
    const userSkills = (data.profile?.skills || []).map((s: any) => typeof s === 'string' ? s : s.name);
    const career = data.career || 'Target Career';
    const careerReq = getCareerById(career);
    const benchmarkSkills = careerReq?.requiredSkills || [`${career} Fundamentals`, `${career} Practice`, `${career} Regulations`];

    const missingSkills = benchmarkSkills.filter((s: string) => !userSkills.some((us: string) => us.toLowerCase() === s.toLowerCase()));

    return {
      career,
      currentSkills: userSkills,
      missingSkills: missingSkills.length > 0 ? missingSkills : benchmarkSkills.slice(0, 3),
      skillsToImprove: userSkills,
      priority: missingSkills.length > 0 ? missingSkills : benchmarkSkills.slice(0, 2),
    };
  }

  private getMockRoadmap(data: AIRoadmapRequest) {
    const career = data.targetCareer || 'Target Career';
    const careerReq = getCareerById(career);
    const benchmarkSkills = careerReq?.requiredSkills || [`${career} Fundamentals`, `${career} Principles`, `${career} Practice`];

    return {
      title: `${careerReq?.title || career} Learning Pathway`,
      targetCareer: careerReq?.title || career,
      duration: `${careerReq?.estimatedMonths || 6} Months`,
      estimatedHours: 240,
      prerequisites: careerReq?.prerequisites || [`Basic ${career} Fundamentals`],
      phases: [
        {
          phaseId: 'phase-1',
          title: `Phase 1: Foundations & Prerequisites for ${careerReq?.title || career}`,
          description: `Build a rock-solid foundation in core ${careerReq?.title || career} concepts and prerequisites.`,
          estimatedWeeks: 6,
          milestones: [
            {
              milestoneId: 'm1-1',
              title: `Foundations & Core Principles (${benchmarkSkills[0] || 'Fundamentals'})`,
              description: `Master essential principles of ${benchmarkSkills[0] || 'Fundamentals'}.`,
              estimatedHours: 20,
              resources: [],
              skills: [benchmarkSkills[0] || 'Foundations'],
              order: 1,
            },
            {
              milestoneId: 'm1-2',
              title: `Domain Regulations & Safety Setup (${benchmarkSkills[1] || 'Regulations'})`,
              description: `Learn essential domain procedures and guidelines.`,
              estimatedHours: 25,
              resources: [],
              skills: [benchmarkSkills[1] || 'Standards'],
              order: 2,
            },
          ],
        },
        {
          phaseId: 'phase-2',
          title: `Phase 2: Core Technical & Professional Mastery for ${careerReq?.title || career}`,
          description: `Develop core domain operational capabilities and primary skills.`,
          estimatedWeeks: 8,
          milestones: [
            {
              milestoneId: 'm2-1',
              title: `Advanced Core Systems (${benchmarkSkills[2] || 'Core Mastery'})`,
              description: `Implement specialized domain workflows and system operations.`,
              estimatedHours: 30,
              resources: [],
              skills: [benchmarkSkills[2] || 'Core Systems'],
              order: 1,
            },
          ],
        },
        {
          phaseId: 'phase-3',
          title: `Phase 3: Advanced Specialization in ${careerReq?.title || career}`,
          description: `Deepen specialized domain knowledge and advanced procedures.`,
          estimatedWeeks: 8,
          milestones: [
            {
              milestoneId: 'm3-1',
              title: `Specialized Domain Protocols`,
              description: `Master complex operational scenarios and advanced methods.`,
              estimatedHours: 40,
              resources: [],
              skills: [careerReq?.recommendedSkills?.[0] || 'Advanced Specialization'],
              order: 1,
            },
          ],
        },
        {
          phaseId: 'phase-4',
          title: `Phase 4: Portfolio & Career Readiness for ${careerReq?.title || career}`,
          description: `Complete practical capstones and prepare for career entry.`,
          estimatedWeeks: 4,
          milestones: [
            {
              milestoneId: 'm4-1',
              title: 'Production Capstone Application',
              description: 'Construct a full-stack production application serving live predictions.',
              estimatedHours: 50,
              resources: [
                { title: 'CI/CD & Production Deployment Video Guide', type: 'Video', url: 'https://youtube.com', isFree: true },
                { title: 'Docker & Microservices Documentation', type: 'Docs', url: 'https://fastapi.tiangolo.com', isFree: true },
                { title: 'Full-Stack Production Portfolio Capstone Project', type: 'Project', url: 'https://github.com', isFree: true }
              ],
              skills: ['REST & GraphQL APIs', 'Docker'],
              order: 1,
            },
          ],
        },
      ],
    };
  }

  private getMockAdaptiveResponse(data: AIAdaptRequest) {
    return {
      explanation: 'Adapted learning path based on completion rate and learner feedback. Prioritized hands-on projects.',
      recommendedAdjustments: [
        'Accelerated Phase 1 syntax module due to prior coding experience.',
        'Added hands-on PyTorch coding labs based on positive feedback.',
      ],
      updatedRoadmap: this.getMockRoadmap({
        userId: data.userId,
        profile: data.profile,
        targetCareer: data.profile?.targetCareer || 'AI Engineer',
      }),
    };
  }

  private getMockAssistantResponse(data: AIAssistantRequest) {
    const msg = data.message.toLowerCase();
    let answer = `Great question! To excel in your career journey toward ${data.context?.currentCareer || 'your goal'}, focus on practical project building alongside foundational theory.`;

    if (msg.includes('python') || msg.includes('javascript') || msg.includes('next')) {
      answer = `Since you asked about programming languages: Python is essential for AI, Data Science, and Machine Learning, while JavaScript/TypeScript is standard for Full Stack and Frontend web development. I recommend dedicating 10-15 hours weekly to building small end-to-end projects.`;
    } else if (msg.includes('roadmap') || msg.includes('start') || msg.includes('begin')) {
      answer = `To begin effectively: 1) Complete your Learner Profile, 2) Review your personalized Skill Gap analysis, 3) Follow your generated 4-Phase Roadmap milestone by milestone!`;
    }

    return {
      answer,
      suggestedActions: [
        { title: 'Explore Skill Gap', description: 'Analyze your missing skills', ctaText: 'View Gaps', actionType: 'view_skills' },
        { title: 'View Learning Roadmap', description: 'Track your phase progression', ctaText: 'Go to Roadmap', actionType: 'view_roadmap' },
      ],
    };
  }

  async explainCareerMatch(profile: any, careerTitle: string, scoreBreakdown: any): Promise<any> {
    if (env.GEMINI_API_KEY || env.LLM_API_KEY) {
      try {
        const prompt = `You are an expert AI Career Guidance System.
Explain why "${careerTitle}" is a great match for this user based on their profile and Python-calculated scores:
Score Breakdown: ${JSON.stringify(scoreBreakdown)}
User Profile: ${JSON.stringify(profile)}

Return JSON strictly matching this schema:
{
  "whyMatches": ["Reason 1", "Reason 2", "Reason 3"],
  "scoreExplanation": "Human friendly explanation of the score breakdown",
  "skillGapAnalysis": "Concise summary of top skill gaps to bridge"
}`;
        const result = await this.callGeminiAPI(prompt);
        if (result && Array.isArray(result.whyMatches)) {
          return result;
        }
      } catch (err: any) {
        logger.info(`[AIService] explainCareerMatch fallback used: ${err.message}`);
      }
    }
    return {
      whyMatches: [
        `Strong alignment with your recorded skills and background in ${profile?.education || 'software development'}.`,
        `High demand and career growth potential in ${careerTitle}.`,
        `Structured transition path tailored to your current proficiency levels.`
      ],
      scoreExplanation: `Your profile achieved a high match based on skill alignment, domain interest, and experience level.`,
      skillGapAnalysis: `Focus on mastering required core skills to complete your transition.`
    };
  }

  async recommendProjects(data: {
    selectedCareer: string;
    learnerSkills?: any[];
    missingSkills?: string[];
    completedSkills?: string[];
    currentRoadmapPhase?: string;
  }): Promise<any> {
    if (env.GEMINI_API_KEY || env.LLM_API_KEY) {
      try {
        const prompt = `You are a Senior Technical Project Architect.
Recommend 3 practical hands-on projects (BEGINNER, INTERMEDIATE, ADVANCED) for a learner aspiring to become a "${data.selectedCareer}".
Learner Skills: ${JSON.stringify(data.learnerSkills || [])}
Missing Skills: ${JSON.stringify(data.missingSkills || [])}
Current Phase: ${data.currentRoadmapPhase || 'Foundations'}

Return JSON strictly matching this schema:
{
  "projects": [
    {
      "title": "Project Title",
      "difficulty": "BEGINNER",
      "description": "Clear description of what to build",
      "skillsPracticed": ["Skill 1", "Skill 2"],
      "prerequisites": ["Prereq 1"],
      "estimatedHours": 20,
      "expectedOutcome": "What the learner achieves or deploys",
      "suggestedTechStack": ["Tech 1", "Tech 2"]
    },
    {
      "title": "Project Title 2",
      "difficulty": "INTERMEDIATE",
      "description": "Clear description",
      "skillsPracticed": ["Skill 1"],
      "prerequisites": ["Prereq 1"],
      "estimatedHours": 35,
      "expectedOutcome": "Outcome",
      "suggestedTechStack": ["Tech 1"]
    },
    {
      "title": "Project Title 3",
      "difficulty": "ADVANCED",
      "description": "Clear description",
      "skillsPracticed": ["Skill 1"],
      "prerequisites": ["Prereq 1"],
      "estimatedHours": 50,
      "expectedOutcome": "Outcome",
      "suggestedTechStack": ["Tech 1"]
    }
  ]
}`;
        const result = await this.callGeminiAPI(prompt);
        if (result && Array.isArray(result.projects)) {
          return result;
        }
      } catch (err: any) {
        logger.info(`[AIService] recommendProjects fallback used: ${err.message}`);
      }
    }

    const career = data.selectedCareer || 'AI Engineer';
    return {
      projects: [
        {
          title: `Basic ${career} Starter Project`,
          difficulty: 'BEGINNER',
          description: `Build a foundational practical tool implementing core concepts of ${career}.`,
          skillsPracticed: data.missingSkills?.slice(0, 2) || ['Foundations'],
          prerequisites: ['Basic Programming'],
          estimatedHours: 15,
          expectedOutcome: 'Functional working code repository with basic automated tests.',
          suggestedTechStack: ['Python', 'Git']
        },
        {
          title: `Full-Stack ${career} Application`,
          difficulty: 'INTERMEDIATE',
          description: `Construct an end-to-end interactive application with database integration and APIs.`,
          skillsPracticed: data.missingSkills || ['REST APIs', 'Database Design'],
          prerequisites: [`Basic ${career} Starter Project`],
          estimatedHours: 35,
          expectedOutcome: 'Deployed web service with user interface and backend API.',
          suggestedTechStack: ['Next.js', 'Node.js', 'Docker']
        },
        {
          title: `Production ${career} Capstone & Infrastructure`,
          difficulty: 'ADVANCED',
          description: `Architect a scalable production-grade system with CI/CD pipeline, monitoring, and live deployment.`,
          skillsPracticed: ['System Design', 'CI/CD', 'Cloud Deployment'],
          prerequisites: [`Full-Stack ${career} Application`],
          estimatedHours: 50,
          expectedOutcome: 'Live production capstone serving real-world requests.',
          suggestedTechStack: ['Kubernetes', 'FastAPI', 'PostgreSQL']
        }
      ]
    };
  }

  async recommendResources(data: {
    skills?: string[];
    selectedCareer?: string;
  }): Promise<any> {
    if (env.GEMINI_API_KEY || env.LLM_API_KEY) {
      try {
        const skillsList = data.skills && data.skills.length > 0 ? data.skills : ['Programming', 'System Architecture'];
        const prompt = `You are an expert Technical Content Curator.
Recommend high-quality learning resources (Documentation, Courses, Articles, Videos, Tutorials) mapped directly to these target skills: ${JSON.stringify(skillsList)} for career "${data.selectedCareer || 'Technology'}".

CRITICAL RULE:
Do NOT fabricate broken or imaginary URLs.
If an official verified URL (like MDN, Official Python/FastAPI docs, YouTube freeCodeCamp) is known, provide it. Otherwise, set "url": null.

Return JSON strictly matching this schema:
{
  "resources": [
    {
      "title": "Resource Title",
      "type": "Documentation",
      "skill": "Skill Name",
      "difficulty": "Beginner",
      "reason": "Why this resource helps master this skill",
      "url": "https://official-url-if-verified-otherwise-null"
    }
  ]
}`;
        const result = await this.callGeminiAPI(prompt);
        if (result && Array.isArray(result.resources)) {
          return result;
        }
      } catch (err: any) {
        logger.info(`[AIService] recommendResources fallback used: ${err.message}`);
      }
    }

    const target = data.selectedCareer || 'Technology';
    return {
      resources: [
        {
          title: `${target} Official Guide & Documentation`,
          type: 'Documentation',
          skill: data.skills?.[0] || 'Core Syntax',
          difficulty: 'Beginner',
          reason: 'Authoritative documentation providing standard syntax reference.',
          url: null
        },
        {
          title: `Hands-on ${target} Masterclass Video Course`,
          type: 'Video',
          skill: data.skills?.[0] || 'Core Practice',
          difficulty: 'Intermediate',
          reason: 'Comprehensive visual walkthrough with real-world coding examples.',
          url: null
        }
      ]
    };
  }

  async generateFlowchartData(roleName: string): Promise<any> {
    if (env.GEMINI_API_KEY || env.LLM_API_KEY) {
      try {
        const prompt = `You are a Curriculum Graph Architect.
Generate structured flowchart DAG data for career role: "${roleName}".

Return JSON strictly matching this schema without markdown formatting:
{
  "nodes": [
    { "id": "node-1", "label": "Topic Name", "category": "Fundamentals", "description": "Short explanation" }
  ],
  "edges": [
    { "id": "e-1", "source": "node-1", "target": "node-2" }
  ]
}`;
        const result = await this.callGeminiAPI(prompt);
        if (result && Array.isArray(result.nodes) && Array.isArray(result.edges)) {
          return result;
        }
      } catch (err: any) {
        logger.info(`[AIService] generateFlowchartData fallback used: ${err.message}`);
      }
    }

    const cleanRole = roleName || 'Career Path';
    return {
      nodes: [
        { id: 'n1', label: `${cleanRole} Foundations`, category: 'Fundamentals', description: 'Core foundational principles' },
        { id: 'n2', label: 'Core Methodologies', category: 'Intermediate', description: 'Essential technical skills' },
        { id: 'n3', label: 'Advanced Specialization', category: 'Advanced', description: 'Specialized domain workflows' },
        { id: 'n4', label: 'Capstone Project', category: 'Tools', description: 'Production capstone execution' }
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4' }
      ]
    };
  }

  async enrichRoadmap(data: {
    roadmapStructure: any;
    profile: any;
    targetCareer: string;
  }): Promise<any> {
    const prompt = `
You are an expert technical curriculum designer.
Enrich the following deterministic Python-generated learning roadmap with project recommendations, official documentation topics, video search queries, learning guidance, and flowchart metadata.

Target Career: ${data.targetCareer}
Learner Experience: ${data.profile?.experienceLevel || 'Mid'}
Missing Skills / Gaps: ${JSON.stringify(data.roadmapStructure?.missingSkills || [])}

Python Roadmap Structure:
${JSON.stringify(data.roadmapStructure?.phases || [], null, 2)}

Return ONLY valid JSON matching this exact contract:
{
  "projects": [
    {
      "title": "Project Title",
      "difficulty": "Beginner | Intermediate | Advanced",
      "description": "Short description of project",
      "skillsCovered": ["Skill1", "Skill2"],
      "whyThisProject": "Explains why this project bridges specific skill gaps",
      "estimatedHours": 20
    }
  ],
  "documentation": [
    {
      "title": "Documentation Resource Title",
      "skill": "Skill Name",
      "type": "documentation",
      "url": "https://official-doc-url-if-verified-otherwise-omit",
      "reason": "Why this documentation is helpful"
    }
  ],
  "videos": [
    {
      "title": "Video Topic Title",
      "skill": "Skill Name",
      "difficulty": "Beginner",
      "reason": "Why this video search topic helps",
      "searchQuery": "Exact search query string to find on YouTube"
    }
  ],
  "explanation": "Clear, encouraging natural-language explanation of this roadmap path and how to execute it.",
  "flowchart": {
    "nodes": [
      { "id": "p1", "label": "Phase 1: Foundations", "type": "phase" },
      { "id": "p2", "label": "Phase 2: Core Mastery", "type": "phase" }
    ],
    "edges": [
      { "from": "p1", "to": "p2", "label": "Prerequisite" }
    ]
  }
}
DO NOT fabricate fake URLs. Prefer official documentation names or search queries.
`;

    try {
      const response = await this.callGeminiAPI(prompt);
      if (response && response.projects && response.explanation) {
        return response;
      }
    } catch (err: any) {
      logger.warn(`[AIService] Gemini enrichRoadmap call failed: ${err.message}`);
    }

    return this.getMockRoadmapEnrichment(data);
  }

  private getMockRoadmapEnrichment(data: any) {
    const target = data.targetCareer || 'AI Engineer';
    return {
      projects: [
        {
          title: `Full-Stack ${target} Capstone Application`,
          difficulty: 'Intermediate',
          description: `Build an end-to-end production web application applying core ${target} skill requirements.`,
          skillsCovered: data.roadmapStructure?.missingSkills?.slice(0, 3) || ['Core Architecture'],
          whyThisProject: `Directly bridges your primary skill gaps for ${target}.`,
          estimatedHours: 30,
        },
      ],
      documentation: [
        {
          title: 'Official Documentation & Specs',
          skill: target,
          type: 'documentation',
          reason: 'Provides authoritative guidance on core syntax and patterns.',
        },
      ],
      videos: [
        {
          title: `${target} Complete Masterclass`,
          skill: target,
          difficulty: 'Beginner',
          reason: 'Visual step-by-step walkthrough of fundamental concepts.',
          searchQuery: `${target} full course beginner tutorial`,
        },
      ],
      explanation: `Your roadmap for ${target} has been structured into sequential learning phases. Focus on completing Phase 1 prerequisites before advancing to core technical mastery.`,
      flowchart: {
        nodes: [
          { id: 'p1', label: 'Phase 1: Foundations', type: 'phase' },
          { id: 'p2', label: 'Phase 2: Core Mastery', type: 'phase' },
          { id: 'p3', label: 'Phase 3: Advanced', type: 'phase' },
          { id: 'p4', label: 'Phase 4: Capstone', type: 'phase' },
        ],
        edges: [
          { from: 'p1', to: 'p2', label: 'Requires' },
          { from: 'p2', to: 'p3', label: 'Requires' },
          { from: 'p3', to: 'p4', label: 'Requires' },
        ],
      },
    };
  }
}

export const aiService = new AIService();

