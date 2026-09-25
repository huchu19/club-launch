import { CalendarIcon } from '@sanity/icons/Calendar'
import { defineField, defineType } from 'sanity'

export const tourBookingBlock = defineType({
  name: 'tourBookingBlock',
  title: 'Tour booking',
  type: 'object',
  icon: CalendarIcon,
  fields: [
    defineField({ name: 'heading', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'intro', type: 'text', rows: 3 }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title ?? 'Tour booking', subtitle: 'Tour booking form' }),
  },
})
