// Fails if any club fact is stored or restated outside its one home (see
// lib/facts/audit.ts). Runs in CI over the demo content, which is exactly what
// `pnpm seed` writes to Sanity.
import { demoClubs, demoPages } from '../lib/content/demo-data'
import { auditSingleSource } from '../lib/facts/audit'

const problems = auditSingleSource({ clubs: demoClubs, pages: demoPages })
if (problems.length) {
  console.error(`${problems.length} club fact(s) stored in more than one place:`)
  for (const problem of problems) console.error(`- ${problem}`)
  process.exit(1)
}
console.log(
  `One source per club fact: ${demoPages.length} pages and ${demoClubs.length} clubs checked.`,
)
