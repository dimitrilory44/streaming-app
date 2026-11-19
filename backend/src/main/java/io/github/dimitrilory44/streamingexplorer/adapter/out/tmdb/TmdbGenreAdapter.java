package io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb;

import io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb.config.TmdbProperties;
import io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb.dto.TmdbGenreListResponse;
import io.github.dimitrilory44.streamingexplorer.domain.model.Genre;
import io.github.dimitrilory44.streamingexplorer.domain.model.MediaType;
import io.github.dimitrilory44.streamingexplorer.domain.port.out.LoadGenresPort;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

@Component
public class TmdbGenreAdapter implements LoadGenresPort {
    private final RestClient tmdbRestClient;
    private final TmdbProperties tmdbProperties;

    public TmdbGenreAdapter(RestClient tmdbRestClient, TmdbProperties tmdbProperties) {
        this.tmdbRestClient = tmdbRestClient;
        this.tmdbProperties = tmdbProperties;
    }

    @Override
    public List<Genre> loadGenres(MediaType mediaType) {
        String path = switch (mediaType) {
            case MOVIE -> "/genre/movie/list";
            case TV -> "/genre/tv/list";
        };

        TmdbGenreListResponse response = tmdbRestClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path(path)
                        .queryParam("language", tmdbProperties.params().language())
                        .build())
                .retrieve()
                .body(TmdbGenreListResponse.class);

        if (response == null || response.genres() == null) {
            return List.of();
        }

        return response.genres().stream()
                .map(genreDto -> new Genre(genreDto.id(), genreDto.name()))
                .toList();
    }

}
