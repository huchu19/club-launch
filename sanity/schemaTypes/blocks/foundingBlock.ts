import { UsersIcon } from '@sanity/icons/Users'
import { defineField, defineType } from 'sanity'

const numeric = /^\d+(\.\d{1,2})?$/

export const foundingBlock = defineType({
  name: 'foundingBlock',
  title: 'Founding member pre-sale',
  type: 'object',
  icon: UsersIcon,
  description:
    'For clubs that are coming soon: a founding offer with a live count of places left and a signup form. Signups go to the CRM.',
  fields: [
    defineField({ name: 'eyebrow', type: 'string' }),
    defineField({ name: 'heading', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'offer', type: 'text', rows: 3, validation: (r) => r.required() }),
    defineField({
      name: 'pricePerMonth',
      title: 'Price per month',
      type: 'string',
      description: 'A number, e.g. 195.',
      validation: (r) => r.required().regex(numeric, { name: 'number' }),
    }),
    defineField({
      name: 'joiningFee',
      title: 'Joining fee',
      type: 'string',
      description: 'A number; 0 shows "No joining fee".',
      validation: (r) => r.required().regex(numeric, { name: 'number' }),
    }),
    defineField({
      name: 'totalPlaces',
      title: 'Total places',
      type: 'number',
      description: 'Signups stop when these have gone.',
      validation: (r) => r.required().integer().min(1),
    }),
  ],
  preview: {
    select: { title: 'heading', places: 'totalPlaces' },
    prepare: ({ title, places }) => ({
      title: title ?? 'Founding member pre-sale',
      subtitle: `Founding pre-sale · ${places ?? '?'} places`,
    }),
  },
})
