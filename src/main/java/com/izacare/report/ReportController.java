package com.izacare.report;

import com.izacare.member.Member;
import com.izacare.notification.Notification;
import com.izacare.notification.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** 일보 — 작성·조회·수정, 수정 이력, 일보에 달린 댓글 목록·작성 */
@RestController
@RequestMapping("/api/reports")
@Transactional
public class ReportController {

    private final DailyReportRepository reportRepository;
    private final ReportCommentRepository commentRepository;
    private final ReportHistoryRepository reportHistoryRepository;
    private final NotificationService notificationService;

    public ReportController(DailyReportRepository reportRepository,
                            ReportCommentRepository commentRepository,
                            ReportHistoryRepository reportHistoryRepository,
                            NotificationService notificationService) {
        this.reportRepository = reportRepository;
        this.commentRepository = commentRepository;
        this.reportHistoryRepository = reportHistoryRepository;
        this.notificationService = notificationService;
    }

    private Member loginMember(HttpServletRequest request) {
        return (Member) request.getAttribute("loginMember");
    }
    private Long sid(HttpServletRequest request) {
        return loginMember(request).getStoreId();
    }

    public record ReportRequest(@NotBlank String author, @NotNull LocalDate reportDate, String content) {}
    public record ReportEditRequest(@NotNull LocalDate reportDate,
                                    @NotBlank(message = "일보 내용을 입력해 주세요.") String content) {}
    public record ReportResponse(Long id, String author, LocalDate reportDate, String content,
                                 boolean edited, LocalDateTime editedAt) {
        static ReportResponse from(DailyReport r) {
            return new ReportResponse(r.getId(), r.getAuthor(), r.getReportDate(), r.getContent(),
                    r.isEdited(), r.getEditedAt());
        }
    }
    public record ReportHistoryResponse(Long id, String previousContent,
                                        LocalDate previousReportDate,
                                        String editedBy, LocalDateTime editedAt) {
        static ReportHistoryResponse from(ReportHistory h) {
            return new ReportHistoryResponse(h.getId(), h.getPreviousContent(),
                    h.getPreviousReportDate(), h.getEditedBy(), h.getEditedAt());
        }
    }

    private DailyReport getReport(HttpServletRequest request, Long id) {
        DailyReport r = reportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("일보를 찾을 수 없습니다: " + id));
        if (!r.getStoreId().equals(sid(request))) {
            throw new IllegalArgumentException("일보를 찾을 수 없습니다: " + id);
        }
        return r;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ReportResponse> reports(HttpServletRequest request) {
        return reportRepository.findByStoreIdOrderByReportDateDescIdDesc(sid(request))
                .stream().map(ReportResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ReportResponse report(@PathVariable Long id, HttpServletRequest request) {
        return ReportResponse.from(getReport(request, id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReportResponse createReport(@Valid @RequestBody ReportRequest req,
                                       HttpServletRequest request) {
        Member me = loginMember(request);
        DailyReport saved = reportRepository.save(
                new DailyReport(me.getStoreId(), req.author(), req.reportDate(), req.content()));

        notificationService.notifyAll(me.getStoreId(), Notification.Type.REPORT,
                req.author() + "님이 " + req.reportDate() + " 일보를 작성했습니다.", me);

        return ReportResponse.from(saved);
    }

    @PatchMapping("/{id}")
    public ReportResponse editReport(@PathVariable Long id,
                                     @Valid @RequestBody ReportEditRequest req,
                                     HttpServletRequest request) {
        Member me = loginMember(request);
        DailyReport report = getReport(request, id);
        if (!me.isOwner() && !report.getAuthor().equals(me.getDisplayName())) {
            throw new IllegalStateException("본인이 작성한 일보만 수정할 수 있습니다.");
        }
        reportHistoryRepository.save(new ReportHistory(report,
                report.getContent(), report.getReportDate(), me.getDisplayName()));
        report.edit(req.reportDate(), req.content());
        return ReportResponse.from(report);
    }

    @GetMapping("/{id}/history")
    @Transactional(readOnly = true)
    public List<ReportHistoryResponse> reportHistory(@PathVariable Long id, HttpServletRequest request) {
        getReport(request, id);   // 소유 검증
        return reportHistoryRepository.findByReportIdOrderByEditedAtDesc(id)
                .stream().map(ReportHistoryResponse::from).toList();
    }

    // ---- 일보에 달린 댓글 (일보의 하위 자원) ----

    @GetMapping("/{id}/comments")
    @Transactional(readOnly = true)
    public List<CommentResponse> comments(@PathVariable Long id, HttpServletRequest request) {
        getReport(request, id);   // 소유 검증
        return commentRepository.findByReportIdOrderByCreatedAtAsc(id)
                .stream().map(CommentResponse::from).toList();
    }

    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse addComment(@PathVariable Long id,
                                      @Valid @RequestBody CommentRequest req,
                                      HttpServletRequest request) {
        DailyReport report = getReport(request, id);
        ReportComment saved = commentRepository.save(new ReportComment(
                report, loginMember(request).getDisplayName(), req.content()));
        return CommentResponse.from(saved);
    }
}
