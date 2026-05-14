/**
 * 内置星历数据索引表 (1800-2100)
 */
export interface BuiltinEntry {
  jdStart: number;
  jdEnd: number;
  variable: string;
}

export const BUILTIN_MANIFEST: Record<string, BuiltinEntry[]> = {
  'mer': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'mercury_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'mercury_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'mercury_2451545_2488070_bin_gz' }
  ],
  'ven': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'venus_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'venus_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'venus_2451545_2488070_bin_gz' }
  ],
  'ear': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'earth_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'earth_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'earth_2451545_2488070_bin_gz' }
  ],
  'emb': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'earth_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'earth_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'earth_2451545_2488070_bin_gz' }
  ],
  'mar': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'mars_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'mars_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'mars_2451545_2488070_bin_gz' }
  ],
  'jup': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'jupiter_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'jupiter_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'jupiter_2451545_2488070_bin_gz' }
  ],
  'sat': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'saturn_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'saturn_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'saturn_2451545_2488070_bin_gz' }
  ],
  'ura': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'uranus_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'uranus_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'uranus_2451545_2488070_bin_gz' }
  ],
  'nep': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'neptune_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'neptune_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'neptune_2451545_2488070_bin_gz' }
  ],
  'plu': [
    { jdStart: 2351501, jdEnd: 2388026, variable: 'pluto_2351501_2388026_bin_gz' },
    { jdStart: 2388026, jdEnd: 2424551, variable: 'pluto_2388026_2424551_bin_gz' },
    { jdStart: 2424551, jdEnd: 2461076, variable: 'pluto_2424551_2461076_bin_gz' }
  ],
  'moon': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'moon_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'moon_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'moon_2451545_2488070_bin_gz' }
  ],
  'ceres': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'ceres_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'ceres_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'ceres_2451545_2488070_bin_gz' }
  ],
  'pallas': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'pallas_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'pallas_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'pallas_2451545_2488070_bin_gz' }
  ],
  'juno': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'juno_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'juno_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'juno_2451545_2488070_bin_gz' }
  ],
  'vesta': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'vesta_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'vesta_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'vesta_2451545_2488070_bin_gz' }
  ],
  'eros': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'eros_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'eros_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'eros_2451545_2488070_bin_gz' }
  ],
  'chiron': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'chiron_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'chiron_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'chiron_2451545_2488070_bin_gz' }
  ],
  'pholus': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'pholus_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'pholus_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'pholus_2451545_2488070_bin_gz' }
  ],
  'nessus': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'nessus_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'nessus_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'nessus_2451545_2488070_bin_gz' }
  ],
  'lilith': [
    { jdStart: 2378495, jdEnd: 2415020, variable: 'lilith_2378495_2415020_bin_gz' },
    { jdStart: 2415020, jdEnd: 2451545, variable: 'lilith_2415020_2451545_bin_gz' },
    { jdStart: 2451545, jdEnd: 2488070, variable: 'lilith_2451545_2488070_bin_gz' }
  ],
};
