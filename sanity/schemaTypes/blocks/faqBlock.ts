import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import { defineField, defineType } from 'sanity'

export const faqBlock = defineType({
  name: 'faqBlock',
  title: 'FAQ',
  type: 'object',
  icon: HelpCircleIcon,
  fields: [
    defineField({ name: 'heading', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'intro', type: 'text', rows: 3 }),
    defineField({
      name: 'allowQuestions',
      title: 'Allow visitor questions',
      description: 'Shows the "Anything else?" box. Answers are AI-drafted and saved for review.',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: { title: 'heading', allow: 'allowQuestions' },
    prepare: ({ title, allow }) => ({
      title: title ?? 'FAQ',
      subtitle: allow ? 'FAQ · accepts questions' : 'FAQ',
    }),
  },
})
