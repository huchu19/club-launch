import { arrayKey } from '@/lib/content/to-sanity'
import type { PageBlock } from '@/lib/content/types'
import type { DraftOutput } from './schema'

/** The model's per-block object → the page's ordered blocks (SPEC §3 order). */
export function draftToBlocks(draft: DraftOutput): PageBlock[] {
  return [
    {
      _type: 'heroBlock',
      _key: arrayKey(),
      eyebrow: draft.hero.eyebrow,
      heading: draft.hero.heading,
      subheading: draft.hero.subheading,
      primaryCta: { label: draft.hero.ctaLabel, target: 'tour' },
    },
    // No override: the page shows the club's own facilities list.
    { _type: 'facilitiesBlock', _key: arrayKey(), ...draft.facilities },
    {
      _type: 'spaRecoveryBlock',
      _key: arrayKey(),
      eyebrow: draft.spaRecovery.eyebrow,
      heading: draft.spaRecovery.heading,
      intro: draft.spaRecovery.intro,
      items: draft.spaRecovery.items.map((item) => ({ _key: arrayKey(), ...item })),
    },
    {
      _type: 'ratesBlock',
      _key: arrayKey(),
      heading: draft.rates.heading,
      note: draft.rates.note,
      plans: draft.rates.plans.map((plan) => ({ _key: arrayKey(), ...plan })),
    },
    { _type: 'tourBookingBlock', _key: arrayKey(), ...draft.tourBooking },
    { _type: 'faqBlock', _key: arrayKey(), ...draft.faq, allowQuestions: true },
  ]
}
