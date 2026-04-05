package com.linguaflow.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*") // ОБОВ'ЯЗКОВО ДЛЯ REACT!
public class UserController {

    // Ендпоінт для синхронізації загального прогресу
    @PutMapping("/{email}/sync")
    public ResponseEntity<?> syncProfile(@PathVariable String email, @RequestBody Object profileData) {
        // Поки що просто приймаємо запит, щоб React не видавав помилки в консолі
        System.out.println("Синхронізація профілю для: " + email);
        return ResponseEntity.ok().build();
    }

    // Ендпоінт для збереження прогресу карток (SRS)
    @PutMapping("/{email}/cards")
    public ResponseEntity<?> syncCards(@PathVariable String email, @RequestBody Object cardsData) {
        // Поки що просто приймаємо запит
        System.out.println("Синхронізація карток для: " + email);
        return ResponseEntity.ok().build();
    }
}