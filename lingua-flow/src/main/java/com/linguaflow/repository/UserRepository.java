package com.linguaflow.repository;

import com.linguaflow.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Spring сам напише SQL запит для пошуку по email!
    Optional<User> findByEmail(String email);
}
