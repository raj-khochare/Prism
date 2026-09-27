FROM openjdk:22-jdk
ADD build/libs/prism-backend.jar prism-backend.jar
ENTRYPOINT ["java", "-jar", "/prism-backend.jar"]