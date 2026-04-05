package com.linguaflow.controller;

import com.linguaflow.entity.Word;
import com.linguaflow.repository.WordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/words")
@CrossOrigin(origins = "*")
public class WordController {

    @Autowired
    private WordRepository wordRepository;

    @GetMapping
    public List<Word> getAllWords() {
        return wordRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> addWord(@RequestBody Word word) {
        // 1. Валідація на дублікати
        if (wordRepository.findByOriginalIgnoreCase(word.getOriginal()).isPresent()) {
            return ResponseEntity.badRequest().body("Слово '" + word.getOriginal() + "' вже є у вашому словнику!");
        }

        // 2. Валідація на порожні поля
        if (word.getOriginal() == null || word.getOriginal().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Оригінал не може бути порожнім");
        }

        Word savedWord = wordRepository.save(word);
        return ResponseEntity.ok(savedWord);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteWord(@PathVariable Long id) {
        if (!wordRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        wordRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}

