import { Signal } from "@angular/core";
import { AllSortOptions, Media, MediaType } from "@shared/types/collection.types";

export interface UserPreferences {
  selectedProviders?: Provider[];
  selectedCriteria?: Criteria;
  sortByMedia: Record<MediaType, AllSortOptions>;
}

interface CriteriaBase<K extends keyof Criteria> {
  id: number;
  key: K;
  hasSelected?: boolean;
  groupKeyWith?: string;
}

export interface CriteriaListItem<K extends keyof Criteria> extends CriteriaBase<K> {
  type: 'list';
  value?: Signal<NonNullable<Criteria[K]>>;
}

export interface CriteriaRangeItem<K extends keyof Criteria> extends CriteriaBase<K> {
  type: 'range';
  value?: Signal<NonNullable<Criteria[K]>>;
}

export interface Criteria {
  genders?: Genre[];
  release?: ReleaseDate;
  note?: number;
  notes?: any[];
  country?: any[];
  duration?: object;
  age?: any[];
  moviesAge?: any[];
  seriesAge?: any[];
}

export interface ReleaseDate {
  startYear: number;
  endYear: number;
}

export interface ProvidersState<T> {
  value: Signal<T | undefined>;
  isLoading: Signal<boolean>;
  error: Signal<Error | undefined>;
  reload: () => void;
}

export interface TitleDiscover {
  page: number;
  results: Media[];
  total_results: number;
}

export interface GenreList {
  genres: Genre[];
}

export interface ProvidersApi {
  results: ProviderApi[];
}

export interface Providers {
  results: Provider[];
}

interface ProviderApi {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
  display_priorities: Record<string, number>;
}

export interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface Genre {
  id: number;
  name: string;
}

interface BaseMedia {
  id: number;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  vote_average: number;
  popularity: number;
  genre_ids: number[];
}

export interface MovieMedia extends BaseMedia {
  media_type: 'movie';
  title: string;
  release_date: string;
}

export interface SeriesMedia extends BaseMedia {
  media_type: 'tv';
  name: string;
  first_air_date: string;
}

export interface MediaConfig {
  options: SortOption<AllSortOptions>[];
  route: string[];
}

export interface SortOption<T extends AllSortOptions> {
  value: T;
  label: string;
}

export interface TitleCollection {
  id: number;
  description: string;
  items: Media[];
}
