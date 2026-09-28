import { UsersIcon } from '@sanity/icons/Users'
import { defineField, defineType } from 'sanity'

// Written by the site when someone takes a founding place. Read-only here: the
// count changes only through the signup, which checks it atomically.
export const foundingPlaces = defineType({
  name: 'foundingPlaces',
  title: 'Founding places',
  type: 'document',
  icon: UsersIcon,
  readOnly: true,
  fields: [
    defineField({ name: 'clubKey', title: 'Club', type: 'string' }),
    defineField({ name: 'taken', title: 'Places taken', type: 'number' }),
  ],
  preview: {
    select: { title: 'clubKey', taken: 'taken' },
    prepare: ({ title, taken }) => ({ title, subtitle: `${taken ?? 0} places taken` }),
  },
})
