package io.github.dimitrilory44.streamingexplorer.domain.port.out;

import io.github.dimitrilory44.streamingexplorer.domain.model.Genre;
import io.github.dimitrilory44.streamingexplorer.domain.model.MediaType;

import java.util.List;

public interface LoadGenresPort {
    List<Genre> loadGenres(MediaType mediaType);
}
