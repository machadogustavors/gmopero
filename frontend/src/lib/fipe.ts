const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1/carros';

interface FipeItem {
  codigo: string;
  nome: string;
}

interface FipeYear {
  codigo: string;
  nome: string;
}

let brandsCache: FipeItem[] | null = null;
const modelsCache: Record<string, FipeItem[]> = {};
const yearsCache: Record<string, FipeYear[]> = {};

export async function fetchBrands(): Promise<FipeItem[]> {
  if (brandsCache) return brandsCache;
  const res = await fetch(`${FIPE_BASE}/marcas`);
  if (!res.ok) throw new Error('Falha ao carregar marcas');
  const data: FipeItem[] = await res.json();
  brandsCache = data.sort((a, b) => a.nome.localeCompare(b.nome));
  return brandsCache;
}

export async function fetchModels(brandCode: string): Promise<FipeItem[]> {
  if (modelsCache[brandCode]) return modelsCache[brandCode];
  const res = await fetch(`${FIPE_BASE}/marcas/${brandCode}/modelos`);
  if (!res.ok) throw new Error('Falha ao carregar modelos');
  const data: { modelos: FipeItem[] } = await res.json();
  const sorted = data.modelos.sort((a, b) => a.nome.localeCompare(b.nome));
  modelsCache[brandCode] = sorted;
  return sorted;
}

export async function fetchYears(brandCode: string, modelCode: string): Promise<FipeYear[]> {
  const key = `${brandCode}-${modelCode}`;
  if (yearsCache[key]) return yearsCache[key];
  const res = await fetch(`${FIPE_BASE}/marcas/${brandCode}/modelos/${modelCode}/anos`);
  if (!res.ok) throw new Error('Falha ao carregar anos');
  const data: FipeYear[] = await res.json();
  yearsCache[key] = data;
  return data;
}
