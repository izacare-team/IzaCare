package com.izacare.inventory;

import jakarta.validation.constraints.Min;

/**
 * 재고 목록에서 품목을 직접 고칠 때.
 * quantity는 변동량이 아니라 "고친 뒤 수량"이며, 둘 다 선택 항목이라 보낸 값만 반영된다.
 */
public record AdjustQuantityRequest(
        @Min(0) Integer quantity,
        @Min(0) Integer minQuantity,
        String note) {}
