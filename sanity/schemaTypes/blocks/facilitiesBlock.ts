import { ThListIcon } from '@sanity/icons/ThList'
import { defineField, defineType } from 'sanity'

export const facilitiesBlock = defineType({
  name: 'facilitiesBlock',
  title: 'Facilities',
  type: 'object',
  icon: ThListIcon,
  fields: [
    defineField({ name: 'heading', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'intro', type: 'text', rows: 3 }),
  ],
  description: 'Shows the club’s own facilities list, edited on the club.',
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title ?? 'Facilities', subtitle: 'Facilities' }),
  },
})
