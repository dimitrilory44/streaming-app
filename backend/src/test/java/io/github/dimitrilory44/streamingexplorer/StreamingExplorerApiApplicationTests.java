package io.github.dimitrilory44.streamingexplorer;

import io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb.config.TmdbConfiguration;
import io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb.config.TmdbParamsProperties;
import io.github.dimitrilory44.streamingexplorer.adapter.out.tmdb.config.TmdbProperties;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@SpringBootTest
@ActiveProfiles("test")
class StreamingExplorerApiApplicationTests {

    @Test
    void contextLoads() {
    }

}
