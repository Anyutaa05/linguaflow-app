package com.linguaflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import com.linguaflow.entity.Word;
import com.linguaflow.repository.WordRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class LinguaFlowApplication {

	public static void main(String[] args) {
		SpringApplication.run(LinguaFlowApplication.class, args);
	}

	@Bean
	CommandLineRunner initWords(WordRepository repository) {
		return args -> {
			// Перевіряємо, чи база порожня
			if (repository.count() == 0) {
				// Видаляємо null з конструктора, бо ID генерується автоматично
				// Використовуємо конструктор: Word(original, translation)
				repository.save(new Word("Apple", "Яблуко"));
				repository.save(new Word("Freedom", "Свобода"));
				repository.save(new Word("Development", "Розробка"));
				repository.save(new Word("Inspiration", "Натхнення"));
				repository.save(new Word("Success", "Успіх"));

				System.out.println("✅ Базові слова додані в базу даних!");
			}
		};
	}
}