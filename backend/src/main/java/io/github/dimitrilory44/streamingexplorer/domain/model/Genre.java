package io.github.dimitrilory44.streamingexplorer.domain.model;

public record Genre(
     int id,
     String name
) {
    public Genre {
        if (id <= 0) {
            throw new IllegalArgumentException("Genre id cannot be 0 or negative");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Genre name cannot be null or blank");
        }
    }

}
