import { HomeIcon } from '@sanity/icons/Home'
import { defineField, defineType } from 'sanity'
import { imageField } from '../fields'

export const heroBlock = defineType({
  name: 'heroBlock',
  title: 'Hero',
  type: 'object',
  icon: HomeIcon,
  fields: [
    defineField({ name: 'eyebrow', type: 'string' }),
    defineField({ name: 'heading', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'subheading', type: 'text', rows: 3 }),
    imageField(),
    defineField({
      name: 'primaryCta',
      title: 'Primary call to action',
      type: 'object',
      fields: [
        defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
        defineField({
          name: 'target',
          type: 'string',
          options: {
            list: [
              { title: 'Tour booking form', value: 'tour' },
              { title: 'FAQ', value: 'faq' },
              { title: 'Custom URL', value: 'url' },
            ],
            layout: 'radio',
          },
          initialValue: 'tour',
          validation: (r) => r.required(),
        }),
        defineField({
          name: 'url',
          title: 'URL',
          type: 'string',
          hidden: ({ parent }) => (parent as { target?: string } | undefined)?.target !== 'url',
          validation: (r) =>
            r.custom((url, context) => {
              const target = (context.parent as { target?: string } | undefined)?.target
              if (target !== 'url') return true
              if (!url) return 'A URL is required for a custom link.'
              return /^(https:\/\/|\/)/.test(url) || 'Use https:// or a site path starting with /.'
            }),
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading', media: 'image' },
    prepare: ({ title, media }) => ({ title: title ?? 'Hero', subtitle: 'Hero', media }),
  },
})
