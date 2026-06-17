import { Cloud, CloudOff, RefreshCcw } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export function SyncPill() {
  const { syncStatus, pendingMutations, sync } = useAppStore();
  const { colors } = useTheme();
  const offline = syncStatus === 'offline';
  const syncing = syncStatus === 'syncing';
  const Icon = offline ? CloudOff : syncing ? RefreshCcw : Cloud;

  return (
    <Pressable onPress={sync} style={[styles.pill, { backgroundColor: offline ? `${colors.red}22` : `${colors.green}1F` }]}>
      <Icon size={14} color={offline ? colors.red : colors.green} />
      <Text style={[styles.text, { color: colors.ink }]}>{offline ? 'Offline' : syncing ? 'Sincronizando' : `${pendingMutations} pendente(s)`}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
