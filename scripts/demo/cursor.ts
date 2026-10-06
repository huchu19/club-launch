// Playwright's video does not show the mouse pointer, so the recording injects
// its own: a dark dot that follows the real mouse and a ripple on each click.
// This function is serialised into the page by `page.addInitScript`, so it must
// be self-contained and must not close over anything outside itself. It also
// runs before the document exists, so every mount is guarded.

export function cursorScript() {
  const DOT = '__demo-cursor'
  if (document.getElementById(DOT)) return

  const style = document.createElement('style')
  style.textContent = `
    #${DOT} {
      position: fixed; left: 0; top: 0; width: 22px; height: 22px; margin: -11px 0 0 -11px;
      border-radius: 50%; background: rgba(24, 24, 27, 0.82);
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92), 0 2px 10px rgba(0, 0, 0, 0.35);
      z-index: 2147483646; pointer-events: none; opacity: 0; transition: opacity 180ms ease-out;
    }
    .__demo-ripple {
      position: fixed; width: 20px; height: 20px; margin: -10px 0 0 -10px; border-radius: 50%;
      border: 2px solid rgba(24, 24, 27, 0.7); z-index: 2147483645; pointer-events: none;
      animation: __demo-ripple 520ms ease-out forwards;
    }
    @keyframes __demo-ripple {
      from { transform: scale(0.4); opacity: 0.9 }
      to { transform: scale(3.6); opacity: 0 }
    }`

  const dot = document.createElement('div')
  dot.id = DOT

  // Mounted once the page has loaded (so React has hydrated), then re-mounted
  // if a client-side render drops it.
  let observing = false
  const mount = () => {
    const root = document.documentElement
    if (!root) return
    if (!style.isConnected) root.append(style)
    if (!dot.isConnected) root.append(dot)
    if (!observing) {
      observing = true
      new MutationObserver(mount).observe(root, { childList: true })
    }
  }
  if (document.readyState === 'complete') mount()
  else window.addEventListener('load', mount, { once: true })

  window.addEventListener(
    'mousemove',
    (event) => {
      mount()
      dot.style.opacity = '1'
      dot.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`
    },
    true,
  )

  window.addEventListener(
    'mousedown',
    (event) => {
      if (!document.documentElement) return
      const ripple = document.createElement('div')
      ripple.className = '__demo-ripple'
      ripple.style.left = `${event.clientX}px`
      ripple.style.top = `${event.clientY}px`
      document.documentElement.append(ripple)
      setTimeout(() => ripple.remove(), 600)
    },
    true,
  )
}
