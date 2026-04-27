export interface Prize {
  id: string;
  sku: string;
  name: string;
  brand: string;
  color: string;
  textColor: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const RAW_PRIZES: Prize[] = [
  { id: '1',  sku: '267335', name: 'Car Wash 1L',              brand: 'ARMOR ALL',  color: '#1565C0', textColor: '#fff' },
  { id: '2',  sku: '657962', name: "Cleaning 30's",            brand: 'ARMOR ALL',  color: '#1976D2', textColor: '#fff' },
  { id: '3',  sku: '657954', name: 'Original 300ml',           brand: 'ARMOR ALL',  color: '#1E88E5', textColor: '#fff' },
  { id: '4',  sku: '222136', name: 'Exotic Frangipani',        brand: 'ARMOR ALL',  color: '#2196F3', textColor: '#fff' },
  { id: '5',  sku: '675546', name: 'Bubblegum 1pk',            brand: 'JELLY BELLY', color: '#E91E63', textColor: '#fff' },
  { id: '6',  sku: '675855', name: 'Tutti Frutti 1pk',         brand: 'JELLY BELLY', color: '#C2185B', textColor: '#fff' },
  { id: '7',  sku: '212534', name: 'Max AA 10PK',              brand: 'ENERGIZER',  color: '#FF6F00', textColor: '#fff' },
  { id: '8',  sku: '824941', name: 'Max AA 16PK',              brand: 'ENERGIZER',  color: '#F57C00', textColor: '#fff' },
  { id: '9',  sku: '257084', name: 'Max AAA 8 Pack',           brand: 'ENERGIZER',  color: '#EF6C00', textColor: '#fff' },
  { id: '10', sku: '824873', name: 'Max AAA 14PK',             brand: 'ENERGIZER',  color: '#E65100', textColor: '#fff' },
  { id: '11', sku: '292322', name: 'Max C 2PK',                brand: 'ENERGIZER',  color: '#FF8F00', textColor: '#fff' },
  { id: '12', sku: '292403', name: 'Max D 2PK',                brand: 'ENERGIZER',  color: '#FF6F00', textColor: '#fff' },
  { id: '13', sku: '218140', name: 'Max 9V 1PK',               brand: 'ENERGIZER',  color: '#F57C00', textColor: '#fff' },
  { id: '14', sku: '532308', name: 'Gold AA 8PK',              brand: 'EVEREADY',   color: '#2E7D32', textColor: '#fff' },
  { id: '15', sku: '532230', name: 'Gold AA 16PK',             brand: 'EVEREADY',   color: '#388E3C', textColor: '#fff' },
  { id: '16', sku: '532379', name: 'Gold AAA 8',               brand: 'EVEREADY',   color: '#43A047', textColor: '#fff' },
  { id: '17', sku: '647750', name: 'Gold AAA 16PK',            brand: 'EVEREADY',   color: '#4CAF50', textColor: '#fff' },
  { id: '18', sku: '647679', name: 'SHD AA 24PK',              brand: 'EVEREADY',   color: '#1B5E20', textColor: '#fff' },
  { id: '19', sku: '751282', name: 'SHD AAA 24PK',             brand: 'EVEREADY',   color: '#2E7D32', textColor: '#fff' },
  { id: '20', sku: '296664', name: 'Max Plus AA 10PK',         brand: 'ENERGIZER',  color: '#BF360C', textColor: '#fff' },
  { id: '21', sku: '617645', name: 'Max Plus AAA 10PK',        brand: 'ENERGIZER',  color: '#D84315', textColor: '#fff' },
  { id: '22', sku: '556027', name: 'Lithium 2032BS2',          brand: 'ENERGIZER',  color: '#E64A19', textColor: '#fff' },
];

export const PRIZES: Prize[] = shuffle(RAW_PRIZES);

export interface WinRecord {
  id: string;
  prizeId: string;
  prizeName: string;
  prizeBrand: string;
  sku: string;
  timestamp: string;
}

const STORAGE_KEY = 'spintowin_wins';

export function saveWin(prize: Prize): WinRecord {
  const record: WinRecord = {
    id: `win_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    prizeId: prize.id,
    prizeName: prize.name,
    prizeBrand: prize.brand,
    sku: prize.sku,
    timestamp: new Date().toISOString(),
  };
  const existing = loadWins();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...existing]));
  return record;
}

export function loadWins(): WinRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function clearWins(): void {
  localStorage.removeItem(STORAGE_KEY);
}
