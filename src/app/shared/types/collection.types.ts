import { CriteriaListItem, CriteriaRangeItem, MovieMedia, SeriesMedia } from "@core/models/media-model";

export type ArrayKeys<T> = { [K in keyof T]: T[K] extends any[] | undefined ? K : never }[keyof T];
export type ArrayElement<T> = T extends (infer U)[] ? U : never;
export type RangeKeys<T> = { [K in keyof T]: T[K] extends object | undefined ? (T[K] extends any[] | undefined ? never : K) : never }[keyof T];

export type Media = MovieMedia | SeriesMedia;

export type MediaType = 'all' | 'movie' | 'tv';

export type AllSortOptions = MovieSortOptions | TVSortOptions;

export type CommonSortOptions = 'popularity.desc' | 'vote_average.desc';

export type MovieSortOptions = CommonSortOptions | 'release_date.desc' | 'revenue.desc' | 'title.asc';

export type TVSortOptions = CommonSortOptions | 'first_air_date.desc' | 'name.asc';

export type CriteriaItem =
  | CriteriaRangeItem<'release'>
  | CriteriaListItem<'genders'>
  | CriteriaRangeItem<'note'>
  | CriteriaListItem<'notes'>
  | CriteriaListItem<'country'>
  | CriteriaRangeItem<'duration'>
  | CriteriaListItem<'age'>
  | CriteriaListItem<'moviesAge'>
  | CriteriaListItem<'seriesAge'>