package io.github.dimitrilory44.streamingexplorer.adapter.in.web;

import io.github.dimitrilory44.streamingexplorer.adapter.in.web.dto.GenreResponse;
import io.github.dimitrilory44.streamingexplorer.domain.model.Genre;
import io.github.dimitrilory44.streamingexplorer.domain.model.MediaType;
import io.github.dimitrilory44.streamingexplorer.domain.port.in.GetGenresUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;


@RestController
@RequestMapping("/api/genres")
public class GenreController {

    private final GetGenresUseCase getGenresUseCase;

    public GenreController(GetGenresUseCase getGenresUseCase) {
        this.getGenresUseCase = getGenresUseCase;
    }

    @GetMapping
    public ResponseEntity<List<GenreResponse>> getGenres(@RequestParam(required = false) Set<MediaType> mediaType) {
        if (mediaType == null || mediaType.isEmpty()) {
            mediaType = EnumSet.allOf(MediaType.class);
        }
        List<Genre> genres = getGenresUseCase.getGenres(mediaType);

        return ResponseEntity.ok(genres.stream()
                .map(genre -> new GenreResponse(genre.id(), genre.name()))
                .toList());
    }

}
