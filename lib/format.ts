/** True for plain numeric strings like "245" or "12.50". */
export function isNumeric(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value.trim())
}

/**
 * Formats a stored price ("245") in the market's currency. Anything that isn't
 * a plain number (e.g. a "[[PRICE: ...]]" placeholder in a draft preview) is
 * returned unchanged so it stays visible.
 */
export function formatPrice(value: string, locale = 'en-GB', currency = 'GBP'): string {
  return isNumeric(value) ? formatMoney(Number(value), locale, currency) : value
}

/** "£245" for whole amounts, "£18.85" otherwise. */
export function formatMoney(amount: number, locale = 'en-GB', currency = 'GBP'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export type OpeningRange = { days: string; hours: string }

/** Groups consecutive days with identical hours: "Monday–Thursday 06:00–22:30". */
export function groupOpeningHours(
  hours: Array<{ day: string; opens: string; closes: string }>,
): OpeningRange[] {
  const sorted = [...hours].sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day))
  const ranges: Array<{ first: string; last: string; hours: string }> = []
  for (const entry of sorted) {
    const label = `${entry.opens}–${entry.closes}`
    const previous = ranges.at(-1)
    const contiguous =
      previous && dayOrder.indexOf(entry.day) === dayOrder.indexOf(previous.last) + 1
    if (previous && contiguous && previous.hours === label) previous.last = entry.day
    else ranges.push({ first: entry.day, last: entry.day, hours: label })
  }
  return ranges.map((r) => ({
    days: r.first === r.last ? r.first : `${r.first} to ${r.last}`,
    hours: r.hours,
  }))
}
