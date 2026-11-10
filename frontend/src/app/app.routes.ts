import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'popular',
        title: 'Recherche de films et séries populaires',
        
        children: [
            {
                path: '',
                redirectTo: 'movies',
                pathMatch: 'full'
            },
            {
                path: 'all', 
                loadComponent: () => 
                    import('@features/titles/popular-titles/popular-titles')
                        .then(m => m.PopularTitlesComponent),
                title: 'Films et series en streaming',
                data: { mediaType: 'all' }
            },
            {
                path: 'movies', 
                loadComponent: () => 
                    import('@features/titles/popular-titles/popular-titles')
                        .then(m => m.PopularTitlesComponent),
                title: 'Films populaires en streaming',
                data: { mediaType: 'movie' }
            },
            {
                path: 'series',
                loadComponent: () =>
                    import('@features/titles/popular-titles/popular-titles')
                        .then(m => m.PopularTitlesComponent),
                title: 'Séries populaires en streaming',
                data: { mediaType: 'tv' }
            }
        ]
        
    },
    {
        path: '**', 
        redirectTo: 'popular/movies',
    },
];
