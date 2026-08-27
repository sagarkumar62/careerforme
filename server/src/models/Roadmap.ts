import mongoose, { Schema, Document } from 'mongoose';

export interface IMilestoneResource {
  title: string;
  type?: string;
  url?: string;
}

export interface IMilestone {
  milestoneId: string;
  title: string;
  description: string;
  estimatedHours: number;
  resources: IMilestoneResource[];
  skills: string[];
  order: number;
  completed?: boolean;
}

export interface IRoadmapPhase {
  phaseId: string;
  title: string;
  description: string;
  estimatedWeeks: number;
  milestones: IMilestone[];
}

export interface IAdaptiveEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface IRoadmapEnrichment {
  projects: Array<{
    title: string;
    difficulty: string;
    description: string;
    skillsCovered: string[];
    whyThisProject: string;
    estimatedHours: number;
  }>;
  documentation: Array<{
    title: string;
    skill: string;
    type: string;
    url?: string;
    reason: string;
  }>;
  videos: Array<{
    title: string;
    skill: string;
    difficulty: string;
    reason: string;
    searchQuery: string;
    url?: string;
  }>;
  explanation: string;
  flowchart: {
    nodes: Array<{ id: string; label: string; type?: string }>;
    edges: Array<{ from: string; to: string; label?: string }>;
  };
}

export interface IRoadmap extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  targetCareer: string;
  requestedCareer?: string;
  resolvedCareer?: string;
  careerId?: string;
  domain?: string;
  sourceProvider?: string;
  resolutionMethod?: string;
  resolutionConfidence?: number;
  duration: string;
  estimatedHours: number;
  overallCompletionPercent?: number;
  prerequisites: string[];
  nodes?: Array<Record<string, any>>;
  edges?: Array<Record<string, any>>;
  phases: IRoadmapPhase[];
  adaptiveEvents?: IAdaptiveEvent[];
  aiEnrichment?: IRoadmapEnrichment;
  status: 'active' | 'completed' | 'archived';
  profileVersion?: number;
  isStale?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>({
  milestoneId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  estimatedHours: { type: Number, default: 10 },
  resources: [
    {
      title: { type: String, required: true },
      type: { type: String, default: 'Course' },
      url: { type: String, default: '' },
    },
  ],
  skills: { type: [String], default: [] },
  order: { type: Number, default: 1 },
  completed: { type: Boolean, default: false },
});

const phaseSchema = new Schema<IRoadmapPhase>({
  phaseId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  estimatedWeeks: { type: Number, default: 4 },
  milestones: [milestoneSchema],
});

const adaptiveEventSchema = new Schema<IAdaptiveEvent>({
  id: { type: String, required: true },
  type: { type: String, default: 'pace_adjustment' },
  message: { type: String, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
});

const roadmapSchema = new Schema<IRoadmap>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    targetCareer: { type: String, required: true },
    requestedCareer: { type: String, default: '' },
    resolvedCareer: { type: String, default: '' },
    careerId: { type: String, default: '' },
    domain: { type: String, default: 'technology' },
    sourceProvider: { type: String, default: 'roadmap.sh' },
    resolutionMethod: { type: String, default: 'exact' },
    resolutionConfidence: { type: Number, default: 1.0 },
    duration: { type: String, default: '6 Months' },
    estimatedHours: { type: Number, default: 200 },
    overallCompletionPercent: { type: Number, default: 0 },
    prerequisites: { type: [String], default: [] },
    phases: [phaseSchema],
    adaptiveEvents: [adaptiveEventSchema],
    profileVersion: { type: Number, default: 1 },
    isStale: { type: Boolean, default: false },
    aiEnrichment: {
      projects: [{ type: Schema.Types.Mixed }],
      documentation: [{ type: Schema.Types.Mixed }],
      videos: [{ type: Schema.Types.Mixed }],
      explanation: { type: String, default: '' },
      flowchart: {
        nodes: [{ type: Schema.Types.Mixed }],
        edges: [{ type: Schema.Types.Mixed }],
      },
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);


roadmapSchema.index({ userId: 1, status: 1 });

export const Roadmap = mongoose.model<IRoadmap>('Roadmap', roadmapSchema);
