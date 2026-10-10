package com.izacare.inventory;

import java.time.LocalDateTime;

public record ItemResponse(
        Long id, String name, String category, String unit,
        int quantity, int minQuantity, boolean lowStock, LocalDateTime lastAuditedAt) {

    public static ItemResponse from(FoodItem i) {
        return new ItemResponse(i.getId(), i.getName(), i.getCategory(), i.getUnit(),
                i.getQuantity(), i.getMinQuantity(), i.isLowStock(), i.getLastAuditedAt());
    }
}
