import { ThListIcon } from '@sanity/icons/ThList'
import { defineArrayMember, defineField, defineType } from 'sanity'

export const facilitiesBlock = defineType({
  name: 'facilitiesBlock',
  title: 'Facilities',
  type: 'object',
  icon: ThListIcon,
  fields: [
    defineField({ name: 'heading', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'intro', type: 'text', rows: 3 }),
    defineField({
      name: 'facilities',
      title: 'Facilities override',
      description: "Leave empty to show the club's own facilities list.",
      type: 'array',
      of: [defineArrayMember({ type: 'facility' })],
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title ?? 'Facilities', subtitle: 'Facilities' }),
  },
})
