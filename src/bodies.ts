/**
 * 天体元信息注册表
 * 
 * 集中描述引擎认识的所有天体及其属性，
 * 供 resolver、engine、observer 等模块查询。
 */

export interface BodyInfo {
  /** 天体标识符 */
  tag: string;
  /** 天体英文名 */
  name: string;
  /** 原始星历数据的坐标中心 */
  nativeCenter: 'sun' | 'earth' | 'virtual';
  /** 是否为合成天体（非查表，需要特殊计算） */
  synthetic: boolean;
  /** 天体类型分类 */
  category: 'star' | 'planet' | 'dwarf' | 'satellite' | 'asteroid' | 'centaur' | 'virtual';
}

/**
 * 内置天体注册表
 */
export const BODIES: Record<string, BodyInfo> = {
  sun:  { tag: 'sun',  name: 'Sun',     nativeCenter: 'virtual', synthetic: true,  category: 'star' },
  mer:  { tag: 'mer',  name: 'Mercury', nativeCenter: 'sun',     synthetic: false, category: 'planet' },
  ven:  { tag: 'ven',  name: 'Venus',   nativeCenter: 'sun',     synthetic: false, category: 'planet' },
  ear:  { tag: 'ear',  name: 'Earth',   nativeCenter: 'sun',     synthetic: true,  category: 'planet' },
  emb:  { tag: 'emb',  name: 'EMB',     nativeCenter: 'sun',     synthetic: false, category: 'planet' },
  mar:  { tag: 'mar',  name: 'Mars',    nativeCenter: 'sun',     synthetic: false, category: 'planet' },
  jup:  { tag: 'jup',  name: 'Jupiter', nativeCenter: 'sun',     synthetic: false, category: 'planet' },
  sat:  { tag: 'sat',  name: 'Saturn',  nativeCenter: 'sun',     synthetic: false, category: 'planet' },
  ura:  { tag: 'ura',  name: 'Uranus',  nativeCenter: 'sun',     synthetic: false, category: 'planet' },
  nep:  { tag: 'nep',  name: 'Neptune', nativeCenter: 'sun',     synthetic: false, category: 'planet' },
  plu:  { tag: 'plu',  name: 'Pluto',   nativeCenter: 'sun',     synthetic: false, category: 'dwarf' },
  moon: { tag: 'moon', name: 'Moon',    nativeCenter: 'earth',   synthetic: false, category: 'satellite' },
  ceres:  { tag: 'ceres',  name: 'Ceres',   nativeCenter: 'sun', synthetic: false, category: 'dwarf' },
  pallas: { tag: 'pallas', name: 'Pallas',  nativeCenter: 'sun', synthetic: false, category: 'asteroid' },
  juno:   { tag: 'juno',   name: 'Juno',    nativeCenter: 'sun', synthetic: false, category: 'asteroid' },
  vesta:  { tag: 'vesta',  name: 'Vesta',   nativeCenter: 'sun', synthetic: false, category: 'asteroid' },
  eros:   { tag: 'eros',   name: 'Eros',    nativeCenter: 'sun', synthetic: false, category: 'asteroid' },
  chiron: { tag: 'chiron', name: 'Chiron',  nativeCenter: 'sun', synthetic: false, category: 'centaur' },
  pholus: { tag: 'pholus', name: 'Pholus',  nativeCenter: 'sun', synthetic: false, category: 'centaur' },
  nessus: { tag: 'nessus', name: 'Nessus',  nativeCenter: 'sun', synthetic: false, category: 'centaur' },
  lilith: { tag: 'lilith', name: 'Lilith',  nativeCenter: 'sun', synthetic: false, category: 'asteroid' },
};

/**
 * 查询天体信息，未注册则返回 undefined
 */
export function getBodyInfo(tag: string): BodyInfo | undefined {
  return BODIES[tag];
}

/**
 * 获取所有已注册天体的 tag 列表
 */
export function getRegisteredBodies(): string[] {
  return Object.keys(BODIES);
}
