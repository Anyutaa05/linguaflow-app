package com.linguaflow.service;

import com.linguaflow.entity.User;
import com.linguaflow.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // Spring сам передасть сюди базу даних та шифрувальник
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Метод реєстрації
    public User registerUser(String email, String rawPassword) {
        // Перевіряємо, чи є вже такий email
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Користувач з таким email вже існує!");
        }

        User newUser = new User();
        newUser.setEmail(email);
        // Зберігаємо не чистий пароль, а зашифрований!
        newUser.setPassword(passwordEncoder.encode(rawPassword));
        newUser.setXp(0);

        return userRepository.save(newUser);
    }

    // Метод входу
    public boolean login(String email, String rawPassword) {
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            // Порівнюємо введений пароль із зашифрованим у базі
            return passwordEncoder.matches(rawPassword, user.getPassword());
        }
        return false;
    }
}
