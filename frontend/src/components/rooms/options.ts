export type TypeOption = [value: string, label: string];

export const TYPE_OPTIONS: TypeOption[] = [
  ["", "Tất cả loại"],
  ["room", "Phòng trọ"],
  ["apartment", "Căn hộ"],
  ["house", "Nhà nguyên căn"],
];

export const SORT_OPTIONS: TypeOption[] = [
  ["newest", "Mới nhất"],
  ["price_asc", "Giá thấp → cao"],
  ["price_desc", "Giá cao → thấp"],
  ["distance", "Gần trường nhất"],
  ["rating", "Đánh giá tốt nhất"],
];
