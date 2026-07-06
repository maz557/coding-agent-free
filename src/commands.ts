import { PROVIDERS, FIXED_PRESETS, ModelPreset } from './config/models';

export function getAllPresets(userPresets: Record<string, ModelPreset>): Record<string, ModelPreset> {
  return { ...FIXED_PRESETS, ...userPresets };
}

export function formatPresetLine(key: string, preset: ModelPreset): string {
  const prov = PROVIDERS[preset.provider]?.name ?? preset.provider;
  const fb = preset.fallbacks.length ? ` → ${preset.fallbacks.join(', ')}` : '';
  return `  /model ${key}  [${prov}] ${preset.primary}${fb}`;
}

export function showModels(userPresets: Record<string, ModelPreset>, activeModelConfig: ModelPreset) {
  const allPresets = getAllPresets(userPresets);
  const fixedKeys = Object.keys(FIXED_PRESETS);
  const userKeys = Object.keys(userPresets).sort((a, b) => Number(a) - Number(b));

  console.log('\n── Fixed Presets ────────────────────────');
  fixedKeys.forEach(k => console.log(formatPresetLine(k, allPresets[k])));

  if (userKeys.length) {
    console.log('── User Presets ──────────────────────────');
    userKeys.forEach(k => console.log(formatPresetLine(k, allPresets[k])));
  }

  console.log('──────────────────────────────────────────');
  const prov = PROVIDERS[activeModelConfig.provider]?.name ?? activeModelConfig.provider;
  console.log(`  ✅ Active: [${prov}] ${activeModelConfig.primary}${activeModelConfig.fallbacks.length ? ` → ${activeModelConfig.fallbacks.join(', ')}` : ''}`);
}
