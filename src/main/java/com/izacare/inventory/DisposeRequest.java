package com.izacare.inventory;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DisposeRequest(
        @NotNull Long itemId,
        @Min(1) int quantity,
        @NotBlank String reason) {}
