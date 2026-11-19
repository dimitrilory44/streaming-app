package io.github.dimitrilory44.streamingexplorer.application;

import io.github.dimitrilory44.streamingexplorer.domain.model.Genre;
import io.github.dimitrilory44.streamingexplorer.domain.model.MediaType;
import io.github.dimitrilory44.streamingexplorer.domain.port.in.GetGenresUseCase;
import io.github.dimitrilory44.streamingexplorer.domain.port.out.LoadGenresPort;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

public class GenreServiceTest {

    // Données de test : 35 (Comédie) est commun aux deux listes
    private static final Genre ACTION   = new Genre(28, "Action");
    private static final Genre COMEDIE  = new Genre(35, "Comédie");
    private static final Genre DRAME    = new Genre(18, "Drame");
    private static final Genre ACTION_ADVENTURE = new Genre(10759, "Action & Adventure");
    private static final Genre EPOUVANTE = new Genre(27, "Épouvante");
    private static final Genre FANTASTIQUE = new Genre(14, "Fantastique");

    private static final List<Genre> MOVIE_GENRES = List.of(DRAME, ACTION, COMEDIE);
    private static final List<Genre> TV_GENRES    = List.of(COMEDIE, ACTION_ADVENTURE);

    // Faux port de sortie : un simple lambda
    private final LoadGenresPort fakePort = mediaType -> switch (mediaType) {
        case MOVIE -> MOVIE_GENRES;
        case TV    -> TV_GENRES;
    };

    private final GetGenresUseCase service = new GenreService(fakePort);

    @Test
    void shouldThrow_whenMediaTypesIsNull() {
        assertThrows(IllegalArgumentException.class,
                () -> service.getGenres(null));
    }

    @Test
    void shouldThrow_whenMediaTypesIsEmpty() {
        assertThrows(IllegalArgumentException.class,
                () -> service.getGenres(Set.of()));
    }

    @Test
    void shouldReturnOnlyMovieGenres_whenOnlyMovieIsRequested() {
        assertThat(service.getGenres(Set.of(MediaType.MOVIE)))
                .containsExactlyInAnyOrder(DRAME, ACTION, COMEDIE);
    }

    @Test
    void shouldMergeGenresWithoutDuplicates_whenMovieAndTvAreRequested() {
        List<Genre> result = service.getGenres(Set.of(MediaType.MOVIE, MediaType.TV));
        assertThat(result).containsExactlyInAnyOrder(DRAME, ACTION, COMEDIE, ACTION_ADVENTURE);
    }

    @Test
    void shouldReturnGenresSortedByName() {
        LoadGenresPort portWithAccents = mediaType -> List.of(EPOUVANTE, DRAME, ACTION, COMEDIE, FANTASTIQUE);
        GetGenresUseCase serviceWithAccents = new GenreService(portWithAccents);

        List<Genre> result = serviceWithAccents.getGenres(Set.of(MediaType.MOVIE));
        assertThat(result).containsExactly(ACTION, COMEDIE, DRAME, EPOUVANTE, FANTASTIQUE);
    }
}
