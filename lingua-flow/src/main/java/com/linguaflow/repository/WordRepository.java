package com.linguaflow.repository;

import com.linguaflow.entity.Word;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface WordRepository extends JpaRepository<Word, Long> {
    // Метод для перевірки, чи є вже таке слово в базі
    Optional<Word> findByOriginalIgnoreCase(String original);
}

