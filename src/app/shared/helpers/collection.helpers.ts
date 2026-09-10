import { computed, Signal, WritableSignal } from "@angular/core";
import { Criteria, UserPreferences } from "@core/models/media-model";
import { AllSortOptions, ArrayKeys, Media, MediaType, RangeKeys } from "@shared/types/collection.types";

function getLength<T>(value: T | readonly T[] | undefined): number {
    return Array.isArray(value) ? value.length : 0;
}

export function getMediaTitle(media: Media): string {
    return media.media_type === 'movie' ? media.title : media.name;
}

export function getMediaDate(media: Media): string {
    return media.media_type === 'movie' ? media.release_date : media.first_air_date;
}

export function sortById<T extends { provider_id: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.provider_id - b.provider_id);
}

export function pick<T>(movieVal: T, tvVal: T, allVal: T, type: MediaType): T {
    if (type === 'all') return allVal;
    return type === 'movie' ? movieVal : tvVal;
}

export function makeSelectionHelpers<T, K extends ArrayKeys<T> & keyof T>(key: K, source: Signal<T | undefined>) {
    const items = computed<NonNullable<T[K]>>(() => {
        const value = source()?.[key];
        console.log(Array.isArray(value))
        return (Array.isArray(value) ? value : []) as NonNullable<T[K]>;
    });
    // TOFIX : erreur sur les providers
    const count = computed(() => getLength(items()));
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
        return JSON.stringify(items()) === JSON.stringify(defaultValue);
    });
    return { items, isDefault };
}

export function makeSortHelpers(media: MediaType, selectedData: WritableSignal<UserPreferences>, defaultValue: AllSortOptions) {
    const items = computed(() => {
        return selectedData().sortByMedia[media];
    });
    const isDefault = computed(() => {
        return items() === defaultValue;
    });
    const set = (value: AllSortOptions) => selectedData.update(current => ({ ...current, sortByMedia: { ...current.sortByMedia, [media]: value } }));
    return { items, isDefault, set };
}
