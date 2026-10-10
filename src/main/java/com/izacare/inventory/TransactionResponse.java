package com.izacare.inventory;

import java.time.LocalDateTime;

public record TransactionResponse(
        Long id, Long itemId, String itemName, String type,
        int quantityChange, int quantityAfter, String note, LocalDateTime createdAt) {

    public static TransactionResponse from(StockTransaction t) {
        return new TransactionResponse(t.getId(), t.getItem().getId(), t.getItem().getName(),
                t.getType().name(), t.getQuantityChange(), t.getQuantityAfter(),
                t.getNote(), t.getCreatedAt());
    }
}
