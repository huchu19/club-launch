import { PinIcon } from '@sanity/icons/Pin'
import { defineField, defineType } from 'sanity'

export const clubMapBlock = defineType({
  name: 'clubMapBlock',
  title: 'Club map',
  type: 'object',
  icon: PinIcon,
  description:
    'An explorable floor plan of the club, drawn from the club’s floor plan and spaces. Shows nothing until the club has a plan.',
  fields: [
    defineField({ name: 'eyebrow', type: 'string' }),
    defineField({ name: 'heading', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'intro', type: 'text', rows: 3 }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title ?? 'Club map', subtitle: 'Club map' }),
  },
})
