import { computed, Signal, WritableSignal } from "@angular/core";
import { Criteria, UserPreferences } from "@core/models/media-model";
import { AllSortOptions, ArrayKeys, Media, MediaType, RangeKeys } from "@shared/types/collection.types";

/**
 * Calcule la longueur d'un tableau (readonly ou non), en gérant le cas où
 * la valeur passée serait `undefined`.
 *
 * Pourquoi cette fonction existe :
 * Dans `makeSelectionHelpers` ci-dessous, `items()` retourne un type
 * générique `NonNullable<T[K]>`. TypeScript ne peut pas prouver, à
 * l'intérieur d'une fonction générique, que ce type est bien un tableau
 * (même si la contrainte `ArrayKeys<T>` le garantit "de l'extérieur",
 * au moment de l'appel). Sans cette fonction, `.length` ne compilerait
 * pas directement sur `items()`.
 *
 * `<T>` ici est complètement libre : la fonction accepte un tableau de
 * n'importe quel type d'élément (ou `undefined`), jamais autre chose
 * qu'un tableau — contrairement à `unknown`, qui aurait accepté
 * n'importe quelle valeur (nombre, string, objet...) sans distinction.
 *
 * @param value Un tableau (readonly ou non) ou `undefined`.
 * @returns La longueur du tableau, ou 0 si `value` est `undefined`.
 */
function getLength<T>(value: readonly T[] | undefined): number {
    return value?.length ?? 0;
}

/**
 * Retourne le "titre" d'un média, quel que soit son type.
 *
 * TMDB nomme différemment le titre selon qu'il s'agit d'un film ou
 * d'une série :
 * - un film (`media_type === 'movie'`) a une propriété `title`
 * - une série (`media_type === 'tv'`) a une propriété `name`
 *
 * Cette fonction sert de point d'entrée unique pour lire "le titre",
 * sans que le code appelant ait à se soucier de cette différence
 * (évite de dupliquer des `media.media_type === 'movie' ? media.title : media.name`
 * un peu partout dans l'application).
 *
 * @param media Un objet média (film ou série).
 * @returns Le titre du film, ou le nom de la série.
 */
export function getMediaTitle(media: Media): string {
    return media.media_type === 'movie' ? media.title : media.name;
}

/**
 * Retourne la "date de sortie" d'un média, quel que soit son type.
 *
 * Même logique que `getMediaTitle` ci-dessus, mais pour la date :
 * - un film a une propriété `release_date`
 * - une série a une propriété `first_air_date`
 *
 * @param media Un objet média (film ou série).
 * @returns La date de sortie du film, ou la date de première diffusion
 * de la série.
 */
export function getMediaDate(media: Media): string {
    return media.media_type === 'movie' ? media.release_date : media.first_air_date;
}

/**
 * Sélectionne l'une de trois valeurs possibles selon le type de média
 * actif (film, série, ou "tous").
 *
 * Utile pour éviter de répéter un `if`/`switch` à chaque endroit du code
 * où l'on doit choisir entre une valeur "film", une valeur "série" et
 * une valeur "commune aux deux" (par exemple une route de navigation,
 * un libellé, une valeur par défaut...).
 *
 * @param movieVal La valeur à retourner si `type === 'movie'`.
 * @param tvVal La valeur à retourner si `type === 'tv'`.
 * @param allVal La valeur à retourner si `type === 'all'`.
 * @param type Le type de média actuellement actif.
 * @returns La valeur correspondant au type de média fourni.
 */
export function pick<T>(movieVal: T, tvVal: T, allVal: T, type: MediaType): T {
    if (type === 'all') return allVal;
    return type === 'movie' ? movieVal : tvVal;
}

/**
 * Fabrique un trio de signaux dérivés (`items`, `count`, `hasItems`)
 * pour une propriété de type "liste" (tableau), quelle que soit l'objet
 * source (`Criteria`, `UserPreferences`, ou tout autre objet).
 *
 * Généricité :
 * - `T` est le type de l'objet source complet (ex: `Criteria` ou
 *   `UserPreferences`).
 * - `K` est restreint, via `ArrayKeys<T> & keyof T`, aux seules clés de
 *   `T` dont la valeur est un tableau (ou `undefined`). Impossible
 *   d'appeler cette fonction avec une clé qui pointerait vers un nombre
 *   ou une string, par exemple — TypeScript refusera la compilation.
 *
 * Ce que fait chaque signal retourné :
 * - `items` : lit `source()?.[key]`. Si la propriété est absente ou
 *   n'est pas un tableau (cas `undefined` par exemple), retourne un
 *   tableau vide plutôt que `undefined` — le code appelant n'a jamais
 *   besoin de vérifier `?? []` lui-même.
 * - `count` : la longueur de `items()`, recalculée automatiquement à
 *   chaque changement de `items` (grâce à `computed`).
 * - `hasItems` : un booléen pratique pour les templates
 *   (`*ngIf="hasItems()"` plutôt que `*ngIf="count() > 0"`).
 *
 * Le cast `as NonNullable<T[K]>` sur le tableau vide de secours est
 * nécessaire car TypeScript ne peut pas prouver, à l'intérieur du corps
 * générique, que `[]` (type `never[]`) est assignable à `NonNullable<T[K]>`
 * (un type dont la forme exacte n'est connue qu'au moment de l'appel,
 * une fois `T` et `K` fixés). Le cast est sûr ici car `ArrayKeys<T>`
 * garantit déjà, au niveau du type de `K`, que `T[K]` est bien un
 * tableau.
 *
 * @param key La clé de `T` à lire (doit pointer vers un tableau).
 * @param source Le signal contenant l'objet source (peut être `undefined`).
 * @returns `{ items, count, hasItems }`, trois signaux dérivés en lecture seule.
 */
export function makeSelectionHelpers<T, K extends ArrayKeys<T> & keyof T>(key: K, source: Signal<T | undefined>) {
    const items = computed<NonNullable<T[K]>>(() => {
        const value = source()?.[key];
        return (Array.isArray(value) ? value : []) as NonNullable<T[K]>;
    });
    // `items() as readonly unknown[]` : même limitation de typage générique
    // que ci-dessus. On sait par construction que `items()` est un tableau
    // (garanti par `ArrayKeys<T>`), mais TypeScript a besoin d'un coup de
    // pouce explicite pour l'accepter en entrée de `getLength`.
    const count = computed(() => getLength(items() as readonly unknown[]));
    const hasItems = computed(() => count() > 0);
    return { items, count, hasItems };
}

/**
 * Fabrique un duo de signaux dérivés (`items`, `isDefault`) pour une
 * propriété de type "plage de valeurs" (range) de `Criteria` — par
 * exemple une plage d'années (`{ startYear, endYear }`).
 *
 * Généricité :
 * - `K` est restreint, via `RangeKeys<Criteria> & keyof Criteria`, aux
 *   seules clés de `Criteria` considérées comme des "plages" (voir la
 *   définition de `RangeKeys` dans `collection.types`).
 *
 * Ce que fait chaque signal retourné :
 * - `items` : lit `criteria()?.[key]`, et retombe sur `defaultValue` si
 *   la propriété est absente (contrairement à `makeSelectionHelpers`,
 *   qui retombe sur un tableau vide, ici on retombe sur une valeur par
 *   défaut fournie explicitement par l'appelant).
 * - `isDefault` : compare la valeur actuelle à `defaultValue`, pour
 *   savoir si l'utilisateur a modifié ce filtre par rapport à son état
 *   initial. Deux modes de comparaison :
 *   - si `isEqualFn` est fourni, on l'utilise (utile pour une
 *     comparaison "métier" précise, par exemple ignorer certains
 *     champs) ;
 *   - sinon, on compare les deux valeurs sérialisées en JSON — pratique
 *     pour des objets/tableaux où `===` ne fonctionnerait pas
 *     directement (deux objets différents en mémoire mais avec le même
 *     contenu).
 *
 * @param key La clé de `Criteria` à lire (doit être une "plage").
 * @param criteria Le signal contenant les critères actuels (peut être `undefined`).
 * @param defaultValue La valeur de référence utilisée en absence de valeur, et pour la comparaison `isDefault`.
 * @param isEqualFn Fonction de comparaison optionnelle, utilisée à la place de la comparaison JSON par défaut.
 * @returns `{ items, isDefault }`, deux signaux dérivés en lecture seule.
 */
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

/**
 * Fabrique un trio lecture/écriture (`items`, `isDefault`, `set`) pour
 * le tri sélectionné d'un média donné (film, série, ou "tous").
 *
 * Contrairement à `makeSelectionHelpers`/`makeRangeHelpers`, cette
 * fonction n'est pas générique sur une clé (`K`) : elle est spécifique
 * au tri, car la donnée source (`sortByMedia: Record<MediaType,
 * AllSortOptions>`) a une forme fixe et connue à l'avance — un seul
 * niveau d'indexation par `MediaType`, pas besoin de généricité
 * supplémentaire.
 *
 * Différence importante avec les deux helpers précédents : celui-ci
 * prend un `WritableSignal` (pas un simple `Signal` en lecture seule),
 * car il a besoin d'écrire dedans via `set`.
 *
 * Ce que fait chaque propriété retournée :
 * - `items` : lit `selectedData().sortByMedia[media]` — la valeur de
 *   tri actuellement choisie pour ce média précis.
 * - `isDefault` : `true` si la valeur actuelle est strictement égale à
 *   `defaultValue` (comparaison directe `===`, suffisante ici car
 *   `AllSortOptions` est un type "primitif" — une chaîne littérale —
 *   pas un objet ou un tableau).
 * - `set(value)` : met à jour uniquement la clé `media` de
 *   `sortByMedia`, en recopiant explicitement (`{ ...current,
 *   sortByMedia: { ...current.sortByMedia, [media]: value } }`) le
 *   reste de l'état pour ne pas écraser les valeurs de tri des deux
 *   autres médias, ni les autres propriétés de `UserPreferences`
 *   (immutabilité : on ne modifie jamais l'objet existant, on en crée
 *   un nouveau à chaque `update`).
 *
 * @param media Le type de média concerné ('movie' | 'tv' | 'all').
 * @param selectedData Le signal écrivable contenant l'ensemble des préférences utilisateur.
 * @param defaultValue La valeur de tri par défaut, utilisée pour la comparaison `isDefault`.
 * @returns `{ items, isDefault, set }` — lecture et écriture du tri pour ce média.
 */
export function makeSortHelpers(media: MediaType, selectedData: WritableSignal<UserPreferences>, defaultValue: AllSortOptions) {
    const items = computed(() => {
        return selectedData().sort[media];
    });
    const isDefault = computed(() => {
        return items() === defaultValue;
    });
    const set = (value: AllSortOptions) => selectedData.update(current => ({ ...current, sort: { ...current.sort, [media]: value } }));
    return { items, isDefault, set };
}
