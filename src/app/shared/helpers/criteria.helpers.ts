import { Criteria } from "@core/models/media-model";
import { CRITERIA_LABELS } from "@shared/constants/preference-key";

export function convertKeyToLabel(key: keyof Criteria): string {
  return CRITERIA_LABELS[key] ?? '';
}