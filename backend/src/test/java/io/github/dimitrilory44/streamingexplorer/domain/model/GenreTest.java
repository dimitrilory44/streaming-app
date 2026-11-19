package io.github.dimitrilory44.streamingexplorer.domain.model;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

public class GenreTest {

    @Test
    void shouldCreateGenre_whenIdAndNameAreValid() {
        Genre genre = new Genre(28, "Action");

        assertEquals(28, genre.id());
        assertEquals("Action", genre.name());
    }

    @Test
    void shouldThrow_whenIdIsNotPositive() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> new Genre(0, "Action")
        );

        assertTrue(exception.getMessage().contains("0"));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = { "  " })
    void shouldThrow_whenNameIsBlank(String invalidName) {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> new Genre(1, invalidName)
        );

        assertTrue(exception.getMessage().contains("null or blank"));
    }
}
