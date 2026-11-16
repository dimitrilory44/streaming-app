package io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(TmdbProperties.class)
public class TmdbConfiguration {

    @Bean
    public RestClient tmdbRestClient(TmdbProperties tmdbProperties, RestClient.Builder restClientBuilder) {
        return restClientBuilder.baseUrl(tmdbProperties.baseUrl())
                .defaultHeaders(headers -> headers.setBearerAuth(tmdbProperties.apiToken()))
                .build();
    }

}
