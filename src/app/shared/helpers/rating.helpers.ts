import { MEAN_VOTE_AVERAGE, MIN_VOTES_FOR_RATING_SORT } from "@shared/constants/filter-preferences";
import { CommonSortOptions, Media } from "@shared/types/collection.types";

export function sortMerged(items: Media[], sort: CommonSortOptions): Media[] {
  if (sort === 'vote_average.desc') {
    const score = (m: Media) => weightedRating(m.vote_average, m.vote_count, MIN_VOTES_FOR_RATING_SORT[m.media_type as 'movie' | 'tv'], MEAN_VOTE_AVERAGE);
    return [...items].sort((a, b) => score(b) - score(a));
  }
  return [...items].sort((a, b) => b.popularity - a.popularity);
}

/**
 * Note pondérée (formule « bayésienne » type IMDb) : tire vers la moyenne générale les notes
 * qui reposent sur peu de votes, pour qu'un 9,5 sur 3 votes ne passe pas devant un 8 sur 5 000 votes.
 *
 * score = v / (v + m) × R  +  m / (v + m) × C
 *   R = note du titre, v = nombre de votes, m = seuil de votes, C = moyenne générale.
 *
 * Un titre sans vote (ou sans `vote_count`) obtient exactement la moyenne générale.
 */
export function weightedRating(voteAverage: number, voteCount: number | undefined, minVotes: number, meanVote: number): number {
  const votes = voteCount ?? 0;
  const total = votes + minVotes;
  if (total <= 0) return meanVote;
  return (votes / total) * voteAverage + (minVotes / total) * meanVote;
}
