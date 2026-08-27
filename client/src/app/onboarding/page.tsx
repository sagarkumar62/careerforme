'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, Sparkles, Check, ArrowRight, ArrowLeft, Loader2, Brain, CheckCircle2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const AVAILABLE_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Git',
  'MongoDB', 'SQL', 'PyTorch', 'TensorFlow', 'Docker', 'AWS', 'Next.js', 'Tailwind CSS'
];

const INTEREST_OPTIONS = [
  { id: 'ai', label: 'AI & Machine Learning', desc: 'LLMs, Neural Networks & Computer Vision' },
  { id: 'web', label: 'Web Development', desc: 'Modern Full-Stack & Responsive Frontend' },
  { id: 'data', label: 'Data Science & Analytics', desc: 'Exploratory Data Analysis & Statistics' },
  { id: 'cloud', label: 'Cloud Architecture & DevOps', desc: 'AWS, Kubernetes & Infrastructure' },
  { id: 'sec', label: 'Cybersecurity', desc: 'Network Security & Penetration Testing' },
  { id: 'mobile', label: 'Mobile App Development', desc: 'React Native & iOS/Android' }
];

export default function OnboardingPage() {
  const router = useRouter();
  const { updateUserAndProfile } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 7;

  // Form State
  const [education, setEducation] = useState('B.S. in Computer Science');
  const [experienceLevel, setExperienceLevel] = useState<'Entry' | 'Mid' | 'Senior' | 'Lead'>('Mid');
  const [selectedSkills, setSelectedSkills] = useState<{ [key: string]: 'Beginner' | 'Intermediate' | 'Advanced' }>({
    'JavaScript': 'Advanced',
    'React': 'Advanced',
    'Node.js': 'Intermediate',
    'Python': 'Beginner'
  });
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['AI & Machine Learning', 'Web Development']);
  const [targetGoal, setTargetGoal] = useState('AI Engineer');
  const [goalReason, setGoalReason] = useState('I want to build intelligent SaaS applications using LLMs and Neural Networks.');
  const [learningFormats, setLearningFormats] = useState<string[]>(['Projects', 'Interactive', 'Videos', 'Docs']);
  const [weeklyHours, setWeeklyHours] = useState(12);

  // AI Processing State
  const [aiStages, setAiStages] = useState([
    { label: 'Analyzing your skill matrix', status: 'pending' },
    { label: 'Mapping career market demand', status: 'pending' },
    { label: 'Evaluating skill gap delta', status: 'pending' },
    { label: 'Building adaptive learning roadmap', status: 'pending' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const toggleSkill = (skill: string) => {
    if (selectedSkills[skill]) {
      const copy = { ...selectedSkills };
      delete copy[skill];
      setSelectedSkills(copy);
    } else {
      setSelectedSkills({ ...selectedSkills, [skill]: 'Intermediate' });
    }
  };

  const updateSkillLevel = (skill: string, level: 'Beginner' | 'Intermediate' | 'Advanced') => {
    setSelectedSkills({ ...selectedSkills, [skill]: level });
  };

  const toggleInterest = (label: string) => {
    if (selectedInterests.includes(label)) {
      setSelectedInterests(selectedInterests.filter(i => i !== label));
    } else {
      setSelectedInterests([...selectedInterests, label]);
    }
  };

  const toggleFormat = (format: string) => {
    if (learningFormats.includes(format)) {
      setLearningFormats(learningFormats.filter(f => f !== format));
    } else {
      setLearningFormats([...learningFormats, format]);
    }
  };

  const startAIAnalysis = async () => {
    setStep(7);
    setIsProcessing(true);

    // Save profile to API and invalidate query caches
    await updateUserAndProfile({}, {
      skills: Object.entries(selectedSkills).map(([name, level]) => ({ name, proficiency: level })),
      interests: selectedInterests,
      education,
      experienceLevel,
      targetCareerGoal: targetGoal,
      targetCareer: targetGoal,
      goalReason,
      learningPreferences: {
        formats: learningFormats as any,
        weeklyHours
      }
    } as any);

    // Simulate intelligent processing steps
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 700));
      setAiStages(prev => prev.map((st, idx) => idx === i ? { ...st, status: 'completed' } : st));
    }

    setIsProcessing(false);
    setIsComplete(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
            <Compass className="h-4 w-4" />
          </div>
          <span className="font-extrabold text-sm text-slate-900 tracking-tight">CAREER FOR ME</span>
        </div>
        {step < 7 && (
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <span>Step {step} of 6</span>
            <div className="w-32 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${(step / 6) * 100}%` }} />
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {step === 1 && (
          <Card className="p-6 sm:p-8 space-y-6 bg-white shadow-soft rounded-2xl">
            <div className="space-y-2">
              <Badge variant="primary">Step 1 of 6</Badge>
              <h1 className="text-2xl font-extrabold text-slate-900">Tell us about your background</h1>
              <p className="text-slate-500 text-sm">We use your education and experience to baseline your career starting point.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Education Level</label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full h-11 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 font-medium focus:bg-white focus:border-indigo-600 focus:outline-none"
                >
                  <option>High School Diploma</option>
                  <option>Self-Taught / Bootcamp Graduate</option>
                  <option>B.S. in Computer Science</option>
                  <option>B.S. in Engineering / Other STEM</option>
                  <option>Master's / Ph.D.</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Current Experience Level</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['Entry', 'Mid', 'Senior', 'Lead'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setExperienceLevel(lvl)}
                      className={`h-11 rounded-lg border text-sm font-semibold transition-all ${
                        experienceLevel === lvl
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button size="lg" variant="primary" onClick={() => setStep(2)}>
                Next: Your Skills <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6 sm:p-8 space-y-6 bg-white shadow-soft rounded-2xl">
            <div className="space-y-2">
              <Badge variant="primary">Step 2 of 6</Badge>
              <h1 className="text-2xl font-extrabold text-slate-900">What skills do you already have?</h1>
              <p className="text-slate-500 text-sm">Select technologies you know and set your self-assessed proficiency level.</p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SKILLS.map((sk) => {
                  const isSelected = !!selectedSkills[sk];
                  return (
                    <button
                      key={sk}
                      type="button"
                      onClick={() => toggleSkill(sk)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {sk} {isSelected && '✓'}
                    </button>
                  );
                })}
              </div>

              {Object.keys(selectedSkills).length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Set Proficiency Levels</h3>
                  {Object.entries(selectedSkills).map(([sk, level]) => (
                    <div key={sk} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-xs font-bold text-slate-800">{sk}</span>
                      <div className="flex gap-1.5">
                        {(['Beginner', 'Intermediate', 'Advanced'] as const).map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => updateSkillLevel(sk, l)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                              level === l
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Next: Your Interests <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-6 sm:p-8 space-y-6 bg-white shadow-soft rounded-2xl">
            <div className="space-y-2">
              <Badge variant="primary">Step 3 of 6</Badge>
              <h1 className="text-2xl font-extrabold text-slate-900">What areas interest you most?</h1>
              <p className="text-slate-500 text-sm">Select domains you want to explore or grow into.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INTEREST_OPTIONS.map((opt) => {
                const isSel = selectedInterests.includes(opt.label);
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleInterest(opt.label)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSel
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-sm text-slate-900">{opt.label}</h3>
                      {isSel && <Check className="h-4 w-4 text-indigo-600" />}
                    </div>
                    <p className="text-xs text-slate-500">{opt.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button variant="primary" onClick={() => setStep(4)}>
                Next: Career Goal <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card className="p-6 sm:p-8 space-y-6 bg-white shadow-soft rounded-2xl">
            <div className="space-y-2">
              <Badge variant="primary">Step 4 of 6</Badge>
              <h1 className="text-2xl font-extrabold text-slate-900">What is your dream career goal?</h1>
              <p className="text-slate-500 text-sm">Choose a target title or type a custom goal.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Target Role</label>
                <input
                  type="text"
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(e.target.value)}
                  placeholder="e.g. AI Engineer, Data Scientist, Full Stack Developer"
                  className="w-full h-11 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 font-semibold focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Why are you interested in this path?</label>
                <textarea
                  value={goalReason}
                  onChange={(e) => setGoalReason(e.target.value)}
                  rows={3}
                  placeholder="Explain what motivates you..."
                  className="w-full p-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button variant="primary" onClick={() => setStep(5)}>
                Next: Learning Format <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {step === 5 && (
          <Card className="p-6 sm:p-8 space-y-6 bg-white shadow-soft rounded-2xl">
            <div className="space-y-2">
              <Badge variant="primary">Step 5 of 6</Badge>
              <h1 className="text-2xl font-extrabold text-slate-900">How do you prefer to learn?</h1>
              <p className="text-slate-500 text-sm">Select your favorite resource types for your roadmap.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['Videos', 'Reading', 'Projects', 'Interactive', 'Courses', 'Docs'].map((fmt) => {
                const isSel = learningFormats.includes(fmt);
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => toggleFormat(fmt)}
                    className={`h-12 rounded-xl border text-sm font-semibold transition-all ${
                      isSel
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {fmt} {isSel && '✓'}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(4)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button variant="primary" onClick={() => setStep(6)}>
                Next: Availability <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {step === 6 && (
          <Card className="p-6 sm:p-8 space-y-6 bg-white shadow-soft rounded-2xl">
            <div className="space-y-2">
              <Badge variant="primary">Step 6 of 6</Badge>
              <h1 className="text-2xl font-extrabold text-slate-900">How much time can you dedicate?</h1>
              <p className="text-slate-500 text-sm">Your weekly learning commitment determines your roadmap pace.</p>
            </div>

            <div className="space-y-6 py-4">
              <div className="text-center">
                <span className="text-4xl font-black text-indigo-600">{weeklyHours}</span>
                <span className="text-slate-600 font-bold ml-1 text-lg">hrs / week</span>
              </div>

              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />

              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>5 hrs (Relaxed)</span>
                <span>15 hrs (Moderate)</span>
                <span>30 hrs (Accelerated)</span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(5)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button variant="ai" size="lg" onClick={startAIAnalysis} className="gap-2">
                Generate My AI Career Map <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {step === 7 && (
          <Card className="p-8 sm:p-10 space-y-8 bg-white shadow-xl rounded-2xl text-center">
            <div className="space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                <Brain className="h-7 w-7 animate-pulse" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                {isComplete ? 'Your Career Navigator Is Ready!' : 'Analyzing Your Career Profile...'}
              </h1>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                {isComplete
                  ? 'We have matched your profile against top market roles and built your adaptive roadmap.'
                  : 'Our AI model is cross-referencing your skill set and goals.'}
              </p>
            </div>

            <div className="space-y-3 max-w-md mx-auto text-left">
              {aiStages.map((st, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-semibold text-slate-700">{st.label}</span>
                  {st.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Loader2 className="h-4 w-4 text-indigo-500 animate-spin shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {isComplete && (
              <div className="pt-4">
                <Button size="lg" variant="ai" onClick={() => router.push('/recommendations')} className="w-full sm:w-auto font-extrabold px-8">
                  See My Career Recommendations <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
