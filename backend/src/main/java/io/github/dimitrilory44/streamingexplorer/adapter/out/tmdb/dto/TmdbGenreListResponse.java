package io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb.dto;

import java.util.List;

public record TmdbGenreListResponse(
    List<TmdbGenre> genres
) {}
