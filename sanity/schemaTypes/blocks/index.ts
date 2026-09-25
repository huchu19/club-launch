import { facilitiesBlock } from './facilitiesBlock'
import { faqBlock } from './faqBlock'
import { heroBlock } from './heroBlock'
import { ratesBlock } from './ratesBlock'
import { spaRecoveryBlock } from './spaRecoveryBlock'
import { tourBookingBlock } from './tourBookingBlock'

/** Every block maps one-to-one to a component (and story) of the same name. */
export const blockTypes = [
  heroBlock,
  facilitiesBlock,
  spaRecoveryBlock,
  ratesBlock,
  tourBookingBlock,
  faqBlock,
]

export const blockTypeNames = blockTypes.map((t) => t.name)
