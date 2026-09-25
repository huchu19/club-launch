import { SparklesIcon } from '@sanity/icons/Sparkles'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { imageField } from '../fields'

export const spaRecoveryBlock = defineType({
  name: 'spaRecoveryBlock',
  title: 'Spa & recovery',
  type: 'object',
  icon: SparklesIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      type: 'string',
      description: 'Short label above the heading, e.g. "The garden".',
    }),
    defineField({ name: 'heading', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'intro', type: 'text', rows: 3 }),
    defineField({
      name: 'items',
      type: 'array',
      validation: (r) => r.min(1),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'spaRecoveryItem',
          fields: [
            defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
            defineField({
              name: 'description',
              type: 'text',
              rows: 3,
              validation: (r) => r.required(),
            }),
            imageField(),
          ],
          preview: { select: { title: 'name', subtitle: 'description', media: 'image' } },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title ?? 'Spa & recovery', subtitle: 'Spa & recovery' }),
  },
})
