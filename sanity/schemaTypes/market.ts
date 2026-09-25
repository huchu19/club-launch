import { EarthGlobeIcon } from '@sanity/icons/EarthGlobe'
import { defineField, defineType } from 'sanity'

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
  ],
  preview: { select: { title: 'name', subtitle: 'code' } },
})
