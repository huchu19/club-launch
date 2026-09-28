import { CalendarIcon } from '@sanity/icons/Calendar'
import { defineArrayMember, defineField, defineType } from 'sanity'

export const conciergeBlock = defineType({
  name: 'conciergeBlock',
  title: 'First-day planner',
  type: 'object',
  icon: CalendarIcon,
  description:
    'Visitors describe their week and get a suggested first day, built from the club’s spaces and timetable.',
  fields: [
    defineField({ name: 'eyebrow', type: 'string' }),
    defineField({ name: 'heading', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'intro', type: 'text', rows: 3 }),
    defineField({
      name: 'chips',
      title: 'Quick options',
      description: 'Up to five short options visitors can tap, e.g. "I work from home".',
      type: 'array',
      of: [defineArrayMember({ type: 'string', validation: (r) => r.max(60) })],
      validation: (r) => r.max(5),
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({
      title: title ?? 'First-day planner',
      subtitle: 'First-day planner',
    }),
  },
})
