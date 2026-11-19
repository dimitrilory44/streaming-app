package io.github.dimitrilory44.streamingexplorer.domain.port.in;

import io.github.dimitrilory44.streamingexplorer.domain.model.Genre;
import io.github.dimitrilory44.streamingexplorer.domain.model.MediaType;

import java.util.List;
import java.util.Set;

public interface GetGenresUseCase {

    /**
     * Retrieves the genres available for the given media types.
     *
     * <p>When several media types are requested, their genres are merged
     * and identical genres (same {@code id} and same {@code name}) are
     * returned only once.
     *
     * @param mediaTypes the media types whose genres are requested;
     *                   must not be {@code null} nor empty
     * @return the genres sorted by name (French collation), without duplicates;
     *         never {@code null}
     * @throws IllegalArgumentException if {@code mediaTypes} is {@code null} or empty
     */
    List<Genre> getGenres(Set<MediaType> mediaTypes);
}
