package io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "tmdb")
@Validated
public record TmdbProperties(
    @NotBlank String apiToken,
    @NotBlank @URL String baseUrl,
    @NotBlank @URL String imageBaseUrl
) {}
