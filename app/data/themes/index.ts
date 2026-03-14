export type { ThemePreset } from './types'

import { defaultTheme } from './default'
import { midnightBloomTheme } from './midnight-bloom'
import { oceanBreezeTheme } from './ocean-breeze'
import { emeraldDuskTheme } from './emerald-dusk'
import { rosePineTheme } from './rose-pine'
import { amberGlowTheme } from './amber-glow'
import { slateMinimalTheme } from './slate-minimal'

export const themes = [
  defaultTheme,
  midnightBloomTheme,
  oceanBreezeTheme,
  emeraldDuskTheme,
  rosePineTheme,
  amberGlowTheme,
  slateMinimalTheme,
] as const

export {
  defaultTheme,
  midnightBloomTheme,
  oceanBreezeTheme,
  emeraldDuskTheme,
  rosePineTheme,
  amberGlowTheme,
  slateMinimalTheme,
}
