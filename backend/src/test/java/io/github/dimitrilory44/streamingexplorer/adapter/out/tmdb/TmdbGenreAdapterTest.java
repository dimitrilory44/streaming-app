package io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb;

import io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb.config.TmdbParamsProperties;
import io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb.config.TmdbProperties;
import io.github.dimitrilory44.streamingexplorer.domain.model.Genre;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static io.github.dimitrilory44.streamingexplorer.domain.model.MediaType.MOVIE;

public class TmdbGenreAdapterTest {
    private static final String BASE_URL = "https://api.themoviedb.org/3";
    private static final String IMAGE_URL = "https://image.tmdb.org/t/p";

    private MockRestServiceServer server;
    private TmdbGenreAdapter adapter;

    @BeforeEach
    void setUp() {
        // 1. Un builder, auquel on lie le faux serveur AVANT de construire le client
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(BASE_URL)
                .defaultHeaders(headers -> headers.setBearerAuth("fake-token"));
        server = MockRestServiceServer.bindTo(builder).build();

        // 2. Des propriétés de test
        TmdbProperties properties = new TmdbProperties(
                "fake-token",
                BASE_URL,
                new TmdbParamsProperties("fr-FR", "FR"),
                IMAGE_URL);

        // 3. L'adaptateur, avec le client lié au faux serveur
        adapter = new TmdbGenreAdapter(builder.build(), properties);
    }

    @Test
    void shouldCallTmdbAndConvertGenres_whenMovieIsRequested() {
        server.expect(requestTo(BASE_URL + "/genre/movie/list?language=fr-FR"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer fake-token"))
                .andRespond(withSuccess(
                        """
                                { "genres": [ { "id": 28, "name": "Action" } ] }
                                """,
                        MediaType.APPLICATION_JSON));

        List<Genre> genres = adapter.loadGenres(MOVIE);
        assertThat(genres).containsExactly(new Genre(28, "Action"));
        server.verify();
    }

    @Test
    void shouldReturnEmptyList_whenTmdbResponseHasNoGenres() {
        server.expect(requestTo(BASE_URL + "/genre/movie/list?language=fr-FR"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer fake-token"))
                .andRespond(withSuccess(
                        """
                                { "genres": [] }
                                """,
                        MediaType.APPLICATION_JSON));

        List<Genre> genres = adapter.loadGenres(MOVIE);
        assertThat(genres).isEmpty();
        server.verify();
    }

    @Test
    void shouldReturnEmptyList_whenTmdbGenresIsMissing() {
        server.expect(requestTo(BASE_URL + "/genre/movie/list?language=fr-FR"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer fake-token"))
                .andRespond(withSuccess(
                        """
                                { }
                                """,
                        MediaType.APPLICATION_JSON));

        List<Genre> genres = adapter.loadGenres(MOVIE);
        assertThat(genres).isEmpty();
        server.verify();
    }

    @Test
    void shouldThrowException_whenTmdbReturnsNotFound() {
        server.expect(requestTo(BASE_URL + "/genre/movie/list?language=fr-FR"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer fake-token"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThrows(RestClientResponseException.class, () -> adapter.loadGenres(MOVIE));
        server.verify();
    }
}
