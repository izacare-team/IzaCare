package com.izacare.report;

import java.time.LocalDateTime;

public record CommentResponse(Long id, String author, String content,
                              LocalDateTime createdAt, LocalDateTime editedAt) {
    static CommentResponse from(ReportComment c) {
        return new CommentResponse(c.getId(), c.getAuthor(), c.getContent(),
                c.getCreatedAt(), c.getEditedAt());
    }
}
