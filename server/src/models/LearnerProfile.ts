import mongoose, { Schema, Document } from 'mongoose';

export interface ICompletedCourse {
  title: string;
  platform?: string;
  completionDate?: Date;
  url?: string;
}

export interface ICertification {
  title: string;
  issuer?: string;
  issueDate?: Date;
  credentialUrl?: string;
}

export interface IProject {
  title: string;
  description?: string;
  repoUrl?: string;
  liveUrl?: string;
  techStack?: string[];
}

export interface ILearnerProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  education?: string;
  educationLevel?: string;
  experienceLevel?: string;
  currentRole?: string;
  targetCareer?: string;
  targetCareerId?: string;
  profileVersion: number;
  skills: any[];
  baselineSkills: any[];
  interests: string[];
  careerGoals: string[];
  learningPreferences: string[];
  preferredLearningStyle?: string;
  weeklyLearningHours: number;
  completedCourses: ICompletedCourse[];
  certifications: ICertification[];
  projects: IProject[];
  languages: string[];
  location?: string;
  previousLearningHistory?: string;
  currentKnowledgeLevel?: string;
  createdAt: Date;
  updatedAt: Date;
}

const learnerProfileSchema = new Schema<ILearnerProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    education: { type: String, default: '' },
    educationLevel: { type: String, default: 'Bachelor' },
    experienceLevel: { type: String, default: 'Beginner' },
    currentRole: { type: String, default: '' },
    targetCareer: { type: String, default: '' },
    targetCareerId: { type: String, default: '' },
    profileVersion: { type: Number, default: 1 },
    skills: { type: [Schema.Types.Mixed] as any, default: [] },
    baselineSkills: { type: [Schema.Types.Mixed] as any, default: [] },
    interests: { type: [String], default: [] },
    careerGoals: { type: [String], default: [] },
    learningPreferences: { type: Schema.Types.Mixed, default: [] },
    preferredLearningStyle: { type: String, default: 'Hands-on' },
    weeklyLearningHours: { type: Number, default: 10 },
    completedCourses: [
      {
        title: { type: String, required: true },
        platform: { type: String, default: '' },
        completionDate: { type: Date },
        url: { type: String, default: '' },
      },
    ],
    certifications: [
      {
        title: { type: String, required: true },
        issuer: { type: String, default: '' },
        issueDate: { type: Date },
        credentialUrl: { type: String, default: '' },
      },
    ],
    projects: [
      {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        repoUrl: { type: String, default: '' },
        liveUrl: { type: String, default: '' },
        techStack: { type: [String], default: [] },
      },
    ],
    languages: { type: [String], default: ['English'] },
    location: { type: String, default: '' },
    previousLearningHistory: { type: String, default: '' },
    currentKnowledgeLevel: { type: String, default: 'Beginner' },
  },
  {
    timestamps: true,
  }
);

learnerProfileSchema.pre('save', function (this: ILearnerProfile) {
  if (
    this.isModified('skills') ||
    this.isModified('targetCareer') ||
    this.isModified('targetCareerId') ||
    this.isModified('experienceLevel') ||
    this.isModified('education')
  ) {
    this.profileVersion = (this.profileVersion || 1) + 1;
  }
});

export const LearnerProfile = mongoose.model<ILearnerProfile>('LearnerProfile', learnerProfileSchema);

