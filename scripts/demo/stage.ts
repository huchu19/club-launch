// The recording stage: the on-screen caption bar and URL chip, human-paced
// mouse and keyboard helpers, and the scene clock that keeps the finished cut
// close to the timings in the shot list.
import { writeFileSync } from 'node:fs'
import type { Locator, Page } from 'playwright'
import { cursorScript } from './cursor'
import { pace, scenes, scenesFile, srtFile, url, type Scene } from './config'

type CaptionWindow = Window & {
  __demoCaption?: (text: string) => void
}

/**
 * Injected into every page: the caption bar the silent video is read from, and
 * a chip showing the current URL (a Playwright video has no browser chrome).
 * Serialised by `page.addInitScript`, so it must be self-contained.
 */
export function captionScript() {
  const BAR = '__demo-caption'
  const CHIP = '__demo-url'
  if (document.getElementById(BAR)) return

  const style = document.createElement('style')
  style.textContent = `
    #${BAR} {
      position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%);
      max-width: 80%; box-sizing: border-box; padding: 18px 28px; border-radius: 10px;
      background: rgba(18, 18, 20, 0.86); color: #fff; z-index: 2147483644;
      font: 500 30px/1.35 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      text-align: center; text-wrap: balance; pointer-events: none;
      opacity: 0; transition: opacity 420ms ease-out;
      -webkit-font-smoothing: antialiased;
    }
    #${CHIP} {
      position: fixed; left: 28px; bottom: 44px; padding: 8px 14px; border-radius: 999px;
      background: rgba(18, 18, 20, 0.78); color: #fff; z-index: 2147483644;
      font: 500 18px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
      pointer-events: none; letter-spacing: 0.01em;
    }`

  const bar = document.createElement('div')
  bar.id = BAR
  const chip = document.createElement('div')
  chip.id = CHIP

  // The script runs before the document exists, so every mount is guarded, and
  // the observer re-mounts the chrome if a client-side render drops it.
  let observing = false
  const mount = () => {
    const root = document.documentElement
    if (!root) return
    if (!style.isConnected) root.append(style)
    if (!bar.isConnected) root.append(bar)
    if (!chip.isConnected) root.append(chip)
    if (!observing) {
      observing = true
      new MutationObserver(mount).observe(root, { childList: true })
    }
  }
  if (document.readyState === 'complete') mount()
  else window.addEventListener('load', mount, { once: true })

  const showUrl = () => {
    chip.textContent = `${location.host}${location.pathname}`
  }
  showUrl()
  setInterval(showUrl, 500)
  ;(window as CaptionWindow).__demoCaption = (text: string) => {
    mount()
    bar.textContent = text
    bar.style.opacity = text ? '1' : '0'
  }
}

export type SceneTiming = Scene & { startMs: number; endMs: number }

/** Room the caption bar takes at the bottom of the frame. */
const CAPTION_HEIGHT = 190

/** Waits for `check` to hold, polling until the timeout. */
export async function waitUntil(
  check: () => Promise<boolean>,
  { timeout = 15_000, interval = 500, what }: { timeout?: number; interval?: number; what: string },
): Promise<void> {
  const deadline = Date.now() + timeout
  for (;;) {
    if (await check()) return
    if (Date.now() > deadline) throw new Error(`Timed out after ${timeout}ms waiting for ${what}`)
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
}

export class Stage {
  private caption = ''
  private startedAt = Date.now()
  private current: SceneTiming | null = null
  readonly timings: SceneTiming[] = []

  constructor(readonly page: Page) {}

  /** Called once, right after the page (and so the video) exists. */
  async open(): Promise<void> {
    // tsx compiles these scripts with esbuild's keepNames, which wraps every
    // nested function in a `__name(…)` helper that only exists in the bundle.
    // The injected scripts are serialised as-is, so the page needs the shim.
    await this.page.addInitScript({ content: 'globalThis.__name ??= (fn) => fn' })
    await this.page.addInitScript(cursorScript)
    await this.page.addInitScript(captionScript)
    this.startedAt = Date.now()
  }

  get elapsed(): number {
    return Date.now() - this.startedAt
  }

  /** Starts a scene: records its start time and shows its caption. */
  async scene(id: number): Promise<void> {
    const scene = scenes.find((s) => s.id === id)
    if (!scene) throw new Error(`No scene ${id} in the shot list`)
    this.closeScene()
    this.current = { ...scene, startMs: this.elapsed, endMs: scene.until }
    console.log(`\nScene ${id} at ${(this.elapsed / 1000).toFixed(1)}s — ${scene.caption}`)
    await this.showCaption(scene.caption)
  }

  /** Holds the last frame until the scene's end time in the shot list. */
  async padScene(): Promise<void> {
    const target = this.current?.until
    if (target === undefined) return
    const left = target - this.elapsed
    if (left > 0) await this.hold(left)
    else console.log(`  (${Math.round(-left / 1000)}s behind the shot list by the end of it)`)
  }

  private closeScene() {
    if (this.current) this.timings.push({ ...this.current, endMs: this.elapsed })
    this.current = null
  }

  async showCaption(text: string): Promise<void> {
    this.caption = text
    await this.applyCaption()
  }

  /** Re-applies the caption after a navigation replaced the document. */
  private async applyCaption(): Promise<void> {
    // Nothing is injected into about:blank; the first goto shows the caption.
    if (!this.caption || this.page.url() === 'about:blank') return
    try {
      await this.page.waitForFunction(
        () => typeof (window as CaptionWindow).__demoCaption === 'function',
        undefined,
        { timeout: 5_000 },
      )
      await this.page.evaluate(
        (text) => (window as CaptionWindow).__demoCaption?.(text),
        this.caption,
      )
    } catch {
      console.warn('  (could not show the caption on this page)')
    }
  }

  async goto(pathname: string, options?: { timeout?: number }): Promise<void> {
    await this.gotoUrl(url(pathname), options)
  }

  async gotoUrl(target: string, options?: { timeout?: number }): Promise<void> {
    await this.page.goto(target, {
      waitUntil: 'domcontentloaded',
      timeout: options?.timeout ?? 60_000,
    })
    await this.applyCaption()
  }

  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' })
    await this.applyCaption()
  }

  /** Glides the mouse to the middle of an element, so the cursor is seen arriving. */
  async moveTo(locator: Locator): Promise<void> {
    const target = locator.first()
    await target.scrollIntoViewIfNeeded()
    let box = await target.boundingBox()
    if (!box) throw new Error('Cannot move the mouse to an element with no box')

    // The caption bar sits across the bottom of the frame: keep what is being
    // clicked clear of it, so the viewer sees both.
    const clear = (this.page.viewportSize()?.height ?? 1080) - CAPTION_HEIGHT
    if (box.y + box.height > clear) {
      await this.page.evaluate(
        (top) => window.scrollBy({ top, behavior: 'smooth' }),
        box.y + box.height - clear + 60,
      )
      await this.hold(700)
      box = (await target.boundingBox()) ?? box
    }

    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: pace.mouseSteps,
    })
    await this.hold(260)
  }

  /** Centres a result in the frame, so it is read rather than half shown. */
  async reveal(locator: Locator): Promise<void> {
    await locator
      .first()
      .evaluate((element) => element.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    await this.hold(900)
  }

  /** Moves the mouse to an element and clicks it. */
  async click(locator: Locator): Promise<void> {
    await this.moveTo(locator)
    await locator.first().click()
    await this.hold(420)
  }

  /** Clicks a field, then types into it at a human speed. */
  async type(locator: Locator, text: string): Promise<void> {
    await this.click(locator)
    await this.page.keyboard.type(text, { delay: pace.keyDelay })
    await this.hold(360)
  }

  /** Replaces whatever a field holds with `text`. */
  async retype(locator: Locator, text: string): Promise<void> {
    await this.click(locator)
    await this.page.keyboard.press('ControlOrMeta+A')
    await this.page.keyboard.press('Backspace')
    await this.page.keyboard.type(text, { delay: pace.keyDelay })
    await this.hold(360)
  }

  async select(locator: Locator, option: { label?: string; value?: string }): Promise<void> {
    await this.moveTo(locator)
    await locator.first().selectOption(option)
    await this.hold(520)
  }

  /** Smooth-scrolls a section into view, as a viewer would. */
  async scrollToId(id: string): Promise<void> {
    await this.page.evaluate((anchor) => {
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, id)
    await this.hold(1_400)
  }

  /** Smooth-scrolls to an absolute offset, for the slow opening shot. */
  async scrollTo(top: number): Promise<void> {
    await this.page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), top)
    await this.hold(1_200)
  }

  async hold(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms)
  }

  /** The scene list, with the timings the recording actually produced. */
  finish(): SceneTiming[] {
    this.closeScene()
    return this.timings
  }
}

const stamp = (ms: number) => {
  const whole = Math.max(0, Math.round(ms))
  const pad = (n: number, width = 2) => String(n).padStart(width, '0')
  return `${pad(Math.floor(whole / 3_600_000))}:${pad(Math.floor(whole / 60_000) % 60)}:${pad(
    Math.floor(whole / 1_000) % 60,
  )},${pad(whole % 1_000, 3)}`
}

/** Scene timestamps and a matching subtitle file, for re-editing the cut later. */
export function writeCaptionFiles(timings: SceneTiming[]): void {
  writeFileSync(scenesFile, `${JSON.stringify(timings, null, 2)}\n`)
  const srt = timings
    .map(
      (scene, index) =>
        `${index + 1}\n${stamp(scene.startMs)} --> ${stamp(scene.endMs)}\n${scene.caption}\n`,
    )
    .join('\n')
  writeFileSync(srtFile, srt)
  console.log(`\nWrote ${scenesFile} and ${srtFile}`)
}
