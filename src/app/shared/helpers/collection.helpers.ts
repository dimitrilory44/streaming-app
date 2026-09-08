import { computed, Signal } from "@angular/core";
import { Criteria } from "@core/models/media-model";
import { ArrayKeys, Media, RangeKeys } from "@shared/types/collection.types";

export function getMediaTitle(media: Media): string {
  return media.media_type === 'movie' ? media.title : media.name;
}

export function getMediaDate(media: Media): string {
  return media.media_type === 'movie' ? media.release_date : media.first_air_date;
}

export function pick<T>(movieVal: T, tvVal: T, allVal: T, type: "all" | "movie" | "tv"): T {
    if (type === 'all') return allVal;
    return type === 'movie' ? movieVal : tvVal;
}

export function makeSelectionHelpers<K extends ArrayKeys<Criteria> & keyof Criteria>(key: K, criteria: Signal<Criteria | undefined>) {
    const items = computed<NonNullable<Criteria[K]>>(() => {
        const value = criteria()?.[key];
        return Array.isArray(value) ? value : [];
    });
    const count = computed(() => items().length ?? 0);
    const hasItems = computed(() => count() > 0);
    return { items, count, hasItems };
}

export function makeRangeHelpers<K extends RangeKeys<Criteria> & keyof Criteria>(key: K, criteria: Signal<Criteria | undefined>, defaultValue: NonNullable<Criteria[K]>, isEqualFn?: (a: NonNullable<Criteria[K]>, b: NonNullable<Criteria[K]>) => boolean) {
    const items = computed<NonNullable<Criteria[K]>>(() => {
        return criteria()?.[key] ?? defaultValue;
    });
    const isDefault = computed(() => {
        if (isEqualFn) {
            return isEqualFn(items(), defaultValue);
        }
        return JSON.stringify(items()) === JSON.stringify(defaultValue)
    });
    return { items, isDefault };
}
