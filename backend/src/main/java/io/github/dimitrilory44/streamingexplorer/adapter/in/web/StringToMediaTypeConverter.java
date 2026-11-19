package io.github.dimitrilory44.streamingexplorer.adapter.in.web;

import io.github.dimitrilory44.streamingexplorer.domain.model.MediaType;
import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

@Component
public class StringToMediaTypeConverter implements Converter<String, MediaType> {

    @Override
    public MediaType convert(String source) {
        if (source == null) {
            return null;
        }
        try {
            return MediaType.valueOf(source.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid media type: " + source, e);
        }
    }
}
