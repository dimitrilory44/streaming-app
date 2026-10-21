# 🎬 AppFilm

Application de découverte de films et de séries, filtrée selon vos plateformes de streaming. Développée avec **Angular 21** et alimentée par l'API [The Movie Database (TMDB)](https://www.themoviedb.org/).

> **Statut : en développement actif.** Voir la [feuille de route](#feuille-de-route).

<!-- Remplacer par une capture d'écran ou un GIF de l'application -->
![Aperçu de l'application](docs/apercu.gif)

## Fonctionnalités

- **Carrousel de mise en avant** des titres populaires
- **Navigation par onglets** : films, séries, ou les deux réunis
- **Scroll infini** sur les listes de titres
- **Choix des plateformes de streaming** : recherche, sélection multiple, préférences conservées entre les visites
- **Filtres** : genres, année de sortie
- **Tri indépendant par onglet** : popularité, note, date de sortie…
- **Gestion du hors-ligne** : l'interface signale la perte de connexion

## Points techniques

- **Angular moderne** : composants standalone, nouveau control flow (`@if`, `@for`), Signals (`signal`, `computed`, `effect`, `input`, `output`)
- **Chargement des données avec `httpResource`**, couplé à un `IntersectionObserver` pour le scroll infini
- **Séparation présentation / page** : un composant de liste réutilisable, alimenté par des composants de page par catégorie
- **Préférences utilisateur centralisées** dans un service unique, sérialisées dans le `localStorage`, avec des helpers génériques (sélection, plage de valeurs, tri) pour éviter la duplication
- **Typage strict des options de tri** par type de média (films, séries, commun), pour qu'un tri inexistant pour les séries ne puisse pas leur être appliqué
- **Fusion films + séries côté client** : deux appels API distincts réunis et triés localement pour l'onglet commun

## Stack technique

| Domaine | Technologies |
|---|---|
| Framework | Angular 21, TypeScript |
| Interface | Angular Material, Swiper, SCSS |
| Données | API REST TMDB |
| Tests | Vitest |

## Lancer le projet

### Prérequis

- Node.js et npm
- Angular CLI 21 : `npm install -g @angular/cli`
- Une clé API TMDB, gratuite : [créer un compte TMDB](https://www.themoviedb.org/settings/api)

### Configuration

<!-- À adapter selon la façon dont la clé est réellement fournie à l'application -->
Renseignez votre clé API TMDB dans `src/environments/environment.ts` (fichier non versionné), à partir du modèle `environment.example.ts`.

### Démarrage

```bash
npm install
ng serve
```

L'application est disponible sur `http://localhost:4200/`.

### Tests

```bash
ng test
```

## Feuille de route

- [x] Listes de titres populaires avec scroll infini
- [x] Choix des plateformes de streaming et préférences persistées
- [x] Tri par type de média
- [ ] Filtres avancés : note, durée, pays de production, âge
- [ ] Exclusion d'un genre (filtre à trois états)
- [ ] Backend **Spring Boot** servant de proxy et de cache pour l'API TMDB, afin de masquer la clé et limiter les appels
- [ ] **Recherche en langage naturel** assistée par IA
- [ ] Extension aux jeux vidéo

## Auteur

**Dimitri Lory** — Développeur Full Stack Java
[GitHub](https://github.com/dimitrilory44)
