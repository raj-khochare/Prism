package com.prism.prism_Backend.config;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.PropertyNamingStrategies;

//@Configuration
//public class JacksonConfig {
//    @Bean
//    public JsonMapperBuilderCustomizer snakeCaseCustomizer() {
//        return builder -> builder.propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
//    }
//}