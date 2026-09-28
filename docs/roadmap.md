# Roadmap

Each item says what it is and what it's worth to a club operator.

## Shipped

| Feature | Value to the operator |
|---|---|
| Club pages from tested blocks, edited in an embedded Sanity Studio | A marketing team can launch a club page without an engineer, and can't break the layout doing it. |
| Publish-to-live in seconds via a signed webhook | Price changes and opening news go live immediately, with no redeploy or release window. |
| Draft-mode preview from Studio | Editors see exactly what a page will look like before anyone else does. |
| Accessible tour booking with a CRM adapter | Every club gets a lead form that works for all visitors and plugs into whichever CRM the business uses. |
| "Anything else?" FAQ with grounded, streamed answers | Visitors get answers at 11pm, and every new question lands in Studio as a draft answer for the team to approve. |
| AI page drafter with publish-blocking placeholders | A new club's first page draft takes minutes, and invented prices or dates can't reach the public. |
| SEO: metadata, canonical URLs, `HealthClub` JSON-LD, sitemap | Each club page is ready to rank for local searches from launch day. |
| "Plan my first day" concierge: a personalised timeline validated against real spaces and the timetable, attached to tour requests | Turns browsing into intent, and tour guides see what each lead cares about before they arrive. |
| Time-of-day atmosphere: hero wording, tint and a suggested section that follow the club's clock | The page leads with classes in the morning and the spa in the evening, matching what visitors want then. |
| Explorable club map: an illustrated floor plan with what's on in each space now and next, by mouse, touch or keyboard | Shows off the spaces that justify the price, and works for every visitor. |
| Shareable "my club day" page and social card | Word-of-mouth referrals that carry the club's branding and link straight to a tour. |
| "What it really costs" calculator: cost per visit, the joining fee spread over a year, and a comparison with paying separately | Answers the price objection on the page, including the joining fee, rather than on the phone. |
| CI with unit, component, accessibility and end-to-end tests | Changes ship without regressions, and accessibility is checked on every change. |

## Next

### For prospective members

| Milestone | Feature | Value to the operator |
|---|---|---|
| M13 | "How busy is it" forecast by space and hour (illustrative data) | Reduces "it'll be packed" hesitation and steers visits to quieter hours. |

### For club teams

| Milestone | Feature | Value to the operator |
|---|---|---|
| M14 | Question insights: top, unanswered and recent questions, grouped | Shows what prospects actually worry about, so FAQs and sales scripts keep up. |
| M15 | Launch readiness check in Studio, with a score and a publishing gate | No page goes live with placeholders, missing alt text, missing SEO or hidden joining fees. |
| M16 | Founding member pre-sale with a live "places left" count | Builds a waiting list and early revenue for clubs that haven't opened yet. |
| M17 | One source of club facts, enforced in CI | Hours, address and prices are edited once and stay consistent across the page, search results and AI answers. |

## Backlog

| Idea | Value to the operator |
|---|---|
| A real CRM adapter (for example Salesforce or HubSpot) with idempotency keys and a dead-letter queue | No tour request is lost, even when the CRM is down. |
| Shared rate limiting and FAQ cache (Redis or Vercel KV) | Limits hold across serverless instances, protecting AI quota and cost. |
| Grouping similar questions with embeddings | One approved answer serves many phrasings of the same question. |
| Multiple markets and locales (the `market` document and URL segment already exist) | The same platform launches clubs in other countries. |
| Visual regression tests and Lighthouse budgets in CI | Protects brand consistency and page speed as the block library grows. |
