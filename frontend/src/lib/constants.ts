/** Shared constants — single source of truth for business rules. */
export const MIN_PASSWORD_LENGTH = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Election mapping — must stay in sync with backend/main.py EVENT_ELECTIONS
// ─────────────────────────────────────────────────────────────────────────────
export const EVENT_ELECTIONS: Record<string, string[]> = {
  'Cash Dividend':  ['No election required – cash paid automatically'],
  'Stock Split':    ['No election required – shares adjusted automatically'],
  'Merger':         ['No election required – converted automatically under the merger terms'],
  'Rights Issue':   ['Take up rights', 'Sell rights', 'Let rights lapse'],
  'Warrant Expiry': ['Exercise warrants', 'Sell warrants', 'Let warrants expire'],
};

/** True when the event type has exactly one (mandatory) election. */
export function isMandatoryEvent(eventType: string): boolean {
  const opts = EVENT_ELECTIONS[eventType];
  return !!opts && opts.length === 1;
}

/** Allowed election values for a given event type, or undefined if unknown. */
export function getAllowedElections(eventType: string): string[] | undefined {
  return EVENT_ELECTIONS[eventType];
}

// ─────────────────────────────────────────────────────────────────────────────
// ReviewPage — contextual help explanations for each election option
// ─────────────────────────────────────────────────────────────────────────────
export const ELECTION_EXPLANATIONS: Record<string, string> = {
  // Mandatory
  'No election required – cash paid automatically':
    'Happens automatically. No instruction is sent to the custodian. Your role is to inform the client.',
  'No election required – shares adjusted automatically':
    'Happens automatically. No instruction is sent to the custodian. Your role is to inform the client.',
  'No election required – converted automatically under the merger terms':
    'Happens automatically. No instruction is sent to the custodian. Your role is to inform the client.',
  // Voluntary — Rights Issue
  'Take up rights':
    'The client subscribes for new shares at the subscription price. If all rights are taken up, the client keeps their ownership percentage; taking up only part of the rights can still dilute it. Enough cash must be in the account before the deadline.',
  'Sell rights':
    'The rights are sold in the market and the client receives the proceeds. This is only possible if the rights are tradable (renounceable). The client\u2019s ownership percentage usually decreases.',
  'Let rights lapse':
    'If no action is taken, the rights expire at the deadline. Usually no payment is made, although some markets or offers may pay residual (lapse) proceeds. Ownership is diluted.',
  // Voluntary — Warrant Expiry
  'Exercise warrants':
    'The client pays the exercise price to receive shares. Usually only worthwhile if the market price is above the exercise price.',
  'Sell warrants':
    'The warrants are sold in the market before expiry and the client receives the proceeds. Only possible while the warrants are still trading.',
  'Let warrants expire':
    'No action is taken and the warrants usually expire worthless.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Help & FAQ page text
// ─────────────────────────────────────────────────────────────────────────────

interface FaqItem {
  question: string;
  answer: string;
}

export const HELP_FAQ_USING: FaqItem[] = [
  {
    question: "Why can't I sign off a Preliminary or Pending event?",
    answer:
      "Its terms may still change. Only custodian-confirmed events can be signed off; Operations will notify you once it is confirmed.",
  },
  {
    question: "What happens after I sign off?",
    answer:
      "Your review is saved with a reference number (CA-YYYY-NNNN) and appears in History.",
  },
  {
    question: "How long are my records kept?",
    answer:
      "14 days, then they are deleted automatically. You can delete a record earlier from History.",
  },
  {
    question: "Can other advisors see my reviews?",
    answer:
      "No. They only see that an advisor from your branch has reviewed the event. Your name and notes stay private.",
  },
  {
    question: "When should I still contact Operations?",
    answer:
      "If the client's situation is unusual, the data looks wrong, or a deadline is very close. Tick \"Did you need to contact Operations about this event?\" on the review form and add the reason.",
  },
  {
    question: "What do the key dates mean?",
    answer:
      "Ex-date: shares bought on or after this date do not receive the entitlement. Record date: holders on the register on this date are entitled. Payment date: cash or shares are delivered.",
  },
  {
    question: "What should I check in a rights issue announcement?",
    answer:
      "Before advising a client, check:\n\u2022 Entitlement ratio (for example, 1 new share for every 5 held)\n\u2022 Subscription price\n\u2022 Record date and ex-rights date\n\u2022 Election deadline\n\u2022 Rights trading period\n\u2022 Minimum or maximum application amount\n\u2022 Whether oversubscription is allowed\n\u2022 How fractional entitlements are treated\n\u2022 The default option if the client does not respond\n\u2022 Commissions, fees and tax implications",
  },
  {
    question: "Where does the event data come from?",
    answer:
      "From the custodian (Clearstream, Euroclear or Saxo Bank). The status tag shows the source.",
  },
  {
    question: "What does Alerts show?",
    answer:
      "Ex-dates, record dates and payment dates in the next 14 days, soonest first.",
  },
  {
    question: "How do I change my branch, markets or password?",
    answer: "Use Edit profile at the top of the page.",
  },
];

export const HELP_EVENT_TYPES: FaqItem[] = [
  {
    question: "Cash Dividend",
    answer:
      "The company pays shareholders a cash amount for each eligible share they hold.",
  },
  {
    question: "Stock Split",
    answer:
      "Each existing share is divided into multiple shares; the share price adjusts proportionally, so the total value of the holding is generally unchanged immediately after the split.",
  },
  {
    question: "Rights Issue",
    answer:
      "Existing shareholders are offered the right to buy additional shares at a fixed subscription price before a specified deadline.",
  },
  {
    question: "Merger",
    answer:
      "Shares may be converted into shares of another company, cash, or a combination of both, according to the merger terms and exchange ratio.",
  },
  {
    question: "Warrant Expiry",
    answer:
      "Warrants must generally be exercised or sold before the expiry date; otherwise, they usually expire worthless.",
  },
  {
    question: "Custodian-confirmed",
    answer:
      "The custodian has confirmed the final event terms, so the event can proceed to completion or sign-off.",
  },
  {
    question: "Preliminary",
    answer: "The event terms have been announced but may still be amended or confirmed.",
  },
  {
    question: "Pending",
    answer: "The event is awaiting confirmation or further information, often from the custodian or agent.",
  },
];

export const UNKNOWN_EVENT_TYPE_MESSAGE =
  'No elections are defined for this event type. Please contact Operations.';