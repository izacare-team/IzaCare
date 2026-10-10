package com.izacare.notice;

import com.izacare.member.Member;
import com.izacare.notification.Notification;
import com.izacare.notification.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** 공지 — 등록·삭제는 사장님(인터셉터), 수정도 사장님, 확인 체크는 직원 */
@RestController
@RequestMapping("/api/notices")
@Transactional
public class NoticeController {

    private final NoticeRepository noticeRepository;
    private final NoticeAckRepository noticeAckRepository;
    private final NoticeHistoryRepository noticeHistoryRepository;
    private final NotificationService notificationService;

    public NoticeController(NoticeRepository noticeRepository,
                            NoticeAckRepository noticeAckRepository,
                            NoticeHistoryRepository noticeHistoryRepository,
                            NotificationService notificationService) {
        this.noticeRepository = noticeRepository;
        this.noticeAckRepository = noticeAckRepository;
        this.noticeHistoryRepository = noticeHistoryRepository;
        this.notificationService = notificationService;
    }

    private Member loginMember(HttpServletRequest request) {
        return (Member) request.getAttribute("loginMember");
    }
    private Long sid(HttpServletRequest request) {
        return loginMember(request).getStoreId();
    }

    public record NoticeRequest(@NotBlank String title, LocalDate eventDate) {}
    public record NoticeResponse(Long id, String title, LocalDate eventDate,
                                 boolean edited, LocalDateTime editedAt,
                                 int ackCount, boolean ackedByMe, List<String> ackedNames) {}
    public record NoticeHistoryResponse(Long id, String previousTitle,
                                        LocalDate previousEventDate,
                                        String editedBy, LocalDateTime editedAt) {
        static NoticeHistoryResponse from(NoticeHistory h) {
            return new NoticeHistoryResponse(h.getId(), h.getPreviousTitle(),
                    h.getPreviousEventDate(), h.getEditedBy(), h.getEditedAt());
        }
    }

    private NoticeResponse toNoticeResponse(Notice n, Member me) {
        List<NoticeAck> acks = noticeAckRepository.findByNoticeId(n.getId());
        return new NoticeResponse(n.getId(), n.getTitle(), n.getEventDate(),
                n.isEdited(), n.getEditedAt(),
                acks.size(),
                acks.stream().anyMatch(a -> a.getMember().getId().equals(me.getId())),
                acks.stream().map(a -> a.getMember().getDisplayName()).toList());
    }

    /** 내 가게 공지만 조회 — 다른 가게 id면 예외 */
    private Notice getNotice(HttpServletRequest request, Long id) {
        Notice n = noticeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("공지를 찾을 수 없습니다: " + id));
        if (!n.getStoreId().equals(sid(request))) {
            throw new IllegalArgumentException("공지를 찾을 수 없습니다: " + id);
        }
        return n;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<NoticeResponse> notices(HttpServletRequest request) {
        Member me = loginMember(request);
        return noticeRepository.findByStoreIdOrderByEventDateAsc(me.getStoreId())
                .stream().map(n -> toNoticeResponse(n, me)).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoticeResponse createNotice(@Valid @RequestBody NoticeRequest req,
                                       HttpServletRequest request) {
        Member me = loginMember(request);
        Notice saved = noticeRepository.save(new Notice(me.getStoreId(), req.title(), req.eventDate()));

        String preview = req.title().replaceAll("\\s+", " ").trim();
        if (preview.length() > 40) preview = preview.substring(0, 40) + "...";
        notificationService.notifyAll(me.getStoreId(), Notification.Type.NOTICE, "새 공지 · " + preview, me);

        return toNoticeResponse(saved, me);
    }

    @PatchMapping("/{id}")
    public NoticeResponse editNotice(@PathVariable Long id,
                                     @Valid @RequestBody NoticeRequest req,
                                     HttpServletRequest request) {
        Member me = loginMember(request);
        if (!me.isOwner()) throw new IllegalStateException("사장님만 공지를 수정할 수 있습니다.");
        Notice notice = getNotice(request, id);
        noticeHistoryRepository.save(new NoticeHistory(notice,
                notice.getTitle(), notice.getEventDate(), me.getDisplayName()));
        notice.edit(req.title(), req.eventDate());
        return toNoticeResponse(notice, me);
    }

    @GetMapping("/{id}/history")
    @Transactional(readOnly = true)
    public List<NoticeHistoryResponse> noticeHistory(@PathVariable Long id, HttpServletRequest request) {
        getNotice(request, id);   // 소유 검증
        return noticeHistoryRepository.findByNoticeIdOrderByEditedAtDesc(id)
                .stream().map(NoticeHistoryResponse::from).toList();
    }

    @DeleteMapping("/{id}")
    public void deleteNotice(@PathVariable Long id, HttpServletRequest request) {
        getNotice(request, id);   // 소유 검증
        noticeHistoryRepository.deleteByNoticeId(id);
        noticeAckRepository.deleteByNoticeId(id);
        noticeRepository.deleteById(id);
    }

    @PostMapping("/{id}/ack")
    public NoticeResponse ackNotice(@PathVariable Long id, HttpServletRequest request) {
        Member me = loginMember(request);
        // 공지는 사장님이 올리는 것이라 사장님 확인은 의미가 없고 확인 인원만 부풀린다
        if (me.isOwner()) throw new IllegalStateException("공지 확인은 직원만 할 수 있습니다.");
        Notice notice = getNotice(request, id);
        if (!noticeAckRepository.existsByNoticeIdAndMemberId(id, me.getId())) {
            noticeAckRepository.save(new NoticeAck(notice, me));
        }
        return toNoticeResponse(notice, me);
    }
}
