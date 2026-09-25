import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { findPlaceholders, placeholderSummary } from '../../lib/placeholders'
import { ClubPageInput } from '../components/ClubPageInput'
import { blockTypeNames } from './blocks'
import { seoField } from './fields'

export const clubPage = defineType({
  name: 'clubPage',
  title: 'Club page',
  type: 'document',
  icon: DocumentTextIcon,
  components: { input: ClubPageInput },
  // Publishing is blocked while any [[placeholder]] remains (docs/SPEC.md §6).
  validation: (rule) =>
    rule.custom((doc) => {
      const found = findPlaceholders(doc)
      if (found.length === 0) return true
      return `Replace ${found.length} placeholder${found.length === 1 ? '' : 's'} before publishing: ${placeholderSummary(found)}`
    }),
  fields: [
    defineField({
      name: 'club',
      type: 'reference',
      to: [{ type: 'club' }],
      validation: (r) => r.required(),
    }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'blocks',
      type: 'array',
      of: blockTypeNames.map((type) => defineArrayMember({ type })),
      validation: (r) => r.min(1),
    }),
    seoField,
  ],
  preview: {
    select: { title: 'title', club: 'club.name' },
    prepare: ({ title, club }) => ({ title, subtitle: club }),
  },
})
