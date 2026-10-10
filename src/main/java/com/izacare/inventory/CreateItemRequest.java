package com.izacare.inventory;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record CreateItemRequest(
        @NotBlank String name,
        String category,
        String unit,
        @Min(0) int quantity,
        @Min(0) int minQuantity) {}
