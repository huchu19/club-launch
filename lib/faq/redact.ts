// Visitors are asked not to include personal details, but some will. Obvious
// contact details are removed before the question reaches the model or is
// stored (CLAUDE.md: no personal data to Gemini).

const EMAIL = /[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}/g
// 7+ digits, allowing spaces, dots, dashes, brackets and a leading +.
const PHONE = /(?:\+|\b)\d[\d\s().-]{5,}\d\b/g

export function redactPersonalData(text: string): string {
  return text
    .replace(EMAIL, '[email removed]')
    .replace(PHONE, (match) =>
      match.replace(/\D/g, '').length >= 7 ? '[phone number removed]' : match,
    )
}
