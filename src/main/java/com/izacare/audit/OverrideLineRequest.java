package com.izacare.audit;

import jakarta.validation.constraints.Min;

/** 실사 라인 수량 수동 보정 */
public record OverrideLineRequest(@Min(0) int finalQuantity) {}
