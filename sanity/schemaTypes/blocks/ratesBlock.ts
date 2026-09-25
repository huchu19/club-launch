import { CreditCardIcon } from '@sanity/icons/CreditCard'
import { defineArrayMember, defineField, defineType } from 'sanity'

const priceRule = (value: string | undefined) => {
  if (!value) return true
  if (value.includes('[[')) return true // placeholders are caught by the page-level rule
  return /^\d+(\.\d{1,2})?$/.test(value) || 'Enter a number without the currency symbol, e.g. 245'
}

export const ratesBlock = defineType({
  name: 'ratesBlock',
  title: 'Rates',
  type: 'object',
  icon: CreditCardIcon,
  fields: [
    defineField({ name: 'heading', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'plans',
      type: 'array',
      validation: (r) => r.min(1),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'ratePlan',
          fields: [
            defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
            defineField({
              name: 'pricePerMonth',
              title: 'Price per month',
              type: 'string',
              description: "Number only, in the market's currency.",
              validation: (r) => r.required().custom(priceRule),
            }),
            defineField({
              name: 'joiningFee',
              title: 'Joining fee',
              type: 'string',
              description: 'Number only. Leave empty if there is none.',
              validation: (r) => r.custom(priceRule),
            }),
            defineField({ name: 'inclusions', type: 'array', of: [{ type: 'string' }] }),
          ],
          preview: {
            select: { title: 'name', price: 'pricePerMonth' },
            prepare: ({ title, price }) => ({ title, subtitle: price ? `${price} / month` : '' }),
          },
        }),
      ],
    }),
    defineField({ name: 'note', type: 'text', rows: 2 }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title ?? 'Rates', subtitle: 'Rates' }),
  },
})
