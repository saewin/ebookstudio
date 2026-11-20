export type CourseFormat = 'workshop-1day' | 'workshop-2day' | 'online-course'

export type SlideLayout =
  | 'hero'
  | 'concept'
  | 'two-col'
  | 'diagram'
  | 'workshop'
  | 'case-study'
  | 'quote'

export type SlideTheme = 'executive-blue' | 'midnight-ai' | 'warm-minimal'

export type LaunchChannel = 'facebook' | 'tiktok-reels' | 'line-oa' | 'email'

export interface PreWorkItem {
  id: string
  text: string
  required: boolean
}

export interface CourseSession {
  id: string
  timeRange: string
  title: string
  brainTag: string
  durationMinutes: number
  teachingMinutes: number
  workshopMinutes: number
  summary: string
  objectives: string[]
  topics: string[]
  workshopTitle: string
  workshopSteps: string[]
  deliverable: string
}

export interface CourseSlide {
  id: string
  slideNo: number
  sessionId: string
  layout: SlideLayout
  theme: SlideTheme
  kicker: string
  title: string
  subtitle?: string
  bullets: string[]
  leftTitle?: string
  leftBullets?: string[]
  rightTitle?: string
  rightBullets?: string[]
  highlightBox?: string
  speakerNotes: string
}

export interface PricingTier {
  id: string
  name: string
  badge?: string
  price: string
  originalPrice?: string
  description: string
  features: string[]
  highlighted?: boolean
}

export interface SalesFaq {
  id: string
  question: string
  answer: string
}

export interface CourseSalesPage {
  heroEyebrow: string
  heroHeadline: string
  heroSubheadline: string
  heroCta: string
  painPointsTitle: string
  painPoints: string[]
  bigIdeaTitle: string
  bigIdeaStory: string
  threeBrains: {
    brain: string
    role: string
    description: string
  }[]
  deliverables: {
    title: string
    detail: string
  }[]
  whoIsFor: string[]
  whoIsNotFor: string[]
  pricingTiers: PricingTier[]
  guarantee: string
  faqs: SalesFaq[]
}

export interface LaunchPost {
  id: string
  channel: LaunchChannel
  label: string
  title: string
  hook: string
  body: string
  cta: string
}

export interface StarterKitFile {
  id: string
  path: string
  folder: string
  title: string
  description: string
  content: string
}

export interface TeachingKit {
  instructorChecklist: string[]
  roomEquipment: string[]
  liveDemoSteps: string[]
  thirtyDayRoadmap: {
    week: string
    focus: string
    tasks: string[]
  }[]
  upsellBridgeTitle: string
  upsellBridgeScript: string
}

export interface CourseProject {
  id: string
  title: string
  subtitle: string
  bigIdea: string
  format: CourseFormat
  durationLabel: string
  instructor: string
  targetAudience: string
  status: 'draft' | 'ready' | 'launched'
  slideTheme: SlideTheme
  createdAt: string
  updatedAt: string
  preWorkChecklist: PreWorkItem[]
  sessions: CourseSession[]
  slides: CourseSlide[]
  salesPage: CourseSalesPage
  launchPosts: LaunchPost[]
  starterKitFiles: StarterKitFile[]
  teachingKit: TeachingKit
}
