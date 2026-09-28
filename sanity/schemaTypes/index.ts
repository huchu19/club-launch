import { blockTypes } from './blocks'
import { club } from './club'
import { clubPage } from './clubPage'
import { dayPlan } from './dayPlan'
import { facility } from './facility'
import { faqItem } from './faqItem'
import { market } from './market'

export const schemaTypes = [market, club, clubPage, faqItem, dayPlan, facility, ...blockTypes]
