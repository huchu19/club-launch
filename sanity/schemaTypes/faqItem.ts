import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import { defineField, defineType } from 'sanity'
import { demoField } from './fields'

export const faqItem = defineType({
  name: 'faqItem',
  title: 'FAQ item',
  type: 'document',
  icon: HelpCircleIcon,
  fields: [
    defineField({
      name: 'club',
      type: 'reference',
      to: [{ type: 'club' }],
      validation: (r) => r.required(),
    }),
    defineField({ name: 'question', type: 'string', validation: (r) => r.required().max(300) }),
    defineField({ name: 'answer', type: 'text', rows: 5, validation: (r) => r.required() }),
    defineField({
      name: 'status',
      type: 'string',
      description: 'Only approved answers are shown to visitors.',
      options: {
        list: [
          { title: 'Pending review', value: 'pending' },
          { title: 'Approved', value: 'approved' },
          { title: 'Rejected', value: 'rejected' },
        ],
        layout: 'radio',
      },
      initialValue: 'approved',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'source',
      type: 'string',
      options: {
        list: [
          { title: 'Editor', value: 'editor' },
          { title: 'AI draft', value: 'ai' },
        ],
      },
      initialValue: 'editor',
      readOnly: true,
    }),
    defineField({
      name: 'askedCount',
      title: 'Times asked',
      type: 'number',
      initialValue: 1,
      readOnly: true,
    }),
    defineField({
      name: 'normalizedQuestion',
      type: 'string',
      description: 'Used to recognise repeat questions. Set automatically.',
      readOnly: true,
      hidden: true,
    }),
    demoField,
  ],
  orderings: [
    { title: 'Most asked', name: 'askedDesc', by: [{ field: 'askedCount', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'question', status: 'status', source: 'source', club: 'club.name' },
    prepare: ({ title, status, source, club }) => ({
      title,
      subtitle: [club, status, source === 'ai' ? 'AI draft' : null].filter(Boolean).join(' · '),
    }),
  },
})
