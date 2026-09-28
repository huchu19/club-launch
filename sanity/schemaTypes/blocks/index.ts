import { calculatorBlock } from './calculatorBlock'
import { clubMapBlock } from './clubMapBlock'
import { conciergeBlock } from './conciergeBlock'
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
  conciergeBlock,
  calculatorBlock,
  clubMapBlock,
]

export const blockTypeNames = blockTypes.map((t) => t.name)
