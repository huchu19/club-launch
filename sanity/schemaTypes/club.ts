import { PinIcon } from '@sanity/icons/Pin'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { seoField } from './fields'

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const time = /^([01]\d|2[0-3]):[0-5]\d$/

export const club = defineType({
  name: 'club',
  title: 'Club',
  type: 'document',
  icon: PinIcon,
  groups: [
    { name: 'basics', title: 'Basics', default: true },
    { name: 'location', title: 'Location & hours' },
    { name: 'facilities', title: 'Facilities' },
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
      of: [
        defineArrayMember({
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
        }),
      ],
    }),
    defineField({ name: 'phone', type: 'string', group: 'location' }),
    defineField({
      name: 'facilities',
      type: 'array',
      group: 'facilities',
      of: [defineArrayMember({ type: 'facility' })],
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
