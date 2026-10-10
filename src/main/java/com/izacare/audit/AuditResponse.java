package com.izacare.audit;

import java.time.LocalDateTime;
import java.util.List;

public record AuditResponse(
        Long id, String status, String source,
        LocalDateTime createdAt, LocalDateTime confirmedAt,
        int imageCount, List<AuditLineResponse> lines) {

    public static AuditResponse from(StockAudit a) {
        return new AuditResponse(a.getId(), a.getStatus().name(), a.getSource(),
                a.getCreatedAt(), a.getConfirmedAt(),
                a.getImageFiles().size(),
                a.getLines().stream().map(AuditLineResponse::from).toList());
    }
}
