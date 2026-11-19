package io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.DefaultUriBuilderFactory;
import org.springframework.web.util.UriComponentsBuilder;

@Configuration
@EnableConfigurationProperties(TmdbProperties.class)
public class TmdbConfiguration {

    @Bean
    public RestClient tmdbRestClient(RestClient.Builder builder, TmdbProperties tmdbProperties) {
        UriComponentsBuilder base = UriComponentsBuilder
                .fromUriString(tmdbProperties.baseUrl())
                .queryParam("language", tmdbProperties.params().language())
                .queryParam("region", tmdbProperties.params().region());

        DefaultUriBuilderFactory factory = new DefaultUriBuilderFactory(base);

        return builder
                .uriBuilderFactory(factory)
                .defaultHeaders(headers -> headers.setBearerAuth(tmdbProperties.apiToken()))
                .build();
    }

}
