# syntax=docker/dockerfile:1.7

# ---- build stage -------------------------------------------------------------
# JDK 21 matches the Gradle toolchain in build.gradle.kts (it used to say 22 while
# this stage ran 21, forcing a JDK download inside the build).
FROM gradle:9-jdk21 AS build
WORKDIR /app

COPY build.gradle.kts settings.gradle.kts ./
COPY gradle ./gradle

RUN --mount=type=cache,target=/home/gradle/.gradle,sharing=locked \
    gradle dependencies --no-daemon || true

COPY . .
RUN --mount=type=cache,target=/home/gradle/.gradle,sharing=locked \
    gradle bootJar --no-daemon -x test

# ---- runtime stage -----------------------------------------------------------
# `openjdk:22-jdk` is a deprecated, unmaintained image. Temurin JRE is the small,
# supported replacement.
FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/build/libs/prism-backend.jar app.jar

ENV JAVA_TOOL_OPTIONS="-Duser.timezone=UTC"
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
