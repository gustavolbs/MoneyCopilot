import { CircleAlert, Cloud, CloudOff, RefreshCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export function SyncPill() {
  const { syncStatus, pendingMutations, sync } = useAppStore();
  const { colors } = useTheme();
  const offline = syncStatus === 'offline';
  const syncing = syncStatus === 'syncing';
  const failed = syncStatus === 'error';
  const Icon = offline ? CloudOff : failed ? CircleAlert : syncing ? RefreshCcw : Cloud;
  const tone = offline || failed ? colors.red : syncing ? colors.blue : colors.green;

  return (
    <Button type="button" variant="ghost" onClick={() => void sync()} className="sync-pill" disabled={syncing} aria-live="polite" style={{ backgroundColor: `${tone}1F` }}>
      <Icon className={syncing ? 'sync-pill-spinner' : undefined} size={14} color={tone} />
      <span style={{ color: colors.ink }}>{offline ? 'Offline' : failed ? 'Erro ao sincronizar' : syncing ? 'Sincronizando...' : `${pendingMutations} pendente(s)`}</span>
    </Button>
  );
}
