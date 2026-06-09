import type { GoalArea } from "./goal-areas";

/** Where an inbound record originated - stored at company level. */
export type LeadSource =
  | "linkedin"
  | "referral"
  | "cold_email"
  | "website"
  | "event"
  | "other";

export type Company = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  techStack?: string | null;
  tags: string[];
  source: LeadSource | null;
};

export type Contact = {
  id: string;
  companyId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
};

export type LeadStage = "new" | "contacted" | "qualified" | "lost";

export type Lead = {
  id: string;
  companyId: string;
  primaryContactId?: string | null;
  /** Denormalized - mirrors Company.name for fast tables */
  company: string;
  contactName: string;
  email: string;
  stage: LeadStage;
  valueEur: number;
  owner: string;
  updatedAt: string;
};

/** Freelancer pipeline - matches revenue stages before win/loss. */
export type DealStage =
  | "lead"
  | "contacted"
  | "discovery_call"
  | "proposal_sent"
  | "negotiation"
  | "won"
  | "lost";

export type DealPricingModel = "fixed" | "hourly" | "retainer";

export type Deal = {
  id: string;
  companyId: string;
  primaryContactId?: string | null;
  /** Denormalized account label for cards */
  company: string;
  title: string;
  stage: DealStage;
  valueEur: number;
  probability: number;
  closeDate: string;
  owner: string;
  /** Primary commercial line (design, dev, SEO, …) */
  serviceLine?: string | null;
  dealScope?: string | null;
  pricingModel?: DealPricingModel | null;
};

export type TaskPriority = "low" | "medium" | "high";

export type TaskRelatedKind =
  | "deal"
  | "company"
  | "contact"
  | "lead"
  | "goal"
  | "none";

export type Task = {
  id: string;
  title: string;
  relatedKind: TaskRelatedKind;
  relatedId: string | null;
  /** Optional window start; when set with dueAt, defines a From–To scheduled block. */
  scheduledFromAt: string | null;
  dueAt: string;
  priority: TaskPriority;
  /** When checked off while open: due moves forward one calendar day instead of resting in Done. */
  repeatDaily: boolean;
  done: boolean;
  assignee: string;
};

export type InvoiceStatus = "draft" | "sent" | "paid";

export type Invoice = {
  id: string;
  dealId?: string | null;
  companyId: string;
  amountEur: number;
  status: InvoiceStatus;
  paymentMethod?: string | null;
  note?: string | null;
  updatedAt: string;
};

export type ActivityKind = "call" | "email" | "meeting" | "note" | "file";

export type ActivityParentKind = "deal" | "company" | "contact" | "lead";

export type ActivityNote = {
  id: string;
  parentKind: ActivityParentKind;
  parentId: string;
  kind: ActivityKind;
  title?: string | null;
  body: string;
  occurredAt: string;
};

/** Post-sale delivery - lanes follow calendar buckets on the Projects board */
export type ProjectStatus = "planned" | "active" | "blocked" | "done";

export type Project = {
  id: string;
  title: string;
  companyId: string;
  company: string;
  dealId?: string | null;
  /** Anchor calendar date for year / month / week lanes */
  scheduledStart: string;
  /** Optional local hour (0-23) for day-board lanes */
  scheduledHour?: number | null;
  status: ProjectStatus;
  owner: string;
};

/** Mirrors the CLIENT PORTFOLIO sheet column layout (spreadsheet template). */
export type CustomerPortfolio = {
  id: string;
  nr: number | null;
  companyName: string | null;
  registrationNumber: string | number | null;
  lursoft: string | null;
  industry: string | null;
  naceCode: string | null;
  kycForm: string | null;
  idCopy: string | null;
  meetingDate: string | null;
  clientAcceptanceComplete: string | null;
  riskLevel: string | null;
  contractNo: string | null;
  period: string | null;
  contractSigned: string | null;
  contractDate: string | null;
  scope: string | null;
  feeEur: number | null;
  firstInvoicePercent: string | null;
  firstInvoiceAmountEur: number | null;
  secondInvoicePercent: string | null;
  secondInvoiceAmountEur: number | null;
  thirdInvoicePercent: string | null;
  thirdInvoiceAmountEur: number | null;
  additionalInvoicing: string | null;
  invoiceCheck: number | null;
  emailForInvoices: string | null;
  clientContactName: string | null;
  clientContactPosition: string | null;
  contactEmail: string | null;
  whatsapp: string | null;
  lastContactDate: string | null;
  infoRequestDeadline: string | null;
  reportDraft: string | null;
  finalReport: string | null;
  language: string | null;
  framework: string | null;
  sanctionsCheck: string | null;
  address: string | null;
};

/**
 * Goal time horizons - near-term commits → strategic posture → ultra-long north stars.
 * `short_term` attaches `longTermGoalId` (to an existing `long_term` goal).
 * Optional `visionParentGoalId` anchors `long_term` goals to any 5/10/20-year vision row.
 */
export type GoalHorizon =
  | "short_term"
  | "one_year"
  | "long_term"
  | "vision_5"
  | "vision_10"
  | "vision_20";

export type GoalStatus = "active" | "completed" | "archived";

export type { GoalArea };

export type Goal = {
  id: string;
  horizon: GoalHorizon;
  /** Strategic (`long_term`) goal this short-term rolls up to; always null unless horizon is short_term */
  longTermGoalId: string | null;
  /** Ultra-long vision goal this strategic row aligns with; always null unless horizon is long_term */
  visionParentGoalId: string | null;
  title: string;
  /** Measurable outcome (“specific / measurable”) */
  metric: string | null;
  targetDate: string | null;
  /** 0-100 checkpoint */
  progress: number;
  status: GoalStatus;
  area: GoalArea | null;
  /** Weekly / retro scratchpad */
  reviewNote: string | null;
  sortOrder: number;
  updatedAt: string;
};
