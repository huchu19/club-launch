import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { dark, mobile } from '../../.storybook/globals'
import { CheckboxField, SelectField, TextAreaField, TextField } from './FormField'

function Fields({ withErrors = false }: { withErrors?: boolean }) {
  return (
    <form className="max-w-lg space-y-6 p-8" onSubmit={(e) => e.preventDefault()}>
      <TextField
        id="ff-name"
        label="Full name"
        defaultValue={withErrors ? '' : 'Sam Rivera'}
        error={withErrors ? 'Enter your name' : undefined}
      />
      <TextField
        id="ff-email"
        type="email"
        label="Email address"
        hint="We only use this to confirm your tour."
        defaultValue={withErrors ? 'sam@' : ''}
        error={
          withErrors
            ? 'Enter an email address in the correct format, like name@example.com'
            : undefined
        }
      />
      <TextField id="ff-phone" type="tel" label="Phone number" optional />
      <SelectField
        id="ff-slot"
        label="Time of day"
        placeholder="Choose a time"
        options={[
          { value: 'morning', label: 'Morning' },
          { value: 'afternoon', label: 'Afternoon' },
        ]}
        defaultValue=""
        error={withErrors ? 'Choose a time of day' : undefined}
      />
      <TextAreaField
        id="ff-question"
        label="Anything else?"
        hint="Please don’t include personal details."
        maxLength={300}
        showCount
        value="Is the pool heated?"
        readOnly
      />
      <CheckboxField
        id="ff-consent"
        label="I agree that the club can contact me about this tour."
        hint="We will not add you to a mailing list."
        error={
          withErrors ? 'Tick the box to agree that we can contact you about your tour' : undefined
        }
      />
    </form>
  )
}

const meta = {
  title: 'UI/FormField',
  component: Fields,
} satisfies Meta<typeof Fields>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithErrors: Story = { args: { withErrors: true } }
export const Dark: Story = { globals: dark, args: { withErrors: true } }
export const Mobile: Story = { globals: mobile }
