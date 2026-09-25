// Shared story globals: every component has light, dark and mobile stories.
export const dark = { theme: 'dark' }
export const mobile = { viewport: { value: 'mobile1', isRotated: false } }
export const darkMobile = { ...dark, ...mobile }
