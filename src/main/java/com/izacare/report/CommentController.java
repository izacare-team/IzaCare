package com.izacare.report;

import com.izacare.common.web.AccessDeniedException;
import com.izacare.member.Member;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 일보 댓글 수정·삭제·수정 이력 — 작성자 본인 또는 사장님만 고칠 수 있다 */
@RestController
@RequestMapping("/api/comments")
@Transactional
public class CommentController {

    private final ReportCommentRepository commentRepository;
    private final CommentHistoryRepository commentHistoryRepository;

    public CommentController(ReportCommentRepository commentRepository,
                             CommentHistoryRepository commentHistoryRepository) {
        this.commentRepository = commentRepository;
        this.commentHistoryRepository = commentHistoryRepository;
    }

    private Member loginMember(HttpServletRequest request) {
        return (Member) request.getAttribute("loginMember");
    }

    /** 댓글 수정 — 작성자 본인 또는 사장님. 고치기 전 내용은 이력으로 남긴다 */
    @PatchMapping("/{commentId}")
    public CommentResponse editComment(@PathVariable Long commentId,
                                       @Valid @RequestBody CommentRequest req,
                                       HttpServletRequest request) {
        Member me = loginMember(request);
        ReportComment comment = getComment(request, commentId);
        if (!comment.canBeModifiedBy(me)) {
            throw new AccessDeniedException("본인이 작성한 댓글만 수정할 수 있습니다.");
        }
        commentHistoryRepository.save(
                new CommentHistory(comment, comment.getContent(), me.getDisplayName()));
        comment.edit(req.content());
        return CommentResponse.from(comment);
    }

    @DeleteMapping("/{commentId}")
    public void deleteComment(@PathVariable Long commentId, HttpServletRequest request) {
        Member me = loginMember(request);
        ReportComment comment = getComment(request, commentId);
        if (!comment.canBeModifiedBy(me)) {
            throw new AccessDeniedException("본인이 작성한 댓글만 삭제할 수 있습니다.");
        }
        commentHistoryRepository.deleteByCommentId(commentId);
        commentRepository.delete(comment);
    }

    @GetMapping("/{commentId}/history")
    @Transactional(readOnly = true)
    public List<CommentHistoryResponse> commentHistory(@PathVariable Long commentId,
                                                       HttpServletRequest request) {
        getComment(request, commentId);   // 소유 검증
        return commentHistoryRepository.findByCommentIdOrderByEditedAtDesc(commentId)
                .stream().map(CommentHistoryResponse::from).toList();
    }

    /** 우리 가게 일보에 달린 댓글만 조회 — 다른 가게 댓글 id를 넘기면 찾을 수 없음 */
    private ReportComment getComment(HttpServletRequest request, Long commentId) {
        ReportComment c = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다: " + commentId));
        if (!c.getReport().getStoreId().equals(loginMember(request).getStoreId())) {
            throw new IllegalArgumentException("댓글을 찾을 수 없습니다: " + commentId);
        }
        return c;
    }
}
