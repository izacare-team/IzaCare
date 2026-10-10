package com.izacare.inventory;

import jakarta.validation.constraints.Min;

/**
 * 입고 요청.
 * - 기존 품목: itemId 지정
 * - 신규 품목: itemId 없이 newItemName(+분류/단위/최소수량) 지정 → 등록과 동시에 입고
 */
public record InboundRequest(
        Long itemId,
        String newItemName,
        String category,
        String unit,
        @Min(0) int minQuantity,
        @Min(1) int quantity,
        String note) {}
