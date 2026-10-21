import { SortOption, SortOptionDuration, SortOptionNotes } from "@core/models/media-model";
import { AllSortOptions, CommonSortOptions, Comparator, Media, MovieSortOptions, TVSortOptions } from "@shared/types/collection.types";

export const COMMON_SORT_OPTIONS: SortOption<CommonSortOptions>[] = [
    { value: 'popularity.desc', label: 'Popularité' },
    { value: 'vote_average.desc', label: 'Mieux notés' }
];
export const MOVIE_SORT_OPTIONS: SortOption<MovieSortOptions>[] = [
    ...COMMON_SORT_OPTIONS,
    { value: 'release_date.desc', label: 'Année de sortie' },
    { value: 'revenue.desc', label: 'Box-office' },
    { value: 'title.asc', label: 'Alphabétique' }
];
export const SERIES_SORT_OPTIONS: SortOption<TVSortOptions>[] = [
    ...COMMON_SORT_OPTIONS,
    { value: 'first_air_date.desc', label: 'Date de diffusion' },
    { value: 'name.asc', label: 'Alphabétique' },
];

export const OPTIONS_NOTES: SortOptionNotes[] = [
    { value: 1000, label: '1k+' },
    { value: 10000, label: '10k+' },
    { value: 100000, label: '100k+' },
    { value: 1000000, label: '1m+' },
];

export const OPTIONS_DURATION: SortOptionDuration[] = [
    { value: 0.5, label: '<30m' },
    { value: 0.75, label: '45m' },
    { value: 1, label: '1h' },
    { value: 1.5, label: '1.5h' },
    { value: 2, label: '2h' },
    { value: 3, label: '2.5h+' },
];

export const COMMON_COMPARATORS: Record<CommonSortOptions, Comparator<Media>> = {
  'popularity.desc': (a, b) => b.popularity - a.popularity,
  'vote_average.desc': (a, b) => b.vote_average - a.vote_average,
};

export const isCommonSort = (sort: AllSortOptions): sort is CommonSortOptions => sort in COMMON_COMPARATORS;
