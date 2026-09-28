import { CreditCardIcon } from '@sanity/icons/CreditCard'
import { defineField, defineType } from 'sanity'

export const calculatorBlock = defineType({
  name: 'calculatorBlock',
  title: 'Cost calculator',
  type: 'object',
  icon: CreditCardIcon,
  description:
    'Visitors see their monthly cost, cost per visit, and a comparison with paying separately. Prices come from the page’s membership block and the market’s typical prices.',
  fields: [
    defineField({ name: 'eyebrow', type: 'string' }),
    defineField({ name: 'heading', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'intro', type: 'text', rows: 3 }),
    defineField({
      name: 'comparisonLabel',
      title: 'Comparison label',
      type: 'string',
      initialValue: 'Typical London prices, for comparison. Illustrative, not quotes.',
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title ?? 'Cost calculator', subtitle: 'Cost calculator' }),
  },
})
