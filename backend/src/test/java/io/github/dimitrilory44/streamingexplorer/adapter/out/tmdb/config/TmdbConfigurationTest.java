package io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb.config;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

public class TmdbConfigurationTest {

    @Test
    void shouldSendDefaultParamsAndBearerToken() {
        // Arrange
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

        TmdbProperties props = new TmdbProperties(
                "test-token",
                "https://api.themoviedb.org/3",
                new TmdbParamsProperties("fr-FR", "FR"),
                "https://image.tmdb.org/t/p/"
        );
        RestClient client = new TmdbConfiguration().tmdbRestClient(builder, props);

        server.expect(requestTo(startsWith("https://api.themoviedb.org/3/movie/popular")))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-token"))
                .andRespond(withSuccess("{\"results\": []}", MediaType.APPLICATION_JSON));

        // Act
        client.get().uri("/movie/popular").retrieve().body(String.class);

        // Assert
        server.verify();
    }
}
