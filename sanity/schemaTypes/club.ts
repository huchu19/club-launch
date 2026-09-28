import { PinIcon } from '@sanity/icons/Pin'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { facilityCategoryOptions, seoField } from './fields'

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const time = /^([01]\d|2[0-3]):[0-5]\d$/

const openingHoursEntry = defineArrayMember({
  type: 'object',
  name: 'openingHoursEntry',
  fields: [
    defineField({
      name: 'day',
      type: 'string',
      options: { list: weekdays },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'opens',
      type: 'string',
      description: '24-hour time, e.g. 06:00',
      validation: (r) => r.required().regex(time, { name: 'HH:MM' }),
    }),
    defineField({
      name: 'closes',
      type: 'string',
      description: '24-hour time, e.g. 22:30',
      validation: (r) => r.required().regex(time, { name: 'HH:MM' }),
    }),
  ],
  preview: {
    select: { day: 'day', opens: 'opens', closes: 'closes' },
    prepare: ({ day, opens, closes }) => ({ title: day, subtitle: `${opens}–${closes}` }),
  },
})

type SpaceValue = { id?: string }

export const club = defineType({
  name: 'club',
  title: 'Club',
  type: 'document',
  icon: PinIcon,
  groups: [
    { name: 'basics', title: 'Basics', default: true },
    { name: 'location', title: 'Location & hours' },
    { name: 'facilities', title: 'Facilities' },
    { name: 'spaces', title: 'Spaces & timetable' },
    { name: 'map', title: 'Floor plan' },
    { name: 'facts', title: 'Facts (AI grounding)' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({ name: 'name', type: 'string', group: 'basics', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'basics',
      options: { source: 'name', maxLength: 64 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'market',
      type: 'reference',
      to: [{ type: 'market' }],
      group: 'basics',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'tier',
      type: 'string',
      group: 'basics',
      options: {
        list: [
          { title: 'Standard', value: 'standard' },
          { title: 'Social wellness', value: 'social-wellness' },
        ],
        layout: 'radio',
      },
      initialValue: 'social-wellness',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'status',
      type: 'string',
      group: 'basics',
      options: {
        list: [
          { title: 'Open', value: 'open' },
          { title: 'Coming soon', value: 'coming-soon' },
        ],
        layout: 'radio',
      },
      initialValue: 'coming-soon',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'address',
      type: 'object',
      group: 'location',
      fields: [
        defineField({ name: 'streetAddress', type: 'string', validation: (r) => r.required() }),
        defineField({ name: 'locality', type: 'string', validation: (r) => r.required() }),
        defineField({ name: 'postalCode', type: 'string', validation: (r) => r.required() }),
        defineField({
          name: 'country',
          type: 'string',
          description: 'ISO country code, e.g. GB.',
          initialValue: 'GB',
          validation: (r) => r.required(),
        }),
      ],
      validation: (r) => r.required(),
    }),
    defineField({ name: 'geo', type: 'geopoint', group: 'location' }),
    defineField({
      name: 'openingHours',
      title: 'Opening hours',
      type: 'array',
      group: 'location',
      of: [openingHoursEntry],
    }),
    defineField({ name: 'phone', type: 'string', group: 'location' }),
    defineField({
      name: 'timeZone',
      title: 'Time zone',
      type: 'string',
      group: 'location',
      description: 'IANA name, e.g. Europe/London. Used for "what’s on now" and opening hours.',
      initialValue: 'Europe/London',
    }),
    defineField({
      name: 'facilities',
      type: 'array',
      group: 'facilities',
      of: [defineArrayMember({ type: 'facility' })],
    }),
    defineField({
      name: 'spaces',
      type: 'array',
      group: 'spaces',
      description:
        'Spaces visitors can use. The timetable, first-day plans and club map refer to each one by its id.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'space',
          fields: [
            defineField({
              name: 'id',
              title: 'ID',
              type: 'string',
              description:
                'Lower-case letters, numbers and hyphens, e.g. thermal-suite. Keep it stable once set.',
              validation: (r) => r.required().regex(/^[a-z0-9-]+$/, { name: 'id' }),
            }),
            defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
            defineField({
              name: 'category',
              type: 'string',
              options: { list: facilityCategoryOptions, layout: 'dropdown' },
              validation: (r) => r.required(),
            }),
            defineField({ name: 'description', type: 'text', rows: 2 }),
            defineField({
              name: 'typicalUses',
              title: 'Typical uses',
              type: 'array',
              of: [defineArrayMember({ type: 'string' })],
            }),
            defineField({
              name: 'openingHours',
              title: 'Opening hours, if different from the club',
              type: 'array',
              of: [openingHoursEntry],
            }),
          ],
          preview: { select: { title: 'name', subtitle: 'id' } },
        }),
      ],
      validation: (r) =>
        r.custom((spaces?: SpaceValue[]) => {
          const ids = (spaces ?? []).map((s) => s.id).filter(Boolean)
          return new Set(ids).size === ids.length || 'Each space needs a different id.'
        }),
    }),
    defineField({
      name: 'schedule',
      title: 'Sample timetable',
      type: 'array',
      group: 'spaces',
      description:
        'A typical week of classes. The first-day planner only suggests classes listed here.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'scheduleEntry',
          fields: [
            defineField({
              name: 'day',
              type: 'string',
              options: { list: weekdays },
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'time',
              type: 'string',
              description: 'Start time, 24-hour, e.g. 07:15',
              validation: (r) => r.required().regex(time, { name: 'HH:MM' }),
            }),
            defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
            defineField({
              name: 'spaceId',
              title: 'Space ID',
              type: 'string',
              validation: (r) =>
                r.required().custom((value: string | undefined, context) => {
                  const spaces = (context.document?.spaces ?? []) as SpaceValue[]
                  return (
                    !value ||
                    spaces.some((s) => s.id === value) ||
                    'Use the id of one of this club’s spaces.'
                  )
                }),
            }),
            defineField({
              name: 'durationMin',
              title: 'Duration (minutes)',
              type: 'number',
              validation: (r) => r.required().integer().min(5).max(240),
            }),
            defineField({
              name: 'intensity',
              type: 'string',
              options: { list: ['low', 'medium', 'high'], layout: 'radio' },
              validation: (r) => r.required(),
            }),
          ],
          preview: {
            select: { day: 'day', time: 'time', name: 'name' },
            prepare: ({ day, time, name }) => ({ title: `${time} ${name}`, subtitle: day }),
          },
        }),
      ],
    }),
    defineField({
      name: 'clubMap',
      title: 'Floor plan',
      type: 'object',
      group: 'map',
      description:
        'An illustrative plan drawn as shapes, not a real architect’s drawing. Each zone links to a space by its id.',
      fields: [
        defineField({
          name: 'viewBox',
          title: 'Drawing size',
          type: 'string',
          description: '"0 0 width height", e.g. 0 0 1000 640.',
          initialValue: '0 0 1000 640',
          validation: (r) => r.regex(/^\d+ \d+ \d+ \d+$/, { name: 'viewBox' }),
        }),
        defineField({
          name: 'floors',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'mapFloor',
              fields: [
                defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
                defineField({
                  name: 'zones',
                  type: 'array',
                  of: [
                    defineArrayMember({
                      type: 'object',
                      name: 'mapZone',
                      fields: [
                        defineField({
                          name: 'spaceId',
                          title: 'Space ID',
                          type: 'string',
                          validation: (r) =>
                            r.required().custom((value: string | undefined, context) => {
                              const spaces = (context.document?.spaces ?? []) as SpaceValue[]
                              return (
                                !value ||
                                spaces.some((s) => s.id === value) ||
                                'Use the id of one of this club’s spaces.'
                              )
                            }),
                        }),
                        defineField({
                          name: 'label',
                          type: 'string',
                          description: 'Defaults to the space’s name.',
                        }),
                        defineField({
                          name: 'shape',
                          type: 'string',
                          options: { list: ['rect', 'polygon'], layout: 'radio' },
                          initialValue: 'rect',
                          validation: (r) => r.required(),
                        }),
                        defineField({
                          name: 'x',
                          type: 'number',
                          hidden: ({ parent }) => parent?.shape !== 'rect',
                        }),
                        defineField({
                          name: 'y',
                          type: 'number',
                          hidden: ({ parent }) => parent?.shape !== 'rect',
                        }),
                        defineField({
                          name: 'w',
                          title: 'Width',
                          type: 'number',
                          hidden: ({ parent }) => parent?.shape !== 'rect',
                        }),
                        defineField({
                          name: 'h',
                          title: 'Height',
                          type: 'number',
                          hidden: ({ parent }) => parent?.shape !== 'rect',
                        }),
                        defineField({
                          name: 'points',
                          type: 'string',
                          description: 'Corners as "x,y x,y x,y …" in the map’s units.',
                          hidden: ({ parent }) => parent?.shape !== 'polygon',
                        }),
                        defineField({
                          name: 'labelX',
                          title: 'Label x (optional)',
                          type: 'number',
                        }),
                        defineField({
                          name: 'labelY',
                          title: 'Label y (optional)',
                          type: 'number',
                        }),
                      ],
                      preview: { select: { title: 'label', subtitle: 'spaceId' } },
                    }),
                  ],
                }),
                defineField({
                  name: 'features',
                  title: 'Decorative areas',
                  type: 'array',
                  of: [
                    defineArrayMember({
                      type: 'object',
                      name: 'mapFeature',
                      fields: [
                        defineField({
                          name: 'kind',
                          type: 'string',
                          options: { list: ['garden', 'entrance', 'other'] },
                          validation: (r) => r.required(),
                        }),
                        defineField({ name: 'label', type: 'string' }),
                        defineField({
                          name: 'shape',
                          type: 'string',
                          options: { list: ['rect', 'polygon'], layout: 'radio' },
                          initialValue: 'rect',
                          validation: (r) => r.required(),
                        }),
                        defineField({
                          name: 'x',
                          type: 'number',
                          hidden: ({ parent }) => parent?.shape !== 'rect',
                        }),
                        defineField({
                          name: 'y',
                          type: 'number',
                          hidden: ({ parent }) => parent?.shape !== 'rect',
                        }),
                        defineField({
                          name: 'w',
                          title: 'Width',
                          type: 'number',
                          hidden: ({ parent }) => parent?.shape !== 'rect',
                        }),
                        defineField({
                          name: 'h',
                          title: 'Height',
                          type: 'number',
                          hidden: ({ parent }) => parent?.shape !== 'rect',
                        }),
                        defineField({
                          name: 'points',
                          type: 'string',
                          description: 'Corners as "x,y x,y x,y …" in the map’s units.',
                          hidden: ({ parent }) => parent?.shape !== 'polygon',
                        }),
                        defineField({
                          name: 'labelX',
                          title: 'Label x (optional)',
                          type: 'number',
                        }),
                        defineField({
                          name: 'labelY',
                          title: 'Label y (optional)',
                          type: 'number',
                        }),
                      ],
                      preview: { select: { title: 'label', subtitle: 'kind' } },
                    }),
                  ],
                }),
              ],
              preview: { select: { title: 'name' } },
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'facts',
      type: 'array',
      group: 'facts',
      description:
        'Plain facts the AI helpers may use: joining fee, parking, guest policy and so on. The AI never states anything that is not here.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'fact',
          fields: [
            defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'value', type: 'text', rows: 2, validation: (r) => r.required() }),
          ],
          preview: { select: { title: 'label', subtitle: 'value' } },
        }),
      ],
    }),
    { ...seoField, group: 'seo' },
  ],
  preview: {
    select: { title: 'name', status: 'status', locality: 'address.locality' },
    prepare: ({ title, status, locality }) => ({
      title,
      subtitle: [locality, status === 'coming-soon' ? 'Coming soon' : 'Open']
        .filter(Boolean)
        .join(' · '),
    }),
  },
})
