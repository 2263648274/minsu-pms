FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:17-jre-jammy
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system pms \
    && useradd --system --gid pms --home-dir /app pms
WORKDIR /app
COPY --from=build /build/target/pms-backend.jar /app/pms-backend.jar
USER pms
EXPOSE 8090 8091
ENTRYPOINT ["java", "-jar", "/app/pms-backend.jar"]
