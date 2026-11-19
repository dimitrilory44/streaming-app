package io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.validator.constraints.URL;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "tmdb")
@Validated
public record TmdbProperties(
    @NotBlank String apiToken,
    @NotBlank @URL String baseUrl,
    @NotNull @Valid TmdbParamsProperties params,
    @NotBlank @URL String imageBaseUrl
) {}
