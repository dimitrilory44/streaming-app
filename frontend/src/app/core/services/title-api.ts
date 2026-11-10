import { Injectable, Signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TitleApi {

  // TODO: à terme, appel direct TMDB par le backend Spring Boot
  // GET /watch/providers/movie?watch_region=FR&with_watch_monetization_types=rent
  // & GET /watch/providers/tv?watch_region=FR&with_watch_monetization_types=rent
  // - monetizationType optionnel (absent = "Tout", sans filtre)
  // - réponse attendue : { results[logo_path, provider_id, provider_name], lastFetchedAt (pour mettre à jour la liste et informer dernière MAJ) }
  // - backend gère cache + stockage en base (providers + association film/provider/région/type)
  getMediaCountByMonetizationType(mediaType: Signal<'all' | 'movie' | 'tv'>, monetizationType: Signal<'all' | 'flatrate' | 'free' | 'ads' | 'rent' | 'buy'>) {}
  
}
