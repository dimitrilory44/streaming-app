package io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb.config;

import jakarta.validation.constraints.NotBlank;

public record TmdbParamsProperties(
   @NotBlank String language,
   @NotBlank String region
) {}
