import { Cloud, CloudOff, RefreshCcw } from 'lucide-react';

import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export function SyncPill() {
  const { syncStatus, pendingMutations, sync } = useAppStore();
  const { colors } = useTheme();
  const offline = syncStatus === 'offline';
  const syncing = syncStatus === 'syncing';
  const Icon = offline ? CloudOff : syncing ? RefreshCcw : Cloud;

  return (
    <button type="button" onClick={() => void sync()} className="sync-pill" style={{ backgroundColor: offline ? `${colors.red}22` : `${colors.green}1F` }}>
      <Icon size={14} color={offline ? colors.red : colors.green} />
      <span style={{ color: colors.ink }}>{offline ? 'Offline' : syncing ? 'Sincronizando' : `${pendingMutations} pendente(s)`}</span>
    </button>
  );
}
