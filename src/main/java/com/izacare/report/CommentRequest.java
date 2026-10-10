package com.izacare.report;

import jakarta.validation.constraints.NotBlank;

/** 댓글 작성·수정 요청 */
public record CommentRequest(@NotBlank String content) {}
