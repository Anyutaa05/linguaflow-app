package com.linguaflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "words")
@Getter
@Setter
public class Word {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String original;

    @Column(nullable = false)
    private String translation;

    // Додаємо це поле.
    // За замовчуванням ставимо "General", щоб база не сварилася
    @Column(name = "category")
    private String category = "General";

    public Word() {}

    public Word(String original, String translation) {
        this.original = original;
        this.translation = translation;
        this.category = "General";
    }
}