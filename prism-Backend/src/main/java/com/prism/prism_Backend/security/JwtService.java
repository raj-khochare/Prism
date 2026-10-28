package com.prism.prism_Backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expiryMillis;
    //key generation
    public JwtService(@Value("${prism.auth.jwt-secret}") String secret,
                      @Value("${prism.auth.jwt-expiry-minutes}") long expiryMinutes){

        byte[] keyBytes = secret.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET_KEY must be at least 32 characters (e.g. `openssl rand -base64 48`).");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.expiryMillis = expiryMinutes * 60 * 1000;
    }

    //token generation
    public String generateToken(String username){
        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiryMillis))
                .signWith(key)
                .compact();
    }

    public Jws<Claims> parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token);
    }

}
