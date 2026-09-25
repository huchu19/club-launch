import { defineField } from 'sanity'

type ImageFieldOptions = { name?: string; title?: string; required?: boolean; description?: string }

/** Image with mandatory alt text whenever an asset is set (docs/SPEC.md §7). */
export function imageField({
  name = 'image',
  title = 'Image',
  required = false,
  description,
}: ImageFieldOptions = {}) {
  return defineField({
    name,
    title,
    type: 'image',
    description,
    options: { hotspot: true },
    fields: [
      defineField({
        name: 'alt',
        title: 'Alt text',
        type: 'string',
        description: 'Describe the image for people using screen readers.',
        validation: (rule) =>
          rule.custom((alt, context) => {
            const parent = context.parent as { asset?: unknown } | undefined
            if (parent?.asset && !alt?.trim()) return 'Alt text is required for every image.'
            return true
          }),
      }),
    ],
    validation: required ? (rule) => rule.required() : undefined,
  })
}

export const seoField = defineField({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.max(70).warning('Keep titles under 70 characters.'),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(160).warning('Keep descriptions under 160 characters.'),
    }),
  ],
})

export const facilityCategoryOptions = [
  { title: 'Gym', value: 'gym' },
  { title: 'Spa', value: 'spa' },
  { title: 'Recovery', value: 'recovery' },
  { title: 'Pool', value: 'pool' },
  { title: 'Co-working', value: 'cowork' },
  { title: 'Studio', value: 'studio' },
  { title: 'Food & drink', value: 'food' },
]
