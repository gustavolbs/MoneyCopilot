import { CSSProperties } from 'react';

import { Category } from '@/domain/types';

const iconEmoji: Record<string, string> = {
  briefcase: '💼',
  home: '🏠',
  'refresh-cw': '↩️',
  'trending-up': '📈',
  wallet: '👛',
  utensils: '🍽️',
  'chef-hat': '🍔',
  'shopping-cart': '🥑',
  car: '🚗',
  'heart-pulse': '💊',
  'paw-print': '🐾',
  'graduation-cap': '🎓',
  repeat: '💳',
  wifi: '📡',
  zap: '⚡',
  'shopping-bag': '🛍️',
  sparkles: '✨',
  plane: '✈️',
  users: '👨‍👩‍👧',
  landmark: '🏛️',
  'chart-no-axes-combined': '📊',
  'credit-card': '💳',
  circle: '●',
};

export function categoryEmoji(category?: Pick<Category, 'icon'> | null) {
  if (!category) return '•';
  return iconEmoji[category.icon] ?? '•';
}

export function CategoryBadge({
  category,
  label,
  selected = false,
  compact = false,
  onClick,
}: {
  category?: Category | null;
  label?: string;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  const name = label ?? category?.name ?? 'Outros';
  const color = category?.color ?? '#64748B';
  const style = {
    '--badge-color': color,
  } as CSSProperties;
  const className = `category-badge${selected ? ' selected' : ''}${compact ? ' compact' : ''}`;
  const content = (
    <>
      <span className="category-badge-emoji">{categoryEmoji(category)}</span>
      <span className="category-badge-label">{name}</span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} style={style} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <span className={className} style={style}>
      {content}
    </span>
  );
}
