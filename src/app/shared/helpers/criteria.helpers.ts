import { Criteria } from "@core/models/media-model";
import { CRITERIA_LABELS } from "@shared/constants/filter-preferences";

export function convertKeyToLabel(key: keyof Criteria): string {
  return CRITERIA_LABELS[key] ?? '';
}