import { BarChartIcon } from '@sanity/icons/BarChart'
import { defineField, defineType } from 'sanity'

export const busynessBlock = defineType({
  name: 'busynessBlock',
  title: 'How busy is it',
  type: 'object',
  icon: BarChartIcon,
  description:
    'Typical busyness by hour for each of the club’s spaces. The figures are illustrative until the club connects its gate-entry data.',
  fields: [
    defineField({ name: 'eyebrow', type: 'string' }),
    defineField({ name: 'heading', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'intro', type: 'text', rows: 3 }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title ?? 'How busy is it', subtitle: 'How busy is it' }),
  },
})
