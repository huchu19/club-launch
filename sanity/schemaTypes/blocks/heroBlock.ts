import { HomeIcon } from '@sanity/icons/Home'
import { defineArrayMember, defineField, defineType } from 'sanity'
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
              return (
                /^(https:\/\/|\/|#[a-z0-9-]+$)/.test(url) ||
                'Use https://, a site path starting with /, or a section on this page like #founding.'
              )
            }),
        }),
      ],
    }),
    defineField({
      name: 'periodVariants',
      title: 'Time-of-day wording',
      description:
        'Optional wording for each time of day in the club’s time zone: morning 06–11, midday 11–16, evening 16–22, night 22–06. Anything left empty uses the wording above.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'heroPeriodVariant',
          fields: [
            defineField({
              name: 'period',
              type: 'string',
              options: {
                list: [
                  { title: 'Morning (06–11)', value: 'morning' },
                  { title: 'Midday (11–16)', value: 'midday' },
                  { title: 'Evening (16–22)', value: 'evening' },
                  { title: 'Night (22–06)', value: 'night' },
                ],
                layout: 'radio',
              },
              validation: (r) => r.required(),
            }),
            defineField({ name: 'eyebrow', type: 'string' }),
            defineField({ name: 'subheading', type: 'text', rows: 3 }),
            defineField({
              name: 'highlightLabel',
              title: 'Highlight link text',
              type: 'string',
              description:
                'Text for the link to the section suggested at this time of day (morning: the map, evening: spa and recovery).',
            }),
          ],
          preview: {
            select: { title: 'period', subtitle: 'eyebrow' },
          },
        }),
      ],
      validation: (r) =>
        r.custom((variants?: Array<{ period?: string }>) => {
          const chosen = (variants ?? []).map((v) => v.period).filter(Boolean)
          return (
            new Set(chosen).size === chosen.length || 'Add at most one wording per time of day.'
          )
        }),
    }),
  ],
  preview: {
    select: { title: 'heading', media: 'image' },
    prepare: ({ title, media }) => ({ title: title ?? 'Hero', subtitle: 'Hero', media }),
  },
})
