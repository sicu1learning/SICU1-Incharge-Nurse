export interface ConsultationCategoryGroup {
  id: string;
  name: string;
  emoji: string;
  color: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  itemActiveBg: string;
  itemActiveBorder: string;
  itemActiveText: string;
  specialties: string[];
}

export const CONSULTATION_CATEGORIES: ConsultationCategoryGroup[] = [
  {
    id: 'surgery',
    name: 'ศัลยกรรม (Surgery)',
    emoji: '🔪',
    color: 'pink',
    borderColor: 'border-pink-200',
    bgColor: 'bg-pink-50/80',
    textColor: 'text-pink-950',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-900',
    itemActiveBg: 'bg-pink-100/90',
    itemActiveBorder: 'border-pink-400',
    itemActiveText: 'text-pink-950',
    specialties: ['Sx', 'Neuro Sx.', 'CVT', 'Vascular', 'Uro', 'IR', 'Ortho'],
  },
  {
    id: 'medicine',
    name: 'อายุรกรรม (Medicine)',
    emoji: '🏥',
    color: 'sky',
    borderColor: 'border-sky-200',
    bgColor: 'bg-sky-50/80',
    textColor: 'text-sky-950',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-900',
    itemActiveBg: 'bg-sky-100/90',
    itemActiveBorder: 'border-sky-400',
    itemActiveText: 'text-sky-950',
    specialties: [
      'Med',
      'Cardio',
      'Neuro med',
      'Nephro',
      'GI',
      'Chest',
      'ID',
      'Endo',
      'Hemato',
      'Onco',
    ],
  },
  {
    id: 'obgyn_ped',
    name: 'สูติ-นรีเวช / กุมาร',
    emoji: '👩‍⚕️',
    color: 'amber',
    borderColor: 'border-amber-200',
    bgColor: 'bg-amber-50/80',
    textColor: 'text-amber-950',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    itemActiveBg: 'bg-amber-100/90',
    itemActiveBorder: 'border-amber-400',
    itemActiveText: 'text-amber-950',
    specialties: ['OB', 'GYN', 'Ped', 'Pedi Sx.'],
  },
  {
    id: 'other',
    name: 'เฉพาะทางอื่น',
    emoji: '🩺',
    color: 'purple',
    borderColor: 'border-purple-200',
    bgColor: 'bg-purple-50/80',
    textColor: 'text-purple-950',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-900',
    itemActiveBg: 'bg-purple-100/90',
    itemActiveBorder: 'border-purple-400',
    itemActiveText: 'text-purple-950',
    specialties: [
      'Eye',
      'ENT',
      'Skin',
      'Maxillo',
      'Plastic',
      'Psychi',
      'Pharmacy',
      'Nutrition',
      'PT',
    ],
  },
];

export const ALL_DEFAULT_SPECIALTIES: string[] = CONSULTATION_CATEGORIES.flatMap(
  (c) => c.specialties
);
