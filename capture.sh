#!/usr/bin/env bash
set -euo pipefail

timed() { /usr/bin/time -p "$@"; }
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to the evidence output directory.}"
CAPTURE_DIR="$(mkdir -p "$CAPTURE_DIR" && cd "$CAPTURE_DIR" && pwd -P)"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
case "$CAPTURE_DIR/" in
  "$PROJECT_DIR/"*) echo 'CAPTURE_DIR must be outside the project source.' >&2; exit 1 ;;
esac
PLAYWRIGHT_HOME="${PLAYWRIGHT_HOME:-$HOME/.local/share/omgithub-playwright}"
export CAPTURE_URL CAPTURE_DIR PLAYWRIGHT_HOME

timed node --input-type=module <<'NODE'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const runtime = process.env.PLAYWRIGHT_HOME
let chromium
try {
  const require = createRequire(join(runtime, 'package.json'))
  chromium = require('playwright').chromium
} catch (error) {
  console.error(`Playwright runtime is unavailable: ${error.message}`)
  process.exit(75)
}
let target
try { target = new URL(process.env.CAPTURE_URL) } catch {
  console.error('CAPTURE_URL must be an absolute URL.')
  process.exit(1)
}
let config
try {
  config = JSON.parse(readFileSync(join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'), 'utf8'))
} catch (error) {
  console.error(`Browser configuration is unavailable: ${error.message}`)
  process.exit(75)
}
if (process.platform === 'linux') {
  try { process.env.DISPLAY ||= ':' + readFileSync(join(runtime, 'display'), 'utf8').trim() } catch (error) {
    console.error(`Browser display is unavailable: ${error.message}`)
    process.exit(75)
  }
}

const transientStatuses = new Set([408, 429, 500, 502, 503, 504])
let browser
let exitCode = 0
try {
  try {
    browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 })
  } catch (error) {
    console.error(`Could not launch browser: ${error.message}`)
    process.exitCode = 75
    throw error
  }

  for (const [name, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
    let page
    try {
      page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    } catch (error) {
      console.error(`Could not create ${name} browser page: ${error.message}`)
      process.exitCode = 75
      throw error
    }
    page.setDefaultTimeout(30000)
    const renderErrors = []
    page.on('pageerror', error => renderErrors.push(error.message))
    page.on('response', response => {
      if (response.status() >= 400 && new URL(response.url()).origin === target.origin) {
        renderErrors.push(`HTTP ${response.status()} for ${response.url()}`)
      }
    })
    let response
    try {
      response = await page.goto(process.env.CAPTURE_URL, { waitUntil: 'load', timeout: 45000 })
    } catch (error) {
      console.error(`Navigation/browser failure at ${process.env.CAPTURE_URL}: ${error.message}`)
      process.exitCode = 75
      throw error
    }
    if (!response) {
      console.error('Navigation returned no document response.')
      process.exitCode = 75
      throw new Error('No navigation response')
    }
    if (!response.ok()) {
      const status = response.status()
      console.error(`Preview returned HTTP ${status}.`)
      process.exitCode = transientStatuses.has(status) ? 75 : 1
      throw new Error(`Preview HTTP ${status}`)
    }
    try {
      await page.locator('body').waitFor({ state: 'visible', timeout: 15000 })
      await page.waitForFunction(() => document.readyState === 'complete' && document.fonts.status === 'loaded', { timeout: 15000 })
      await page.waitForTimeout(1000)
    } catch (error) {
      console.error(`The ${name} page did not finish rendering: ${error.message}`)
      process.exitCode = 1
      throw error
    }
    const rendered = await page.evaluate(() => {
      const body = document.body
      if (!body || body.getBoundingClientRect().width <= 0 || body.getBoundingClientRect().height <= 0) return false
      const text = (body.innerText || '').trim()
      const visual = body.querySelector('canvas,svg,img,video,[role="img"]')
      return Boolean(text || visual)
    })
    if (!rendered) {
      console.error(`The ${name} page is blank or has no visible rendered content.`)
      process.exitCode = 1
      throw new Error('Blank rendered page')
    }
    if (renderErrors.length) {
      console.error(`${name} page reported rendering failures: ${renderErrors.join('; ')}`)
      process.exitCode = 1
      throw new Error('Page rendering errors')
    }
    try {
      await page.screenshot({ path: join(process.env.CAPTURE_DIR, `final-${name}.png`), fullPage: true, timeout: 30000 })
    } catch (error) {
      console.error(`Could not capture ${name} view: ${error.message}`)
      process.exitCode = browser.isConnected() ? 1 : 75
      throw error
    }
    console.log(`Captured ${name} view: ${width}x${height} at ${process.env.CAPTURE_URL}`)
    await page.close()
  }
} catch (error) {
  if (!process.exitCode) {
    console.error(error)
    process.exitCode = 1
  }
} finally {
  if (browser) {
    try { await browser.close() } catch (error) {
      console.error(`Could not close capture browser cleanly: ${error.message}`)
      process.exitCode ||= 75
    }
  }
}
NODE