package com.linguaflow.controller;

import com.linguaflow.config.JwtUtil;
import com.linguaflow.dto.AuthRequest;
import com.linguaflow.dto.AuthResponse;
import com.linguaflow.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// @RestController означає, що цей клас повертає JSON, а не вікна
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*") // Дозволяє запити з будь-якого фронтенду
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    public AuthController(AuthService authService, JwtUtil jwtUtil) {
        this.authService = authService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody AuthRequest request) {
        try {
            authService.registerUser(request.getEmail(), request.getPassword());
            // Одразу генеруємо токен після реєстрації
            String token = jwtUtil.generateToken(request.getEmail());
            return ResponseEntity.ok(new AuthResponse(token, "Реєстрація успішна!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AuthResponse(null, e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
        boolean isSuccess = authService.login(request.getEmail(), request.getPassword());

        if (isSuccess) {
            String token = jwtUtil.generateToken(request.getEmail());
            return ResponseEntity.ok(new AuthResponse(token, "Вхід успішний!"));
        } else {
            return ResponseEntity.status(401).body(new AuthResponse(null, "Невірний email або пароль!"));
        }
    }
}
