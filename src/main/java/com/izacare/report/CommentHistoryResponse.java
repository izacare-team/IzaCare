package com.izacare.report;

import java.time.LocalDateTime;

public record CommentHistoryResponse(Long id, String previousContent,
                                     String editedBy, LocalDateTime editedAt) {
    static CommentHistoryResponse from(CommentHistory h) {
        return new CommentHistoryResponse(h.getId(), h.getPreviousContent(),
                h.getEditedBy(), h.getEditedAt());
    }
}
