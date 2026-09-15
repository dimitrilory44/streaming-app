import { CriteriaListItem, CriteriaRangeItem, MovieMedia, SeriesMedia } from "@core/models/media-model";
import { DEFAULT_AGE_KEY, DEFAULT_COUNTRY_KEY, DEFAULT_DURATION_KEY, DEFAULT_GENDERS_KEY, DEFAULT_MOVIES_AGE_KEY, DEFAULT_NOTE_KEY, DEFAULT_NOTES_KEY,DEFAULT_RELEASE_KEY, DEFAULT_TV_AGE_KEY } from '@shared/constants/preference-key';

/**
 * Extrait, parmi les clés de `T`, uniquement celles dont la valeur est
 * un tableau (ou `undefined`).
 *
 * Comment ça fonctionne (type mappé + type conditionnel) :
 * 1. `{ [K in keyof T]: ... }` parcourt chaque clé `K` de `T`.
 * 2. Pour chaque clé, `T[K] extends any[] | undefined ? K : never`
 *    garde le **nom de la clé** (`K`) si sa valeur est un tableau (ou
 *    `undefined`), et la remplace par `never` sinon.
 * 3. `[keyof T]` à la toute fin ("indexed access type") transforme cet
 *    objet intermédiaire en une **union** de toutes les valeurs
 *    obtenues — donc une union des seuls noms de clés conservés (les
 *    `never` disparaissent automatiquement d'une union, car `X | never`
 *    est équivalent à `X`).
 *
 * Résultat concret : `ArrayKeys<{ a: string[]; b: number; c?: boolean[] }>`
 * donne le type `'a' | 'c'` (pas `'b'`, qui n'est pas un tableau).
 *
 * Utilisé par exemple dans `makeSelectionHelpers` (fichier des helpers)
 * pour restreindre, à la compilation, les clés qu'on a le droit de lui
 * passer — impossible d'appeler cette fonction avec une clé qui ne
 * pointe pas vers un tableau.
 */
export type ArrayKeys<T> = { [K in keyof T]: T[K] extends any[] | undefined ? K : never }[keyof T];

/**
 * Extrait le type d'un **élément** d'un tableau.
 *
 * Comment ça fonctionne (type conditionnel + inférence `infer`) :
 * - Si `T` correspond au patron "un tableau de quelque chose"
 *   (`(infer U)[]`), TypeScript déduit ce "quelque chose" et le nomme
 *   `U` — c'est ce `U` qui est retourné.
 * - Si `T` n'est pas un tableau, le type résultant est `never` (aucune
 *   valeur possible).
 *
 * Exemple : `ArrayElement<string[]>` donne `string`.
 * Exemple : `ArrayElement<MovieMedia[]>` donne `MovieMedia`.
 *
 * Utile quand on a le type d'une liste (ex: `Provider[]`) mais qu'on a
 * besoin de désigner le type d'un seul élément de cette liste, sans
 * avoir à l'écrire une deuxième fois "en dur" ailleurs dans le code
 * (donc sans risque que les deux se désynchronisent si `Provider`
 * change de forme).
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

/**
 * Extrait, parmi les clés de `T`, uniquement celles dont la valeur est
 * un **objet qui n'est pas un tableau** (ou `undefined`) — typiquement
 * une "plage de valeurs" comme `{ startYear: number; endYear: number }`.
 *
 * Comment ça fonctionne, étape par étape pour chaque clé `K` :
 * 1. `T[K] extends object | undefined ? (...) : never`
 *    → ne garde que les clés dont la valeur est un objet (ou absente).
 *    Un objet au sens TypeScript inclut aussi les tableaux ! C'est pour
 *    ça qu'il y a une deuxième vérification :
 * 2. À l'intérieur, `T[K] extends any[] | undefined ? never : K`
 *    → si la valeur est *aussi* un tableau, on l'exclut quand même
 *    (`never`) ; sinon, on garde le nom de la clé (`K`).
 * 3. `[keyof T]` transforme, comme pour `ArrayKeys`, le résultat en une
 *    union des clés conservées.
 *
 * En clair : `RangeKeys<T>` = les clés "objet", moins celles qui sont
 * des tableaux (déjà couvertes par `ArrayKeys`). Les deux types sont
 * donc complémentaires et ne se recoupent pas.
 *
 * Exemple : pour `Criteria` (qui contient par exemple `release: {
 * startYear, endYear }` et `genders: string[]`), `RangeKeys<Criteria>`
 * donnerait `'release'` (un objet-plage), pas `'genders'` (un tableau,
 * couvert par `ArrayKeys` à la place).
 *
 * Utilisé par `makeRangeHelpers` (fichier des helpers) pour restreindre
 * les clés de `Criteria` qu'on a le droit de lui passer.
 */
export type RangeKeys<T> = { [K in keyof T]: T[K] extends object | undefined ? (T[K] extends any[] | undefined ? never : K) : never }[keyof T];

export type GenderState = 'none' | 'includedGenders' | 'excludedGenders';
/**
 * Signature standard d'une fonction de comparaison, telle qu'attendue
 * par `Array.prototype.sort()`.
 *
 * Convention du retour (héritée de `sort()`) :
 * - un nombre négatif → `a` doit passer avant `b`
 * - un nombre positif → `a` doit passer après `b`
 * - `0` → l'ordre entre `a` et `b` ne change pas
 *
 * Utilisé par exemple dans le tri côté client de l'onglet "Tout"
 * (fusion films + séries), où chaque option de tri commune
 * (`CommonSortOptions`) est associée à son propre `Comparator<Media>`
 * dans un `Record`.
 */
export type Comparator<T> = (a: T, b: T) => number;

/**
 * Un média est soit un film, soit une série — jamais autre chose.
 * Cette union permet de manipuler les deux types de façon interchangeable
 * (par exemple dans une liste mixte films + séries), tout en gardant la
 * possibilité de distinguer précisément l'un de l'autre via le champ
 * `media_type` ('movie' | 'tv') présent sur chacun des deux types.
 */
export type Media = MovieMedia | SeriesMedia;

/**
 * Les trois "onglets" possibles dans l'interface : uniquement les films,
 * uniquement les séries, ou les deux mélangés.
 *
 * Ce type sert de clé dans de nombreux `Record<MediaType, ...>` à
 * travers l'application (options de tri affichées, routes de
 * navigation, tri sélectionné par média...), pour garantir que toutes
 * les structures qui dépendent du média actif couvrent bien les 3 cas
 * possibles, sans en oublier un.
 */
export type MediaType = 'all' | 'movie' | 'tv';

/**
 * L'ensemble de toutes les valeurs de tri possibles, tous médias
 * confondus (films + séries).
 *
 * Cette union large sert notamment pour les états qui doivent pouvoir
 * représenter "n'importe quelle valeur de tri", indépendamment du média
 * concerné — par exemple le two-way binding du bouton "Réinitialiser"
 * partagé entre les 3 onglets.
 *
 * Pour une valeur de tri liée à un média précis, préférer
 * `MovieSortOptions` ou `TVSortOptions` (plus stricts), qui empêchent
 * par exemple d'assigner accidentellement `'revenue.desc'` (propre aux
 * films) à un contexte "série".
 */
export type AllSortOptions = MovieSortOptions | TVSortOptions;

/**
 * Les valeurs de tri qui ont un sens à la fois pour les films et pour
 * les séries — donc les seules valeurs valides pour l'onglet "Tout"
 * (qui combine les deux).
 *
 * Exemple de valeur exclue volontairement : `'revenue.desc'`
 * (Box-office) n'existe pas ici, car TMDB ne fournit pas cette donnée
 * pour les séries — l'inclure aurait rendu ce critère de tri
 * incohérent sur l'onglet "Tout".
 */
export type CommonSortOptions = 'popularity.desc' | 'vote_average.desc';

/**
 * Toutes les valeurs de tri valides spécifiquement pour les films :
 * les valeurs communes (`CommonSortOptions`), plus celles propres aux
 * films chez TMDB (date de sortie, revenus au box-office, ordre
 * alphabétique sur le `title`).
 */
export type MovieSortOptions = CommonSortOptions | 'release_date.desc' | 'revenue.desc' | 'title.asc';

/**
 * Toutes les valeurs de tri valides spécifiquement pour les séries :
 * les valeurs communes (`CommonSortOptions`), plus celles propres aux
 * séries chez TMDB (date de première diffusion, ordre alphabétique sur
 * le `name` — pas `title`, TMDB nomme ce champ différemment pour les
 * séries).
 */
export type TVSortOptions = CommonSortOptions | 'first_air_date.desc' | 'name.asc';

export type CriteriaItem =
  | CriteriaRangeItem<typeof DEFAULT_RELEASE_KEY>
  | CriteriaListItem<typeof DEFAULT_GENDERS_KEY>
  | CriteriaRangeItem<typeof DEFAULT_NOTE_KEY>
  | CriteriaListItem<typeof DEFAULT_NOTES_KEY>
  | CriteriaListItem<typeof DEFAULT_COUNTRY_KEY>
  | CriteriaRangeItem<typeof DEFAULT_DURATION_KEY>
  | CriteriaListItem<typeof DEFAULT_AGE_KEY>
  | CriteriaListItem<typeof DEFAULT_MOVIES_AGE_KEY>
  | CriteriaListItem<typeof DEFAULT_TV_AGE_KEY>;
