import type {
  Club,
  ClubMap,
  FaqStatus,
  Intensity,
  Market,
  PageBlock,
  ScheduleEntry,
  Seo,
  Space,
  Weekday,
} from './types'

// Demo content: one fully built relaunch page (Mayfair-style) and one club
// with facts only (Moorgate-style), whose page is created live with the AI
// drafter. Used by demo-content mode, Storybook and `pnpm seed`.
// Everything here is fictional; phone numbers use Ofcom's drama range.

export const demoMarket: Market = {
  code: 'uk',
  name: 'United Kingdom',
  locale: 'en-GB',
  currency: 'GBP',
  // Illustrative London prices for the cost calculator's "paying separately" comparison.
  comparisonItems: [
    { usage: 'gym', label: 'Gym day pass', unitPrice: 25, unit: 'visit' },
    { usage: 'classes', label: 'Boutique fitness class', unitPrice: 28, unit: 'class' },
    { usage: 'spa', label: 'Spa day pass', unitPrice: 55, unit: 'visit' },
    { usage: 'recovery', label: 'Sauna and cold plunge session', unitPrice: 30, unit: 'session' },
    { usage: 'cowork', label: 'Co-working day pass', unitPrice: 30, unit: 'day' },
  ],
}

export const MAYFAIR_ID = 'club-linden-mayfair'
export const MOORGATE_ID = 'club-linden-moorgate'

const everyDay = (opens: string, closes: string, weekend?: [string, string]) =>
  (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const).map(
    (day) => {
      const [o, c] = weekend && (day === 'Saturday' || day === 'Sunday') ? weekend : [opens, closes]
      return { day, opens: o, closes: c }
    },
  )

/** Spaces at the Mayfair club. The schedule, day plans and club map refer to them by id. */
const mayfairSpaces: Space[] = [
  {
    id: 'strength-studio',
    name: 'Strength studio',
    category: 'gym',
    description:
      'Free weights, racks and conditioning kit, with coaches on the floor at peak times.',
    typicalUses: ['Strength training', 'Coached conditioning', 'Open gym sessions'],
    openingHours: [],
  },
  {
    id: 'pool',
    name: '20-metre pool',
    category: 'pool',
    description: 'A naturally lit lap pool with lane swimming all day.',
    typicalUses: ['Lane swimming', 'Swim technique', 'Easy recovery swims'],
    openingHours: [],
  },
  {
    id: 'thermal-suite',
    name: 'Thermal suite',
    category: 'spa',
    description: 'Sauna, steam room and a salt inhalation room, looking onto the garden.',
    typicalUses: ['Sauna and steam', 'Unwinding after training', 'Quiet time'],
    openingHours: [],
  },
  {
    id: 'contrast-therapy',
    name: 'Contrast therapy',
    category: 'recovery',
    description: 'Cold plunge pools beside the sauna for hot and cold circuits.',
    typicalUses: ['Hot and cold circuits', 'Recovery after training'],
    openingHours: [],
  },
  {
    id: 'movement-studio',
    name: 'Movement studio',
    category: 'studio',
    description: 'Yoga, Pilates, mobility and breathwork classes throughout the week.',
    typicalUses: ['Yoga', 'Pilates', 'Mobility', 'Breathwork'],
    openingHours: [],
  },
  {
    id: 'workspace',
    name: "Members' workspace",
    category: 'cowork',
    description: 'Quiet desks, phone booths and meeting rooms you can book by the hour.',
    typicalUses: ['Focused work', 'Calls in a phone booth', 'Meetings'],
    openingHours: everyDay('07:00', '20:00', ['08:00', '18:00']),
  },
  {
    id: 'garden-kitchen',
    name: 'Garden kitchen',
    category: 'food',
    description: 'Seasonal breakfasts, lunches and cold-pressed juices.',
    typicalUses: ['Breakfast', 'Lunch', 'A juice after training'],
    openingHours: everyDay('07:00', '20:00', ['08:00', '19:00']),
  },
]

/**
 * An invented, illustrative two-floor plan (never a real club's drawings), in a
 * 1000 × 640 viewBox. Zones point at spaces by id; features are decoration.
 */
const mayfairMap: ClubMap = {
  viewBox: '0 0 1000 640',
  floors: [
    {
      name: 'Ground floor',
      zones: [
        { spaceId: 'garden-kitchen', shape: 'rect', x: 40, y: 40, w: 360, h: 250 },
        { spaceId: 'workspace', shape: 'rect', x: 420, y: 40, w: 540, h: 250 },
        {
          spaceId: 'strength-studio',
          shape: 'polygon',
          points: '40,310 600,310 600,600 240,600 240,470 40,470',
          labelX: 420,
          labelY: 440,
        },
        { spaceId: 'movement-studio', shape: 'rect', x: 620, y: 310, w: 340, h: 290 },
      ],
      features: [
        { kind: 'entrance', label: 'Entrance', shape: 'rect', x: 40, y: 490, w: 180, h: 110 },
      ],
    },
    {
      name: 'Lower ground floor',
      zones: [
        { spaceId: 'pool', shape: 'rect', x: 40, y: 40, w: 620, h: 230 },
        { spaceId: 'thermal-suite', shape: 'rect', x: 680, y: 40, w: 280, h: 230 },
        { spaceId: 'contrast-therapy', shape: 'rect', x: 680, y: 290, w: 280, h: 310 },
      ],
      features: [
        { kind: 'garden', label: 'Courtyard garden', shape: 'rect', x: 40, y: 290, w: 620, h: 310 },
      ],
    },
  ],
}

type ClassSlot = [
  time: string,
  name: string,
  spaceId: string,
  minutes: number,
  intensity: Intensity,
]

const classes = (days: Weekday[], slots: ClassSlot[]): ScheduleEntry[] =>
  days.flatMap((day) =>
    slots.map(([time, name, spaceId, durationMin, intensity]) => ({
      day,
      time,
      name,
      spaceId,
      durationMin,
      intensity,
    })),
  )

/** A sample weekly timetable, within the club's opening hours. */
const mayfairSchedule: ScheduleEntry[] = [
  ...classes(
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    [
      ['06:30', 'Strength foundations', 'strength-studio', 45, 'medium'],
      ['07:15', 'Morning mobility', 'movement-studio', 30, 'low'],
      ['17:30', 'Guided contrast circuit', 'contrast-therapy', 30, 'low'],
    ],
  ),
  ...classes(
    ['Monday', 'Wednesday', 'Friday'],
    [
      ['08:00', 'Vinyasa yoga', 'movement-studio', 60, 'medium'],
      ['12:30', 'Express conditioning', 'strength-studio', 30, 'high'],
    ],
  ),
  ...classes(
    ['Tuesday', 'Thursday'],
    [
      ['08:00', 'Mat Pilates', 'movement-studio', 45, 'medium'],
      ['12:30', 'Swim technique', 'pool', 30, 'medium'],
      ['19:00', 'Breathwork', 'movement-studio', 30, 'low'],
    ],
  ),
  ...classes(
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    [
      ['18:15', 'Strength and conditioning', 'strength-studio', 45, 'high'],
      ['20:00', 'Yin yoga', 'movement-studio', 60, 'low'],
    ],
  ),
  ...classes(['Monday', 'Wednesday'], [['19:00', 'Slow stretch', 'movement-studio', 45, 'low']]),
  ...classes(['Friday'], [['18:15', 'Breathwork', 'movement-studio', 30, 'low']]),
  ...classes(
    ['Saturday'],
    [
      ['08:00', 'Weekend strength', 'strength-studio', 60, 'high'],
      ['09:30', 'Vinyasa yoga', 'movement-studio', 60, 'medium'],
      ['11:00', 'Swim technique', 'pool', 45, 'medium'],
      ['16:00', 'Guided contrast circuit', 'contrast-therapy', 30, 'low'],
      ['17:00', 'Slow stretch', 'movement-studio', 45, 'low'],
    ],
  ),
  ...classes(
    ['Sunday'],
    [
      ['09:00', 'Mat Pilates', 'movement-studio', 45, 'medium'],
      ['10:30', 'Breathwork', 'movement-studio', 30, 'low'],
      ['16:00', 'Guided contrast circuit', 'contrast-therapy', 30, 'low'],
      ['17:00', 'Yin yoga', 'movement-studio', 60, 'low'],
    ],
  ),
]

export const demoClubs: Club[] = [
  {
    _id: MAYFAIR_ID,
    name: 'Linden Mayfair',
    slug: 'linden-mayfair',
    market: demoMarket,
    tier: 'social-wellness',
    status: 'open',
    address: {
      streetAddress: '7 Linden Mews',
      locality: 'Mayfair, London',
      postalCode: 'W1K 2AB',
      country: 'GB',
    },
    geo: { lat: 51.5098, lng: -0.1492 },
    openingHours: [
      { day: 'Monday', opens: '06:00', closes: '22:30' },
      { day: 'Tuesday', opens: '06:00', closes: '22:30' },
      { day: 'Wednesday', opens: '06:00', closes: '22:30' },
      { day: 'Thursday', opens: '06:00', closes: '22:30' },
      { day: 'Friday', opens: '06:00', closes: '22:00' },
      { day: 'Saturday', opens: '07:00', closes: '21:00' },
      { day: 'Sunday', opens: '07:00', closes: '21:00' },
    ],
    phone: '020 7946 0018',
    facilities: [
      {
        name: 'Strength studio',
        category: 'gym',
        description:
          'Free weights, racks and conditioning kit, with coaches on the floor at peak times.',
      },
      {
        name: '20-metre pool',
        category: 'pool',
        description: 'A naturally lit lap pool with lane swimming all day.',
      },
      {
        name: 'Thermal suite',
        category: 'spa',
        description: 'Sauna, steam room and a salt inhalation room.',
      },
      {
        name: 'Contrast therapy',
        category: 'recovery',
        description: 'Cold plunge pools beside the sauna for hot and cold circuits.',
      },
      {
        name: 'Movement studio',
        category: 'studio',
        description: 'Yoga, Pilates and breathwork classes throughout the week.',
      },
      {
        name: "Members' workspace",
        category: 'cowork',
        description: 'Quiet desks, phone booths and meeting rooms you can book by the hour.',
      },
      {
        name: 'Garden kitchen',
        category: 'food',
        description: 'Seasonal breakfasts, lunches and cold-pressed juices.',
      },
    ],
    spaces: mayfairSpaces,
    schedule: mayfairSchedule,
    timeZone: 'Europe/London',
    clubMap: mayfairMap,
    facts: [
      { label: 'Club membership', value: '£245 per month.' },
      { label: 'Club and workspace membership', value: '£325 per month.' },
      { label: 'Off-peak membership', value: '£175 per month, weekdays 10:00–16:00.' },
      { label: 'Joining fee', value: '£150, paid once when you join.' },
      { label: 'Notice period', value: 'All memberships are monthly with 30 days’ notice.' },
      {
        label: 'Parking',
        value:
          'There is no on-site parking. The nearest public car park is a five-minute walk away.',
      },
      {
        label: 'Guest policy',
        value: 'Members may bring up to two guests per visit, at £30 per guest, after 10:00.',
      },
      { label: 'Towels and toiletries', value: 'Towels, robes and toiletries are provided.' },
      { label: 'Classes', value: 'Classes are included and can be booked up to 7 days ahead.' },
      { label: 'Minimum age', value: 'Members must be 18 or over.' },
      {
        label: 'Accessibility',
        value: 'Step-free access throughout, an accessible changing room and a pool hoist.',
      },
      { label: 'Children', value: 'There is no crèche at this club.' },
      {
        label: 'Relaunch',
        value: 'The club has been refurbished and relaunched as a social wellness club.',
      },
    ],
    seo: {
      title: 'Linden Mayfair — social wellness club',
      description:
        'Train, recover and work under one roof in Mayfair: thermal suite, contrast therapy, a 20-metre pool and a members’ workspace.',
    },
  },
  {
    _id: MOORGATE_ID,
    name: 'Linden Moorgate',
    slug: 'linden-moorgate',
    market: demoMarket,
    tier: 'social-wellness',
    status: 'coming-soon',
    address: {
      streetAddress: '40 Linden Court',
      locality: 'Moorgate, London',
      postalCode: 'EC2R 6AB',
      country: 'GB',
    },
    geo: { lat: 51.5177, lng: -0.0889 },
    openingHours: [
      { day: 'Monday', opens: '06:00', closes: '22:00' },
      { day: 'Tuesday', opens: '06:00', closes: '22:00' },
      { day: 'Wednesday', opens: '06:00', closes: '22:00' },
      { day: 'Thursday', opens: '06:00', closes: '22:00' },
      { day: 'Friday', opens: '06:00', closes: '21:00' },
      { day: 'Saturday', opens: '08:00', closes: '20:00' },
      { day: 'Sunday', opens: '08:00', closes: '20:00' },
    ],
    phone: '020 7946 0342',
    facilities: [
      {
        name: 'Strength floor',
        category: 'gym',
        description: 'Racks, platforms and free weights across the whole lower floor.',
      },
      {
        name: 'Reformer studio',
        category: 'studio',
        description: 'Twelve reformer beds for small-group Pilates.',
      },
      { name: 'Infrared sauna', category: 'spa', description: 'Two infrared cabins.' },
      {
        name: 'Cold plunge',
        category: 'recovery',
        description: 'Two cold plunge pools next to the sauna.',
      },
      {
        name: "Members' workspace",
        category: 'cowork',
        description: 'Desks and call booths on the mezzanine.',
      },
      { name: 'Juice bar', category: 'food', description: 'Smoothies, coffee and light snacks.' },
    ],
    spaces: [],
    schedule: [],
    timeZone: 'Europe/London',
    facts: [
      {
        label: 'Conversion',
        value: 'An existing gym being converted into a social wellness club.',
      },
      {
        label: 'Existing members',
        value: 'Current members keep their membership through the conversion.',
      },
      {
        label: 'Parking',
        value: 'There is no parking. Moorgate station is a two-minute walk away.',
      },
      { label: 'Towels', value: 'Towels are provided.' },
      { label: 'Minimum age', value: 'Members must be 18 or over.' },
      { label: 'Accessibility', value: 'Step-free access and a lift to every floor.' },
    ],
    seo: {
      title: 'Linden Moorgate — coming soon',
      description: 'A social wellness club is coming to Moorgate.',
    },
  },
]

const img = (file: string, alt: string, width = 1600, height = 1200) => ({
  url: `/placeholders/${file}`,
  alt,
  width,
  height,
})

export const demoImages = {
  heroArches: img(
    'hero-arches.jpg',
    'Illustration of three tall arches opening onto a garden terrace and a lap pool.',
    1600,
    1000,
  ),
  thermalSuite: img(
    'thermal-suite.jpg',
    'Illustration of timber sauna slats, rising steam and a stack of warm stones.',
  ),
  contrastPool: img(
    'contrast-pool.jpg',
    'Illustration of a round cold plunge pool seen from above, with ripples and a floating leaf.',
  ),
  gardenBreath: img(
    'garden-breath.jpg',
    'Illustration of tall garden leaves around a terracotta mat in soft morning light.',
  ),
}

export type DemoClubPage = {
  _id: string
  clubId: string
  title: string
  seo?: Seo
  blocks: PageBlock[]
  updatedAt: string
}

export const demoPages: DemoClubPage[] = [
  {
    _id: 'clubPage-linden-mayfair',
    clubId: MAYFAIR_ID,
    title: 'Linden Mayfair',
    updatedAt: '2026-09-20T09:00:00Z',
    seo: {
      title: 'Linden Mayfair — a social wellness club in Mayfair',
      description:
        'Relaunched as a social wellness club: thermal suite, contrast therapy, a 20-metre pool and a members’ workspace. Book a tour.',
    },
    blocks: [
      {
        _type: 'heroBlock',
        _key: 'hero',
        eyebrow: 'Mayfair · Newly relaunched',
        heading: 'A slower kind of club in the heart of Mayfair',
        subheading:
          'Train, recover and work under one roof. Linden Mayfair has been rebuilt around a thermal suite, a garden kitchen and a calm, naturally lit pool.',
        image: demoImages.heroArches,
        primaryCta: { label: 'Book a tour', target: 'tour' },
      },
      {
        _type: 'facilitiesBlock',
        _key: 'facilities',
        heading: 'Everything under one roof',
        intro:
          'Strength, swimming, recovery and a quiet place to work, designed to be used in the same visit.',
        facilities: [],
      },
      {
        _type: 'clubMapBlock',
        _key: 'map',
        eyebrow: 'Find your way around',
        heading: 'Two floors, one unhurried day',
        intro:
          'Explore the club floor by floor. Choose a space to see what it’s for and what’s on there now. The plan is illustrative.',
      },
      {
        _type: 'conciergeBlock',
        _key: 'concierge',
        eyebrow: 'Plan your first day',
        heading: 'A day here, shaped around your week',
        intro:
          'Tell us a little about your week and we’ll suggest a first day at the club, built from the real timetable. Suggestions are generated automatically, so the team can help you adjust them on your tour.',
        chips: ['I work from home', 'Training for an event', 'I need to unwind'],
      },
      {
        _type: 'spaRecoveryBlock',
        _key: 'recovery',
        eyebrow: 'The garden',
        heading: 'Recovery, taken as seriously as training',
        intro:
          'The lower floor opens onto a planted courtyard. Move between heat, cold and stillness at your own pace.',
        items: [
          {
            _key: 'thermal',
            name: 'Thermal suite',
            description:
              'A sauna, steam room and salt inhalation room, with loungers looking out onto the garden.',
            image: demoImages.thermalSuite,
          },
          {
            _key: 'contrast',
            name: 'Contrast therapy',
            description: 'Cold plunge pools beside the sauna for hot and cold circuits.',
            image: demoImages.contrastPool,
          },
          {
            _key: 'breath',
            name: 'Breathwork and stretch',
            description:
              'Guided breathwork and slow stretch classes in the movement studio, included with every membership.',
            image: demoImages.gardenBreath,
          },
        ],
      },
      {
        _type: 'ratesBlock',
        _key: 'rates',
        heading: 'Membership',
        plans: [
          {
            _key: 'club',
            name: 'Club',
            pricePerMonth: '245',
            joiningFee: '150',
            inclusions: [
              'Gym, pool and classes',
              'Thermal suite and contrast therapy',
              'Towels, robes and toiletries',
            ],
          },
          {
            _key: 'workspace',
            name: 'Club and workspace',
            pricePerMonth: '325',
            joiningFee: '150',
            inclusions: [
              'Everything in Club',
              "Members' workspace, any time",
              'Bookable meeting rooms',
            ],
          },
          {
            _key: 'offpeak',
            name: 'Off-peak',
            pricePerMonth: '175',
            joiningFee: '150',
            inclusions: ['Weekdays 10:00–16:00', 'Gym, pool and classes', 'Thermal suite'],
          },
        ],
        note: 'All memberships are monthly with 30 days’ notice. Members must be 18 or over.',
      },
      {
        _type: 'calculatorBlock',
        _key: 'calculator',
        eyebrow: 'What it really costs',
        heading: 'Work out your cost per visit',
        intro:
          'Tell us how often you’d come and what you’d use. We’ll show your monthly cost, what each visit works out at, and what the same things would cost paid for one by one.',
        comparisonLabel: 'Typical London prices, for comparison. Illustrative, not quotes.',
      },
      {
        _type: 'tourBookingBlock',
        _key: 'tour',
        heading: 'Come and see it for yourself',
        intro:
          'Tours take about 30 minutes. Tell us when suits you and the membership team will confirm by email.',
      },
      {
        _type: 'faqBlock',
        _key: 'faq',
        heading: 'Questions, answered',
        intro: 'The things people ask most. If yours is not here, ask it below.',
        allowQuestions: true,
      },
    ],
  },
]

export type DemoFaq = {
  _id: string
  clubId: string
  question: string
  answer: string
  status: FaqStatus
  source: 'editor' | 'ai'
  askedCount: number
}

export const demoFaqs: DemoFaq[] = [
  {
    _id: 'faq-mayfair-parking',
    clubId: MAYFAIR_ID,
    question: 'Is there parking at the club?',
    answer:
      'There is no on-site parking. The nearest public car park is a five-minute walk away, and Bond Street and Green Park stations are close by.',
    status: 'approved',
    source: 'editor',
    askedCount: 14,
  },
  {
    _id: 'faq-mayfair-guests',
    clubId: MAYFAIR_ID,
    question: 'Can I bring a guest?',
    answer:
      'Yes. Members may bring up to two guests per visit after 10:00, at £30 per guest. Guests need to sign in at reception with photo ID.',
    status: 'approved',
    source: 'editor',
    askedCount: 11,
  },
  {
    _id: 'faq-mayfair-classes',
    clubId: MAYFAIR_ID,
    question: 'Are classes included in the membership?',
    answer:
      'Yes, every membership includes classes. You can book up to seven days ahead, and off-peak members can book classes between 10:00 and 16:00 on weekdays.',
    status: 'approved',
    source: 'editor',
    askedCount: 9,
  },
  {
    _id: 'faq-mayfair-towels',
    clubId: MAYFAIR_ID,
    question: 'Do I need to bring a towel?',
    answer: 'No. Towels, robes and toiletries are provided in every changing room.',
    status: 'approved',
    source: 'editor',
    askedCount: 6,
  },
  {
    _id: 'faq-mayfair-access',
    clubId: MAYFAIR_ID,
    question: 'Is the club accessible?',
    answer:
      'The club has step-free access throughout, an accessible changing room and a pool hoist. Let us know when you book a tour if there is anything we can prepare for you.',
    status: 'approved',
    source: 'editor',
    askedCount: 4,
  },
]
