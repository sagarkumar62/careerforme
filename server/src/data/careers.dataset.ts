/**
 * Structured Career Dataset (12 Core Career Roles)
 * Serves as the ground-truth benchmark data for hybrid scoring, skill-gap analysis, and roadmaps.
 */

export interface CareerRequirement {
  id: string;
  title: string;
  category: 'AI & Data' | 'Software Engineering' | 'Infrastructure' | 'Design & Security' | 'Aviation & Aerospace' | 'Engineering & Construction' | 'Finance & Business' | string;
  difficulty: 'Entry' | 'Intermediate' | 'Advanced';
  description: string;
  requiredSkills: string[];
  recommendedSkills: string[];
  interests: string[];
  experienceLevels: string[];
  education: string[];
  prerequisites: string[];
  estimatedMonths: number;
  averageSalary: string;
  keyResponsibilities: string[];
}

export const CAREERS_DATASET: CareerRequirement[] = [
  {
    id: 'ai-engineer',
    title: 'AI Engineer',
    category: 'AI & Data',
    difficulty: 'Intermediate',
    description: 'Design, build, and deploy production-grade Artificial Intelligence and LLM applications using modern deep learning frameworks and vector databases.',
    requiredSkills: [
      'Python',
      'Machine Learning',
      'PyTorch',
      'Large Language Models (LLMs)',
      'Generative AI',
      'REST & GraphQL APIs'
    ],
    recommendedSkills: ['Docker', 'LangChain', 'FastAPI', 'Statistics & Mathematics'],
    interests: ['Artificial Intelligence', 'Machine Learning', 'Automation', 'Software Engineering'],
    experienceLevels: ['Entry', 'Mid', 'Senior'],
    education: ["Bachelor's Degree", "Master's Degree", "Self-Taught / Bootcamp"],
    prerequisites: ['Python', 'Software Engineering Fundamentals'],
    estimatedMonths: 8,
    averageSalary: '$135,000 - $185,000',
    keyResponsibilities: [
      'Architect and deploy LLM agents and multi-stage RAG pipelines into production.',
      'Optimize vector database embeddings and semantic search index structures.',
      'Fine-tune open-weight AI models for enterprise task efficiency.',
      'Build robust FastAPI microservices with telemetry, tracing, and rate limiting.'
    ]
  },
  {
    id: 'ml-engineer',
    title: 'Machine Learning Engineer',
    category: 'AI & Data',
    difficulty: 'Advanced',
    description: 'Construct scalable machine learning pipelines, optimize feature stores, and deploy real-time inference models into production infrastructure.',
    requiredSkills: [
      'Python',
      'Machine Learning',
      'Scikit-Learn',
      'PyTorch',
      'TensorFlow',
      'Statistics & Mathematics',
      'Docker'
    ],
    recommendedSkills: ['Kubernetes', 'MLOps', 'PostgreSQL', 'C++'],
    interests: ['Machine Learning', 'Data Science', 'Infrastructure', 'Algorithms'],
    experienceLevels: ['Mid', 'Senior'],
    education: ["Bachelor's Degree", "Master's Degree", "PhD"],
    prerequisites: ['Python', 'Linear Algebra & Calculus', 'Data Structures'],
    estimatedMonths: 9,
    averageSalary: '$140,000 - $190,000',
    keyResponsibilities: [
      'Construct scalable automated training, validation, and feature engineering pipelines.',
      'Optimize GPU-accelerated model inference latency and batch throughput.',
      'Implement MLOps instrumentation for tracking data drift and model staleness.',
      'Collaborate with data platform teams to optimize real-time streaming feature stores.'
    ]
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    category: 'AI & Data',
    difficulty: 'Intermediate',
    description: 'Extract statistical insights, construct predictive models, and design experiments to solve complex business domain challenges.',
    requiredSkills: [
      'Python',
      'Pandas',
      'NumPy',
      'Statistics & Mathematics',
      'Machine Learning',
      'PostgreSQL'
    ],
    recommendedSkills: ['R', 'Tableau', 'Scikit-Learn', 'A/B Testing'],
    interests: ['Data Science', 'Statistics', 'Analytics', 'Artificial Intelligence'],
    experienceLevels: ['Entry', 'Mid', 'Senior'],
    education: ["Bachelor's Degree", "Master's Degree"],
    prerequisites: ['Statistics & Mathematics', 'Python'],
    estimatedMonths: 7,
    averageSalary: '$120,000 - $165,000',
    keyResponsibilities: [
      'Perform exploratory data analysis and hypothesis testing across complex datasets.',
      'Design, execute, and evaluate randomized A/B experimentation frameworks.',
      'Develop predictive machine learning models to solve business challenges.',
      'Communicate statistical findings to executive product stakeholders.'
    ]
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    category: 'AI & Data',
    difficulty: 'Entry',
    description: 'Transform raw multi-source data into actionable business intelligence reports, dashboards, and statistical visualizations.',
    requiredSkills: [
      'SQL / PostgreSQL',
      'PostgreSQL',
      'Python',
      'Pandas',
      'Statistics & Mathematics'
    ],
    recommendedSkills: ['Tableau', 'Power BI', 'Excel', 'Data Visualization'],
    interests: ['Analytics', 'Business Intelligence', 'Data Science'],
    experienceLevels: ['Entry', 'Mid'],
    education: ["High School", "Bachelor's Degree", "Self-Taught / Bootcamp"],
    prerequisites: ['Basic Spreadsheet Literacy'],
    estimatedMonths: 5,
    averageSalary: '$75,000 - $105,000',
    keyResponsibilities: [
      'Query, clean, and consolidate raw multi-source enterprise warehouse tables.',
      'Build dynamic executive BI dashboards and self-service analytics portals.',
      'Track operational KPIs, conversion funnels, and revenue metrics.',
      'Automate recurring reporting workloads using SQL and Python workflows.'
    ]
  },
  {
    id: 'full-stack-developer',
    title: 'Full Stack Developer',
    category: 'Software Engineering',
    difficulty: 'Intermediate',
    description: 'Architect and deploy complete web applications from responsive modern frontend interfaces to scalable backend APIs and database infrastructure.',
    requiredSkills: [
      'JavaScript',
      'TypeScript',
      'React.js',
      'Node.js',
      'Express.js',
      'MongoDB',
      'PostgreSQL'
    ],
    recommendedSkills: ['Next.js', 'Tailwind CSS', 'Docker', 'REST & GraphQL APIs'],
    interests: ['Web Development', 'Software Engineering', 'Product Building'],
    experienceLevels: ['Entry', 'Mid', 'Senior'],
    education: ["High School", "Bachelor's Degree", "Self-Taught / Bootcamp"],
    prerequisites: ['HTML/CSS', 'JavaScript Fundamentals'],
    estimatedMonths: 7,
    averageSalary: '$110,000 - $155,000',
    keyResponsibilities: [
      'Develop responsive frontend interfaces using Next.js, React, and Tailwind CSS.',
      'Design RESTful and GraphQL backend microservices using Node.js and Express.',
      'Architect relational PostgreSQL and NoSQL MongoDB database schemas.',
      'Implement JWT/OAuth2 authentication, session control, and state management.'
    ]
  },
  {
    id: 'frontend-developer',
    title: 'Frontend Developer',
    category: 'Software Engineering',
    difficulty: 'Entry',
    description: 'Build fast, accessible, and dynamic user interfaces for web and desktop platforms using modern component frameworks.',
    requiredSkills: [
      'JavaScript',
      'TypeScript',
      'React.js',
      'HTML/CSS',
      'Tailwind CSS'
    ],
    recommendedSkills: ['Next.js', 'Vue.js', 'Figma', 'Web Performance Optimization'],
    interests: ['Frontend Web Development', 'UI/UX Design', 'Web Development'],
    experienceLevels: ['Entry', 'Mid'],
    education: ["High School", "Bachelor's Degree", "Self-Taught / Bootcamp"],
    prerequisites: ['HTML/CSS'],
    estimatedMonths: 5,
    averageSalary: '$90,000 - $130,000',
    keyResponsibilities: [
      'Create reusable UI component libraries with React, TypeScript, and CSS modules.',
      'Optimize web performance metrics, bundle sizes, and image optimization.',
      'Ensure WCAG AA accessibility standards and cross-browser compatibility.',
      'Integrate asynchronous REST API endpoints with state management hooks.'
    ]
  },
  {
    id: 'backend-developer',
    title: 'Backend Developer',
    category: 'Software Engineering',
    difficulty: 'Intermediate',
    description: 'Engine server-side API systems, microservice architectures, authentication workflows, and high-throughput data layers.',
    requiredSkills: [
      'Node.js',
      'Express.js',
      'Python',
      'PostgreSQL',
      'MongoDB',
      'REST & GraphQL APIs'
    ],
    recommendedSkills: ['Go', 'Redis', 'Docker', 'CI/CD Pipelines'],
    interests: ['Backend & Systems API Architecture', 'Software Engineering', 'Databases'],
    experienceLevels: ['Entry', 'Mid', 'Senior'],
    education: ["Bachelor's Degree", "Self-Taught / Bootcamp"],
    prerequisites: ['Basic Programming', 'Database Concepts'],
    estimatedMonths: 6,
    averageSalary: '$115,000 - $160,000',
    keyResponsibilities: [
      'Engineer high-throughput server APIs, background workers, and queue consumers.',
      'Design normalized database schemas, indexes, and query optimizations.',
      'Implement API security, rate limiting, token refresh, and encryption.',
      'Monitor server error rates, latency distribution, and service health.'
    ]
  },
  {
    id: 'mobile-app-developer',
    title: 'Mobile App Developer',
    category: 'Software Engineering',
    difficulty: 'Intermediate',
    description: 'Create high-performance native and cross-platform mobile applications for iOS and Android devices.',
    requiredSkills: [
      'JavaScript',
      'TypeScript',
      'React Native',
      'REST & GraphQL APIs'
    ],
    recommendedSkills: ['Kotlin', 'Swift', 'Flutter', 'Mobile UI Design'],
    interests: ['Mobile Applications', 'Web Development', 'Software Engineering'],
    experienceLevels: ['Entry', 'Mid'],
    education: ["Bachelor's Degree", "Self-Taught / Bootcamp"],
    prerequisites: ['JavaScript Fundamentals'],
    estimatedMonths: 6,
    averageSalary: '$105,000 - $145,000',
    keyResponsibilities: [
      'Develop cross-platform mobile apps for iOS and Android using React Native.',
      'Optimize mobile UI rendering frame rates, gesture navigation, and animations.',
      'Manage local SQLite database sync, offline storage, and push notifications.',
      'Coordinate App Store and Google Play deployment automated builds.'
    ]
  },
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    category: 'Infrastructure',
    difficulty: 'Advanced',
    description: 'Automate build, deployment, and infrastructure orchestration pipelines using containerization and Infrastructure-as-Code.',
    requiredSkills: [
      'Docker',
      'Kubernetes',
      'CI/CD Pipelines',
      'Git / GitHub',
      'AWS',
      'Python'
    ],
    recommendedSkills: ['Terraform', 'Linux', 'Bash', 'Prometheus'],
    interests: ['Infrastructure', 'Automation', 'DevOps & Cloud Orchestration'],
    experienceLevels: ['Mid', 'Senior'],
    education: ["Bachelor's Degree", "Self-Taught / Bootcamp"],
    prerequisites: ['Linux Fundamentals', 'Scripting'],
    estimatedMonths: 8,
    averageSalary: '$130,000 - $175,000',
    keyResponsibilities: [
      'Automate continuous integration and continuous delivery (CI/CD) pipelines.',
      'Orchestrate Kubernetes clusters, ingress controllers, and auto-scaling rules.',
      'Provision Infrastructure-as-Code (IaC) with Terraform and Ansible modules.',
      'Maintain system observability using Prometheus, Grafana, and ELK stack.'
    ]
  },
  {
    id: 'cloud-architect',
    title: 'Cloud Architect',
    category: 'Infrastructure',
    difficulty: 'Intermediate',
    description: 'Design and manage secure, resilient cloud architecture environments across major public cloud providers.',
    requiredSkills: [
      'AWS',
      'Microsoft Azure',
      'Docker',
      'Git / GitHub',
      'Network Security'
    ],
    recommendedSkills: ['Google Cloud Platform', 'Terraform', 'Python'],
    interests: ['DevOps & Cloud Orchestration', 'Infrastructure', 'Cybersecurity'],
    experienceLevels: ['Entry', 'Mid', 'Senior'],
    education: ["Bachelor's Degree", "Self-Taught / Bootcamp"],
    prerequisites: ['Networking Basics'],
    estimatedMonths: 7,
    averageSalary: '$125,000 - $168,000',
    keyResponsibilities: [
      'Architect cloud network topologies, VPC subnets, and security gateways.',
      'Manage cloud storage, serverless functions, and managed database instances.',
      'Enforce enterprise cloud governance, IAM access controls, and compliance.',
      'Optimize cloud compute spending and resource utilization metrics.'
    ]
  },
  {
    id: 'security-analyst',
    title: 'Security Analyst',
    category: 'Design & Security',
    difficulty: 'Intermediate',
    description: 'Monitor enterprise systems, perform vulnerability assessments, investigate security incidents, and harden defenses.',
    requiredSkills: [
      'Cybersecurity Fundamentals',
      'Network Security',
      'Penetration Testing',
      'Ethical Hacking',
      'Python'
    ],
    recommendedSkills: ['Linux', 'SIEM Tools', 'Cryptography', 'SIEM'],
    interests: ['Cybersecurity', 'Infrastructure', 'Networks'],
    experienceLevels: ['Entry', 'Mid', 'Senior'],
    education: ["Bachelor's Degree", "Self-Taught / Bootcamp"],
    prerequisites: ['Computer Networking'],
    estimatedMonths: 7,
    averageSalary: '$110,000 - $155,000',
    keyResponsibilities: [
      'Monitor SIEM alerts and security logs for unauthorized intrusion attempts.',
      'Conduct automated vulnerability scans and ethical penetration testing.',
      'Execute incident response playbooks to isolate and remediate threats.',
      'Harden network firewalls, endpoints, and identity authentication controls.'
    ]
  },
  {
    id: 'ux-designer',
    title: 'UX Designer',
    category: 'Design & Security',
    difficulty: 'Entry',
    description: 'Research user personas, design intuitive wireframe prototypes, and establish cohesive design systems for applications.',
    requiredSkills: [
      'Figma',
      'UI/UX Design',
      'Wireframing & Prototyping',
      'HTML/CSS'
    ],
    recommendedSkills: ['User Research', 'Design Systems', 'Tailwind CSS'],
    interests: ['UI/UX Design', 'Product Design', 'Visual Arts'],
    experienceLevels: ['Entry', 'Mid'],
    education: ["High School", "Bachelor's Degree", "Self-Taught / Bootcamp"],
    prerequisites: ['Visual Design Sense'],
    estimatedMonths: 5,
    averageSalary: '$85,000 - $125,000',
    keyResponsibilities: [
      'Conduct user interviews, usability testing, and qualitative user research.',
      'Design interactive wireframes, component systems, and high-fidelity mockups in Figma.',
      'Establish cohesive design design tokens, color palettes, and typography.'
    ]
  },
  {
    id: 'pilot',
    title: 'Commercial Pilot',
    category: 'Aviation & Aerospace',
    difficulty: 'Advanced',
    description: 'Operate commercial aircraft, perform navigation and flight planning, manage cockpit automation, and adhere to strict FAA safety regulations.',
    requiredSkills: [
      'Flight Navigation',
      'Aviation Regulations',
      'Aeronautical Meteorology',
      'Aircraft Systems',
      'Cockpit Radio Communication'
    ],
    recommendedSkills: ['Instrument Rating', 'Multi-Engine Rating', 'Emergency Protocols'],
    interests: ['Aviation', 'Navigation', 'Flight Control'],
    experienceLevels: ['Entry', 'Mid', 'Senior'],
    education: ["Commercial Pilot License (CPL)", "Aviation Science Degree"],
    prerequisites: ['Private Pilot License (PPL)', 'Medical Class 1 Certification'],
    estimatedMonths: 18,
    averageSalary: '$120,000 - $220,000',
    keyResponsibilities: [
      'Perform pre-flight inspections, flight planning, and fuel load calculations.',
      'Operate aircraft controls, navigation instruments, and communication radios.',
      'Monitor meteorological weather patterns and coordinate with Air Traffic Control (ATC).',
      'Execute safety emergency protocols and cabin crew coordination.'
    ]
  }
];

export function getCareerById(id: string): CareerRequirement | undefined {
  if (!id) return undefined;
  const norm = id.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
  const slugNorm = norm.replace(/\s+/g, '-');

  // Exact ID or Slug or Title match
  let match = CAREERS_DATASET.find((c) => {
    const cIdNorm = c.id.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
    const tNorm = c.title.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
    return cIdNorm === norm || tNorm === norm || c.id === slugNorm;
  });

  if (!match) {
    match = CAREERS_DATASET.find((c) => {
      const tNorm = c.title.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
      return tNorm.includes(norm) || norm.includes(tNorm);
    });
  }

  return match;
}
