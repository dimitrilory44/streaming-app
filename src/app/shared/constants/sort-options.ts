import { SortOption } from "@core/models/media-model";
import { CommonSortOptions, MovieSortOptions, TVSortOptions } from "@shared/types/collection.types";

export const commonSortOptions: SortOption<CommonSortOptions>[] = [
    { value: 'popularity.desc', label: 'Popularité' },
    { value: 'vote_average.desc', label: 'Mieux notés' }
];

export const sortMovieOptions: SortOption<MovieSortOptions>[] = [
    ...commonSortOptions,
    { value: 'release_date.desc', label: 'Année de sortie' },
    { value: 'revenue.desc', label: 'Box-office' },
    { value: 'title.asc', label: 'Alphabétique' }
];

export const sortTVOptions: SortOption<TVSortOptions>[] = [
    ...commonSortOptions,
    { value: 'first_air_date.desc', label: 'Date de diffusion' },
    { value: 'name.asc', label: 'Alphabétique' },
];
