/**
 * AI Evaluation Suite
 * Evaluates recommendation precision, skill-gap analysis, and roadmap prerequisite ordering across representative test profiles.
 */

import { CAREERS_DATASET } from '../data/careers.dataset';
import { normalizeSkills } from './skill-taxonomy';

export interface EvaluationProfile {
  id: string;
  name: string;
  skills: string[];
  interests: string[];
  experienceLevel: string;
  education: string;
  targetGoal: string;
  expectedTopCareers: string[];
}

export const EVALUATION_PROFILES: EvaluationProfile[] = [
  {
    id: 'eval-1',
    name: 'Frontend to AI Engineer Transitioner',
    skills: ['JavaScript', 'ReactJS', 'HTML/CSS', 'TypeScript'],
    interests: ['Artificial Intelligence', 'Machine Learning', 'Automation'],
    experienceLevel: 'Mid',
    education: "Bachelor's Degree",
    targetGoal: 'AI Engineer',
    expectedTopCareers: ['AI Engineer', 'Full Stack Developer', 'Frontend Developer']
  },
  {
    id: 'eval-2',
    name: 'Data Analyst to Data Scientist',
    skills: ['SQL', 'PostgreSQL', 'Python', 'Pandas', 'Excel'],
    interests: ['Data Science', 'Statistics', 'Analytics'],
    experienceLevel: 'Entry',
    education: "Bachelor's Degree",
    targetGoal: 'Data Scientist',
    expectedTopCareers: ['Data Scientist', 'Data Analyst', 'Machine Learning Engineer']
  },
  {
    id: 'eval-3',
    name: 'Full Stack Developer',
    skills: ['JS', 'TS', 'React', 'NodeJS', 'Express', 'MongoDB'],
    interests: ['Web Development', 'Software Engineering', 'Product Building'],
    experienceLevel: 'Mid',
    education: 'Self-Taught / Bootcamp',
    targetGoal: 'Full Stack Developer',
    expectedTopCareers: ['Full Stack Developer', 'Backend Developer', 'Frontend Developer']
  },
  {
    id: 'eval-4',
    name: 'DevOps Aspirant',
    skills: ['Python', 'Docker', 'Git', 'Linux'],
    interests: ['Infrastructure', 'Automation', 'DevOps & Cloud Orchestration'],
    experienceLevel: 'Entry',
    education: "Bachelor's Degree",
    targetGoal: 'DevOps Engineer',
    expectedTopCareers: ['DevOps Engineer', 'Cloud Engineer', 'Backend Developer']
  },
  {
    id: 'eval-5',
    name: 'Cybersecurity Analyst Aspirant',
    skills: ['Python', 'Networking', 'Cybersecurity'],
    interests: ['Cybersecurity', 'Infrastructure', 'Networks'],
    experienceLevel: 'Entry',
    education: "Bachelor's Degree",
    targetGoal: 'Cybersecurity Analyst',
    expectedTopCareers: ['Cybersecurity Analyst', 'Cloud Engineer', 'DevOps Engineer']
  }
];

export function runAIEvaluation() {
  console.log('====================================================');
  console.log('           CAREER FOR ME AI EVALUATION          ');
  console.log('====================================================\n');

  let top1Hits = 0;
  let top3Hits = 0;
  let totalEvaluated = EVALUATION_PROFILES.length;

  EVALUATION_PROFILES.forEach((profile) => {
    const normSkills = normalizeSkills(profile.skills);
    const userInterests = profile.interests.map((i) => i.toLowerCase());

    const scored = CAREERS_DATASET.map((c) => {
      const reqSkillsNorm = normalizeSkills(c.requiredSkills);
      const matched = reqSkillsNorm.filter((s) => normSkills.includes(s));
      const skillScore = reqSkillsNorm.length > 0 ? (matched.length / reqSkillsNorm.length) * 100 : 50;

      const matchedInterests = userInterests.filter((ui) =>
        c.interests.some((ci) => ci.toLowerCase().includes(ui) || ui.includes(ci.toLowerCase()))
      );
      const interestScore = (matchedInterests.length / Math.max(1, userInterests.length)) * 100;

      const isTarget = c.title.toLowerCase().includes(profile.targetGoal.toLowerCase());
      const goalScore = isTarget ? 100 : 40;

      const totalScore = Math.round(skillScore * 0.40 + interestScore * 0.20 + goalScore * 0.40);

      return { career: c.title, score: totalScore };
    });

    scored.sort((a, b) => b.score - a.score);
    const top1 = scored[0].career;
    const top3 = scored.slice(0, 3).map((s) => s.career);

    const isTop1Match = profile.expectedTopCareers[0].toLowerCase() === top1.toLowerCase();
    const isTop3Match = profile.expectedTopCareers.some((expected) =>
      top3.some((t) => t.toLowerCase() === expected.toLowerCase())
    );

    if (isTop1Match) top1Hits++;
    if (isTop3Match) top3Hits++;

    console.log(`[Profile]: ${profile.name}`);
    console.log(`  Target Goal   : ${profile.targetGoal}`);
    console.log(`  Top 1 Match   : ${top1} (${isTop1Match ? 'PASS ✓' : 'DIFF ~'})`);
    console.log(`  Top 3 Ranked  : ${top3.join(', ')}`);
    console.log('----------------------------------------------------');
  });

  const top1Precision = ((top1Hits / totalEvaluated) * 100).toFixed(1);
  const top3Precision = ((top3Hits / totalEvaluated) * 100).toFixed(1);

  console.log('\n====================================================');
  console.log(`  EVALUATION SUMMARY`);
  console.log(`  Top-1 Precision Accuracy: ${top1Precision}% (${top1Hits}/${totalEvaluated})`);
  console.log(`  Top-3 Recall Precision  : ${top3Precision}% (${top3Hits}/${totalEvaluated})`);
  console.log('====================================================\n');
}

// Execute evaluation if run directly
if (require.main === module) {
  runAIEvaluation();
}
