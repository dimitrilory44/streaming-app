import { Criteria, ReleaseDate, UserPreferences } from "@core/models/media-model";

export const DEFAULT_STORAGE_KEY = 'data';
export const DEFAULT_PROVIDERS_KEY = 'providers';

export const DEFAULT_RELEASE_KEY = 'release';
export const DEFAULT_GENDERS_KEY = 'genders';
export const DEFAULT_EXCLUDED_GENDERS_KEY = 'excludedGenders';
export const DEFAULT_NOTE_KEY = 'note';
export const DEFAULT_NOTES_KEY = 'notes';
export const DEFAULT_COUNTRY_KEY = 'country';
export const DEFAULT_DURATION_KEY = 'duration';
export const DEFAULT_AGE_KEY = 'age';
export const DEFAULT_MOVIES_AGE_KEY = 'moviesAge';
export const DEFAULT_TV_AGE_KEY = 'seriesAge';

export const DEFAULT_RELEASE_DATE: ReleaseDate = { startYear: 1900, endYear: new Date().getFullYear() };
export const DEFAULT_SORT = 'popularity.desc';
export const DEFAULT_SORT_MEDIA: UserPreferences = {
    sort: {
        movie: DEFAULT_SORT,
        tv: DEFAULT_SORT,
        all: DEFAULT_SORT
    }
};
export const DEFAULT_MEDIA = 'movie';

export const CRITERIA_LABELS: Partial<Record<keyof Criteria, string>> = {
  [DEFAULT_RELEASE_KEY]: 'Année de sortie',
  [DEFAULT_GENDERS_KEY]: 'Genres',
  [DEFAULT_NOTE_KEY]: 'Note',
  [DEFAULT_NOTES_KEY]: 'Nombre de notes',
  [DEFAULT_COUNTRY_KEY]: 'Pays de production',
  [DEFAULT_DURATION_KEY]: 'Durée',
  [DEFAULT_AGE_KEY]: 'Âge',
  [DEFAULT_MOVIES_AGE_KEY]: 'Films',
  [DEFAULT_TV_AGE_KEY]: 'Séries'
};
