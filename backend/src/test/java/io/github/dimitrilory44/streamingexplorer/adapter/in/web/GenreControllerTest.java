package io.github.dimitrilory44.streamingexplorer.adapter.in.web;

import io.github.dimitrilory44.streamingexplorer.domain.model.Genre;
import io.github.dimitrilory44.streamingexplorer.domain.model.MediaType;
import io.github.dimitrilory44.streamingexplorer.domain.port.in.GetGenresUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GenreController.class)
public class GenreControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GetGenresUseCase getGenresUseCase;

    @Test
    void shouldRequestAllMediaTypes_whenNoMediaTypeIsGiven() throws Exception {
        mockMvc.perform(get("/api/genres"))
                .andExpect(status().isOk());

        verify(getGenresUseCase).getGenres(Set.of(MediaType.MOVIE, MediaType.TV));
    }

    @Test
    void shouldConvertLowercaseValue_whenMediaTypeIsGiven() throws Exception {
        mockMvc.perform(get("/api/genres").param("mediaType", "movie"))
                .andExpect(status().isOk());

        verify(getGenresUseCase).getGenres(Set.of(MediaType.MOVIE));
    }

    @Test
    void shouldReturnGenresAsJson() throws Exception {
        when(getGenresUseCase.getGenres(anySet()))
                .thenReturn(List.of(new Genre(28, "Action"), new Genre(35, "Comédie")));

        mockMvc.perform(get("/api/genres"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(28))
                .andExpect(jsonPath("$[0].name").value("Action"))
                .andExpect(jsonPath("$[1].name").value("Comédie"));
    }

    @Test
    void shouldReturnBadRequest_whenMediaTypeIsUnknown() throws Exception {
        mockMvc.perform(get("/api/genres").param("mediaType", "unknown"))
                .andExpect(status().isBadRequest());
    }
}
