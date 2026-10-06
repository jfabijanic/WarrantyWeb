// Category values map to translated labels via translations[lang].categories[value].
export const CATEGORY_VALUES = [
  { value: 'mobitel', icon: '📱' },
  { value: 'tablet', icon: '📱' },
  { value: 'racunalo', icon: '💻' },
  { value: 'televizor', icon: '📺' },
  { value: 'kucanski-aparat', icon: '🧊' },
  { value: 'ostalo', icon: '📦' },
];

export function categoryIcon(category) {
  return CATEGORY_VALUES.find((c) => c.value === category)?.icon || '📦';
}
