import { CalendarIcon } from '@sanity/icons/Calendar'
import { defineArrayMember, defineField, defineType } from 'sanity'

// Written by the first-day planner. Holds the structured plan only: the
// visitor's message is never stored. Read-only in the Studio.
export const dayPlan = defineType({
  name: 'dayPlan',
  title: 'Day plan',
  type: 'document',
  icon: CalendarIcon,
  readOnly: true,
  fields: [
    defineField({ name: 'publicId', title: 'Public ID', type: 'string' }),
    defineField({ name: 'club', type: 'reference', to: [{ type: 'club' }], weak: true }),
    defineField({ name: 'day', type: 'string' }),
    defineField({ name: 'summary', type: 'text', rows: 2 }),
    defineField({
      name: 'stops',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'dayPlanStop',
          fields: [
            defineField({ name: 'time', type: 'string' }),
            defineField({ name: 'spaceId', title: 'Space ID', type: 'string' }),
            defineField({ name: 'className', title: 'Class', type: 'string' }),
            defineField({ name: 'activity', type: 'string' }),
            defineField({ name: 'reason', type: 'text', rows: 2 }),
          ],
          preview: {
            select: { time: 'time', activity: 'activity' },
            prepare: ({ time, activity }) => ({ title: `${time} ${activity}` }),
          },
        }),
      ],
    }),
    defineField({ name: 'recommendedPlanName', title: 'Suggested membership', type: 'string' }),
    defineField({ name: 'caveats', type: 'array', of: [defineArrayMember({ type: 'string' })] }),
    defineField({
      name: 'chips',
      title: 'Quick options chosen',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({ name: 'createdAt', type: 'datetime' }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'createdAtDesc',
      by: [{ field: 'createdAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { day: 'day', club: 'club.name', createdAt: 'createdAt' },
    prepare: ({ day, club, createdAt }) => ({
      title: `${day ?? 'Day'} plan${club ? ` · ${club}` : ''}`,
      subtitle: createdAt ? new Date(createdAt).toLocaleString('en-GB') : undefined,
    }),
  },
})
