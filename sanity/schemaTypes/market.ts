import { EarthGlobeIcon } from '@sanity/icons/EarthGlobe'
import { defineArrayMember, defineField, defineType } from 'sanity'

export const market = defineType({
  name: 'market',
  title: 'Market',
  type: 'document',
  icon: EarthGlobeIcon,
  fields: [
    defineField({
      name: 'code',
      type: 'string',
      description: 'URL segment, e.g. "uk".',
      validation: (r) =>
        r
          .required()
          .regex(/^[a-z]{2}$/, { name: 'two lower-case letters' })
          .error('Use two lower-case letters, e.g. "uk".'),
    }),
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'locale',
      type: 'string',
      initialValue: 'en-GB',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'currency',
      type: 'string',
      initialValue: 'GBP',
      validation: (r) => r.required().length(3),
    }),
    defineField({
      name: 'comparisonItems',
      title: 'Typical prices for comparison',
      description:
        'What each thing would typically cost if paid for separately in this market. Used by the cost calculator; label them clearly as typical prices.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'comparisonItem',
          fields: [
            defineField({
              name: 'usage',
              title: 'What it replaces',
              type: 'string',
              options: {
                list: [
                  { title: 'Gym', value: 'gym' },
                  { title: 'Classes', value: 'classes' },
                  { title: 'Spa', value: 'spa' },
                  { title: 'Recovery', value: 'recovery' },
                  { title: 'Co-working', value: 'cowork' },
                ],
              },
              validation: (r) => r.required(),
            }),
            defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
            defineField({
              name: 'unitPrice',
              title: 'Price per unit',
              type: 'number',
              validation: (r) => r.required().min(0),
            }),
            defineField({
              name: 'unit',
              type: 'string',
              description: 'One word, e.g. visit, class, day or session.',
              validation: (r) => r.required(),
            }),
            defineField({ name: 'note', type: 'string' }),
          ],
          preview: {
            select: { title: 'label', price: 'unitPrice', unit: 'unit' },
            prepare: ({ title, price, unit }) => ({ title, subtitle: `${price} per ${unit}` }),
          },
        }),
      ],
      validation: (r) =>
        r.custom((items?: Array<{ usage?: string }>) => {
          const kinds = (items ?? []).map((i) => i.usage).filter(Boolean)
          return new Set(kinds).size === kinds.length || 'Add at most one price for each use.'
        }),
    }),
  ],
  preview: { select: { title: 'name', subtitle: 'code' } },
})
