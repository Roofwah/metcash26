import axios from 'axios';
import { apiUrl } from '../../api';
import type { Prize } from './prizes';

/** Session context when logging a spin (same Postgres DB as orders). */
export interface SpinSessionMeta {
  sessionKind: 'retail' | 'mso';
  repEmail?: string;
  userName: string;
  storeName?: string;
  msoGroup?: string;
  msoStoreCount?: number;
  storeId?: string;
}

/** Fire-and-forget POST so a failed log never blocks the UI. */
export function reportSpinWinToServer(prize: Prize, meta: SpinSessionMeta | undefined): void {
  if (!meta?.userName?.trim()) return;
  axios
    .post(apiUrl('/api/spin-win'), {
      sessionKind: meta.sessionKind,
      repEmail: meta.repEmail?.trim() || null,
      userName: meta.userName.trim(),
      storeName: meta.storeName?.trim() || null,
      msoGroup: meta.msoGroup?.trim() || null,
      msoStoreCount: meta.msoStoreCount ?? null,
      storeId: meta.storeId?.trim() || null,
      prizeId: prize.id,
      sku: prize.sku,
      prizeName: prize.name,
      prizeBrand: prize.brand,
    })
    .catch(() => {});
}
