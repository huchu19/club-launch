// Converts the recorded .webm into the MP4 the demo is shared as: H.264,
// yuv420p, faststart, no audio track (the video is silent and captioned).
import { execFileSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { mp4, rawVideo } from './config'
import { message } from './sanity'

function ffmpegVersion(): string {
  try {
    return execFileSync('ffmpeg', ['-version'], { encoding: 'utf8' }).split('\n')[0] ?? 'ffmpeg'
  } catch {
    throw new Error('ffmpeg is not on PATH. Install it (brew install ffmpeg) and run this again.')
  }
}

function main() {
  if (!existsSync(rawVideo)) {
    throw new Error(`No recording at ${rawVideo}. Run "pnpm demo:record" first.`)
  }
  console.log(`Using ${ffmpegVersion()}`)
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      rawVideo,
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '30',
      '-movflags',
      '+faststart',
      mp4,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  )
  const seconds = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4],
    { encoding: 'utf8' },
  ).trim()
  const size = (statSync(mp4).size / 1_000_000).toFixed(1)
  console.log(`Wrote ${mp4} — ${Number(seconds).toFixed(1)}s, ${size} MB, no audio track.`)
}

try {
  main()
} catch (error) {
  console.error('Build failed:', message(error))
  process.exit(1)
}
