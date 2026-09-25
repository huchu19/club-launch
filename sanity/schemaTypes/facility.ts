import { defineField, defineType } from 'sanity'
import { facilityCategoryOptions } from './fields'

export const facility = defineType({
  name: 'facility',
  title: 'Facility',
  type: 'object',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'category',
      type: 'string',
      options: { list: facilityCategoryOptions, layout: 'dropdown' },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'description', type: 'text', rows: 2 }),
  ],
  preview: { select: { title: 'name', subtitle: 'category' } },
})
