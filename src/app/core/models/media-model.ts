import { Signal } from "@angular/core";
import { DEFAULT_EXCLUDED_GENDERS_KEY, DEFAULT_GENDERS_KEY } from "@shared/constants/preference-key";
import { AllSortOptions, Media, MediaType } from "@shared/types/collection.types";

export interface UserPreferences {
  providers?: Provider[];
  criteria?: Criteria;
  sort: Record<MediaType, AllSortOptions>;
}

/**
 * Socle commun à tout critère de filtrage affiché dans l'interface
 * (genres, années, durée, etc.), quel que soit son type concret
 * (`'list'` ou `'range'`).
 *
 * `K extends keyof Criteria` lie ce critère à une clé précise de
 * `Criteria` — c'est ce qui permet à `value` (dans les interfaces
 * enfants ci-dessous) d'être typé exactement comme la propriété
 * correspondante de `Criteria`, sans avoir à le ré-écrire à la main
 * pour chaque critère.
 *
 * - `id` : identifiant numérique du critère (probablement utilisé
 *   comme `trackBy` dans les listes affichées, ou pour le
 *   ré-ordonnancement).
 * - `key` : la clé de `Criteria` à laquelle ce critère correspond
 *   (ex: `'genders'`, `'release'`...).
 * - `hasSelected?` : indique si ce critère a une sélection active
 *   (utile pour l'affichage, par exemple pour mettre en évidence les
 *   filtres actifs dans le menu).
 * - `groupKeyWith?` : permet de regrouper visuellement plusieurs
 *   critères ensemble (ex: afficher "Âge films" et "Âge séries" sous
 *   un même groupe dans l'UI), en partageant une même valeur de
 *   regroupement.
 */
interface CriteriaBase<K extends keyof Criteria> {
  id: number;
  key: K;
  hasSelected?: boolean;
  groupKeyWith?: string;
}

/**
 * Un critère de filtrage de type "liste de valeurs sélectionnables"
 * (ex: une liste de genres, une liste de pays...).
 *
 * `value?: Signal<NonNullable<Criteria[K]>>` : la valeur actuelle du
 * critère est un signal Angular (réactif), dont le type est déduit
 * automatiquement de la propriété `Criteria[K]` correspondante — par
 * exemple, pour `K = 'genders'`, `value` sera typé
 * `Signal<Genre[]>` (le `NonNullable` retire le `?` optionnel de la
 * propriété d'origine, puisqu'ici on sait qu'une valeur existe si le
 * signal est présent).
 *
 * `value` reste lui-même optionnel (`value?`) : un critère peut exister
 * dans la configuration (affiché dans le menu) sans qu'une valeur ne
 * lui soit encore associée (aucune sélection faite par l'utilisateur).
 */
export interface CriteriaListItem<K extends keyof Criteria> extends CriteriaBase<K> {
  type: 'list';
  value?: Signal<NonNullable<Criteria[K]>>;
}

/**
 * Un critère de filtrage de type "plage de valeurs" (ex: une plage
 * d'années, une plage de durée...).
 *
 * Structurellement identique à `CriteriaListItem` (même `value` typé
 * via `Criteria[K]`) — seule la propriété discriminante `type: 'range'`
 * change. C'est cette propriété `type` qui permet, dans le code
 * consommateur, de distinguer un `CriteriaListItem` d'un
 * `CriteriaRangeItem` au sein de l'union `CriteriaItem` (via un
 * `switch(item.type)` ou un test `if (item.type === 'range')`, par
 * exemple), et d'adapter l'affichage en conséquence (un widget de
 * sélection multiple pour une liste, un double curseur pour une plage).
 */
export interface CriteriaRangeItem<K extends keyof Criteria> extends CriteriaBase<K> {
  type: 'range';
  value?: Signal<NonNullable<Criteria[K]>>;
}

export interface Criteria {
  genders?: Genre[];
  excludedGenders?: Genre[];
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
