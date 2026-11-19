package io.github.dimitrilory44.streamingexplorer.application;

import io.github.dimitrilory44.streamingexplorer.domain.model.Genre;
import io.github.dimitrilory44.streamingexplorer.domain.model.MediaType;
import io.github.dimitrilory44.streamingexplorer.domain.port.in.GetGenresUseCase;
import io.github.dimitrilory44.streamingexplorer.domain.port.out.LoadGenresPort;
import org.springframework.stereotype.Service;

import java.text.Collator;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class GenreService implements GetGenresUseCase {

    private final LoadGenresPort loadGenresPort;

    private final Collator collator = Collator.getInstance(Locale.FRENCH);

    public GenreService(LoadGenresPort loadGenresPort) {
        this.loadGenresPort = loadGenresPort;
    }

    @Override
    public List<Genre> getGenres(Set<MediaType> mediaTypes) {
        if (mediaTypes == null || mediaTypes.isEmpty()) {
            throw new IllegalArgumentException("mediaTypes must not be null or empty");
        }

        return mediaTypes.stream()
                .flatMap(mediaType -> loadGenresPort.loadGenres(mediaType).stream())
                .distinct()
                .sorted(Comparator.comparing(Genre::name, collator))
                .toList();
    }
}
