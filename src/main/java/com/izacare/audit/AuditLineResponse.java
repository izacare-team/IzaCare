package com.izacare.audit;

import com.izacare.inventory.FoodItem;

public record AuditLineResponse(
        Long id, Long itemId, String itemName, String recognizedName,
        int systemQuantity, int recognizedQuantity, int finalQuantity,
        int difference, double confidence, boolean unregistered) {

    public static AuditLineResponse from(AuditLine l) {
        FoodItem item = l.getItem();
        return new AuditLineResponse(
                l.getId(),
                item != null ? item.getId() : null,
                item != null ? item.getName() : null,
                l.getRecognizedName(),
                l.getSystemQuantity(),
                l.getRecognizedQuantity(),
                l.getFinalQuantity(),
                l.difference(),
                l.getConfidence(),
                item == null);
    }
}
