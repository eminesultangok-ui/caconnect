/**
 * CAConnect — Shared TypeScript interfaces
 * All application types are defined here for consistency.
 */

// CorporateAction — one overseas corporate action event
export interface CorporateAction {
  id: string;                        // e.g. "CA-001"
  security: string;                  // e.g. "Apple Inc."
  ticker: string;                    // e.g. "AAPL"
  avatarColor: string;               // hex colour for ticker avatar circle
  issuer: string;
  isin: string;                      // e.g. "CH0012032048"
  market: string;                    // e.g. "Switzerland"
  eventType: 'Cash Dividend' | 'Stock Split' | 'Rights Issue' | 'Merger' | 'Warrant Expiry';
  ratio: string;                     // e.g. "CHF 3.05 per share"
  exDate: string;                    // ISO date
  recordDate: string;
  paymentDate: string;
  status: 'Custodian-confirmed' | 'Preliminary' | 'Pending';
  source: string;                    // e.g. "Clearstream", "Euroclear"
  plainEnglish: string;              // "What does this mean?" explainer
  reviewedByBranches: string[];      // branches that have already reviewed
}

// AdvisorProfile — built during /setup
export interface AdvisorProfile {
  name: string;
  branch: string;
  markets: string[];
  notificationPref: 'email' | 'in-app' | 'both';
}

// ReviewEntry — one completed sign-off (stored in localStorage)
export interface ReviewEntry {
  reviewId: string;
  advisorName: string;
  branch: string;
  eventId: string;
  security: string;
  eventType: string;
  affectedAccountCount: number;
  election: string;
  notes: string;                        // optional
  contactedOps: boolean;
  opsReason?: string;                   // only if contactedOps === true
  timestamp: string;                    // ISO
  eventStatus: CorporateAction['status']; // snapshot at time of review
  eventSource: string;                  // snapshot at time of review
}

// AdoptionStats — computed live from reviews[] + corporateActions[]
export interface AdoptionStats {
  totalEvents: number;
  reviewedEvents: number;
  selfServiceEvents: number;         // reviews where contactedOps === false
  selfServiceRate: number;           // percentage, 0–100
  selfServiceCount: number;          // this advisor's personal count
  opsContactsAvoided: number;        // = selfServiceCount
}

// ReviewDraft — the in-progress review form state, owned by App.tsx
export interface ReviewDraft {
  eventId: string;
  eventType: string;
  eventStatus: CorporateAction['status'];
  eventSource: string;
  affectedAccountCount: number;
  election: string;
  notes: string;
  contactedOps: boolean;
  opsReason: string | undefined;
}

// Router state passed to /result
export interface ResultState {
  success: boolean;
  reference?: string;
  reason?: string;
  selfServiceCount: number;
  eventStatus: CorporateAction['status'];
  eventSource: string;
}