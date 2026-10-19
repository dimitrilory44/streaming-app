/**
 * Environnement factice utilisé uniquement par les tests (voir `paths` dans tsconfig.spec.json).
 * Le vrai `src/environments/` est ignoré par git (clé d'API) : sans ce stub, tout test qui
 * importe, même indirectement, `TmdbApiService` ou `TmdbImagePipe` ne compilerait pas en CI.
 */
export const environment = {
  production: false,
  tmdbUrl: 'https://api.themoviedb.org/3',
  tmdbImageBaseUrl: 'https://image.tmdb.org/t/p',
  tmdbApiKey: 'test-api-key',
};
