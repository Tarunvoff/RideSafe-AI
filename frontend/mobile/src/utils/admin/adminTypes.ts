export const ADMIN_BRAND_ACCENT = '#16a34a';

export type WorkerLedgerStatus = 'SUBMITTED' | 'APPROVED' | 'IN_REVIEW';

export type AdminForensicSubmission = {
  profileId: string;
  userId: string;
  email: string;
  phone: string | null;
  status: string;
  submittedAt: string;
  userCreatedAt: string;
};

export type AdminActuarialDashboardSummary = {
  totalWorkers: number;
  activePlans: number;
  activeAlerts: number;
  claimsToday: number;
  highRiskWorkers: number;
  projectedPayout: number;
  recentAlerts: Array<{
    id: string;
    type: string;
    title: string;
    occurredAt: string;
    expectedPayout: number | null;
  }>;
  recentClaims: Array<{
    payoutId: string;
    status: string;
    estimatedLoss: number | null;
    approvedPayout: number | null;
    createdAt: string;
    policyId: string;
    userEmail: string | null;
    disruption: { type: string | null; title: string | null };
  }>;
};

export type AdminFiscalClaimsResponse = {
  total: number;
  pendingReview: number;
  totalPayout: number;
  claims: Array<{
    payoutId: string;
    status: string;
    estimatedLoss: number | null;
    approvedPayout: number | null;
    createdAt: string;
    policyId: string;
    userEmail: string | null;
    disruption: { type: string | null; title: string | null };
  }>;
};

const now = Date.now();

const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

export const ADMIN_LEDGER_WORKERS: AdminForensicSubmission[] = [
  {
    profileId: 'k1',
    userId: 'u1',
    email: 'operator.01@aegis-platform.com',
    phone: '+91 9000000001',
    status: 'SUBMITTED',
    submittedAt: iso(1000 * 60 * 30),
    userCreatedAt: iso(1000 * 60 * 60 * 24 * 7),
  },
  {
    profileId: 'k2',
    userId: 'u2',
    email: 'operator.02@aegis-platform.com',
    phone: '+91 9000000002',
    status: 'SUBMITTED',
    submittedAt: iso(1000 * 60 * 60 * 6),
    userCreatedAt: iso(1000 * 60 * 60 * 24 * 12),
  },
  {
    profileId: 'k3',
    userId: 'u3',
    email: 'supervisor.alpha@aegis-platform.com',
    phone: '+91 9000000003',
    status: 'IN_REVIEW',
    submittedAt: iso(1000 * 60 * 60 * 20),
    userCreatedAt: iso(1000 * 60 * 60 * 24 * 20),
  },
];

export const ADMIN_ACTUARIAL_SUMMARY: AdminActuarialDashboardSummary = {
  totalWorkers: 3,
  activePlans: 5,
  activeAlerts: 2,
  claimsToday: 1,
  highRiskWorkers: 2,
  projectedPayout: 800,
  recentAlerts: [
    {
      id: 'a1',
      type: 'RAIN',
      title: 'Heavy Rain Warning',
      occurredAt: iso(1000 * 60 * 12),
      expectedPayout: 800,
    },
    {
      id: 'a2',
      type: 'AQI',
      title: 'Air Quality Alert',
      occurredAt: iso(1000 * 60 * 60 * 4),
      expectedPayout: 0,
    },
  ],
  recentClaims: [
    {
      payoutId: 'p1',
      status: 'PROCESSING',
      estimatedLoss: 850,
      approvedPayout: null,
      createdAt: iso(1000 * 60 * 18),
      policyId: 'pol1',
      userEmail: 'operator.01@aegis-platform.com',
      disruption: { type: 'RAIN', title: 'Heavy Rain Warning' },
    },
    {
      payoutId: 'p2',
      status: 'APPROVED',
      estimatedLoss: 600,
      approvedPayout: 800,
      createdAt: iso(1000 * 60 * 60 * 8),
      policyId: 'pol2',
      userEmail: 'operator.02@aegis-platform.com',
      disruption: { type: 'AQI', title: 'Air Quality Alert' },
    },
  ],
};

export const ADMIN_FISCAL_CLAIMS_LEDGER: AdminFiscalClaimsResponse = {
  total: 2,
  pendingReview: 1,
  totalPayout: 800,
  claims: ADMIN_ACTUARIAL_SUMMARY.recentClaims.map((c) => ({
    payoutId: c.payoutId,
    status: c.status,
    estimatedLoss: c.estimatedLoss,
    approvedPayout: c.approvedPayout,
    createdAt: c.createdAt,
    policyId: c.policyId,
    userEmail: c.userEmail,
    disruption: c.disruption,
  })),
};

