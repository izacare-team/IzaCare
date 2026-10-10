package com.izacare.web;

import com.izacare.domain.Course;
import com.izacare.domain.DiningTable;
import com.izacare.domain.Reservation;
import com.izacare.member.Member;
import com.izacare.notification.Notification;
import com.izacare.notification.NotificationService;
import com.izacare.repository.CourseRepository;
import com.izacare.repository.DiningTableRepository;
import com.izacare.repository.ReservationRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/** 예약 · 좌석 현황 — 모든 조회·저장은 로그인 회원의 가게(storeId)로 한정된다. */
@RestController
@RequestMapping("/api")
@Transactional
public class StoreController {

    private final DiningTableRepository tableRepository;
    private final ReservationRepository reservationRepository;
    private final CourseRepository courseRepository;
    private final NotificationService notificationService;

    public StoreController(DiningTableRepository tableRepository,
                           ReservationRepository reservationRepository,
                           CourseRepository courseRepository,
                           NotificationService notificationService) {
        this.tableRepository = tableRepository;
        this.reservationRepository = reservationRepository;
        this.courseRepository = courseRepository;
        this.notificationService = notificationService;
    }

    private Member loginMember(HttpServletRequest request) {
        return (Member) request.getAttribute("loginMember");
    }
    private Long sid(HttpServletRequest request) {
        return loginMember(request).getStoreId();
    }

    // ================= 예약 =================

    /** id=테이블 PK(선택·예약용), number=가게 내 표시번호 */
    public record TableResponse(Long id, int number, int capacity, boolean reserved) {}
    public record ReservationRequest(@NotNull LocalDate reserveDate, @NotBlank String timeSlot,
                                     @Min(1) int people, @NotNull List<Long> tableIds,
                                     String customerName, String courseName) {}
    public record ReservationResponse(Long id, LocalDate reserveDate, String timeSlot,
                                      int people, List<Integer> tableNumbers, int totalCapacity,
                                      String customerName, String courseName, Integer courseDurationMinutes,
                                      String status) {
        static ReservationResponse from(Reservation r) {
            return new ReservationResponse(r.getId(), r.getReserveDate(), r.getTimeSlot(),
                    r.getPeople(), r.tableNumbers(), r.totalCapacity(), r.getCustomerName(),
                    r.getCourseName(), r.getCourseDurationMinutes(), r.getStatus().name());
        }
    }

    private Reservation getReservation(HttpServletRequest request, Long id) {
        Reservation r = reservationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("예약을 찾을 수 없습니다: " + id));
        if (!r.getStoreId().equals(sid(request))) {
            throw new IllegalArgumentException("예약을 찾을 수 없습니다: " + id);
        }
        return r;
    }

    /**
     * 특정 날짜·시간의 테이블 현황 — 새로 받을 예약과 시간이 겹치는 사용중 예약이 있으면 사용중으로 본다.
     * courseName 을 주면 그 코스의 시간 제한으로 새 예약이 끝나는 시각을 잡는다.
     */
    @GetMapping("/tables")
    @Transactional(readOnly = true)
    public List<TableResponse> tables(@RequestParam LocalDate date, @RequestParam String timeSlot,
                                      @RequestParam(required = false) String courseName,
                                      HttpServletRequest request) {
        Long storeId = sid(request);
        LocalDateTime start = LocalDateTime.of(date, LocalTime.parse(timeSlot));
        Integer duration = courseDuration(storeId, courseName);
        LocalDateTime end = duration == null ? null : start.plusMinutes(duration);
        return tableRepository.findByStoreIdAndActiveTrueOrderByTableNumberAsc(storeId).stream()
                .map(t -> new TableResponse(t.getId(), t.getTableNumber(), t.getCapacity(),
                        isTableTaken(storeId, date, t.getId(), start, end)))
                .toList();
    }

    /** 코스의 시간 제한(분) — 코스 없이 예약이거나 시간 제한이 없는 코스면 null */
    private Integer courseDuration(Long storeId, String courseName) {
        if (courseName == null || courseName.isBlank()) return null;
        return courseRepository.findByStoreIdAndName(storeId, courseName)
                .map(Course::getDurationMinutes).orElse(null);
    }

    /** [start, end) 와 시간이 겹치는 사용중 예약이 이 테이블에 있는지 (end == null 이면 끝이 정해지지 않은 예약) */
    private boolean isTableTaken(Long storeId, LocalDate date, Long tableId,
                                 LocalDateTime start, LocalDateTime end) {
        return reservationRepository.findByStoreIdAndReserveDateAndStatusAndTables_Id(
                        storeId, date, Reservation.Status.ACTIVE, tableId).stream()
                .anyMatch(r -> r.overlaps(start, end));
    }

    @GetMapping("/reservations")
    @Transactional(readOnly = true)
    public List<ReservationResponse> reservations(@RequestParam LocalDate date, HttpServletRequest request) {
        return reservationRepository.findByStoreIdAndReserveDateOrderByTimeSlotAsc(sid(request), date)
                .stream().map(ReservationResponse::from).toList();
    }

    @GetMapping("/reservations/upcoming")
    @Transactional(readOnly = true)
    public List<ReservationResponse> upcomingReservations(HttpServletRequest request) {
        return reservationRepository
                .findByStoreIdAndReserveDateGreaterThanEqualOrderByReserveDateAscTimeSlotAsc(
                        sid(request), LocalDate.now())
                .stream().map(ReservationResponse::from).toList();
    }

    @GetMapping("/reservations/{id}")
    @Transactional(readOnly = true)
    public ReservationResponse reservationDetail(@PathVariable Long id, HttpServletRequest request) {
        return ReservationResponse.from(getReservation(request, id));
    }

    @GetMapping("/reservations/month")
    @Transactional(readOnly = true)
    public List<ReservationResponse> monthReservations(@RequestParam int year, @RequestParam int month,
                                                       HttpServletRequest request) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.plusMonths(1).minusDays(1);
        return reservationRepository
                .findByStoreIdAndReserveDateBetweenOrderByReserveDateAscTimeSlotAsc(sid(request), start, end)
                .stream().map(ReservationResponse::from).toList();
    }

    /** 예약 확정 — 다중 테이블(단체) 지원, 정원 합계 검증, 사용중 테이블 거절 */
    @PostMapping("/reservations")
    @ResponseStatus(HttpStatus.CREATED)
    public ReservationResponse reserve(@Valid @RequestBody ReservationRequest req,
                                       HttpServletRequest request) {
        Member me = loginMember(request);
        Long storeId = me.getStoreId();
        if (req.tableIds() == null || req.tableIds().isEmpty()) {
            throw new IllegalArgumentException("테이블을 1개 이상 선택해 주세요.");
        }

        Integer courseDuration = courseDuration(storeId, req.courseName());
        LocalDateTime start = LocalDateTime.of(req.reserveDate(), LocalTime.parse(req.timeSlot()));
        LocalDateTime end = courseDuration == null ? null : start.plusMinutes(courseDuration);

        List<DiningTable> tables = new ArrayList<>();
        for (Long tableId : req.tableIds()) {
            DiningTable t = tableRepository.findById(tableId)
                    .orElseThrow(() -> new IllegalArgumentException("테이블을 찾을 수 없습니다: " + tableId));
            if (!t.getStoreId().equals(storeId)) {
                throw new IllegalArgumentException("우리 가게 테이블이 아닙니다.");
            }
            if (!t.isActive()) {   // 화면에는 안 보이지만 id를 직접 넘기면 들어올 수 있다
                throw new IllegalArgumentException("치운 테이블입니다: " + t.getTableNumber() + "번");
            }
            if (isTableTaken(storeId, req.reserveDate(), tableId, start, end)) {
                throw new IllegalStateException(
                        t.getTableNumber() + "번 테이블은 그 시간에 사용중입니다. 공석 처리 후 다시 배정할 수 있습니다.");
            }
            tables.add(t);
        }

        int capacity = tables.stream().mapToInt(DiningTable::getCapacity).sum();
        if (req.people() > capacity) {
            throw new IllegalArgumentException("선택한 테이블 정원이 " + capacity
                    + "명입니다. 테이블을 더 선택해 주세요. (예약 인원 " + req.people() + "명)");
        }

        Reservation saved = reservationRepository.save(new Reservation(
                req.reserveDate(), req.timeSlot(), req.people(), tables, req.customerName(),
                req.courseName(), courseDuration));

        String tableLabel = tables.stream()
                .map(t -> String.valueOf(t.getTableNumber())).collect(Collectors.joining(", "));
        notificationService.notifyAll(storeId, Notification.Type.RESERVATION,
                "새 예약 · " + (saved.getCourseName() == null ? "" : saved.getCourseName() + " · ")
                        + req.reserveDate() + " " + req.timeSlot()
                        + " " + req.people() + "명 (테이블 " + tableLabel + ")"
                        + (req.customerName() == null || req.customerName().isBlank()
                           ? "" : " - " + req.customerName()),
                me);
        return ReservationResponse.from(saved);
    }

    @DeleteMapping("/reservations/{id}")
    public void cancelReservation(HttpServletRequest request, @PathVariable Long id){
        Reservation r = getReservation(request, id);
        // 공석 처리된 예약은 손님이 왔다 간 기록이다 — 취소(삭제)하면 방문 기록이 사라진다
        if (!r.isActive()) {
            throw new IllegalStateException("공석 처리된 예약은 취소할 수 없습니다.");
        }
        reservationRepository.delete(r);
    }

    /** 공석 처리 — 손님 퇴장 후 근무자가 테이블을 비운다 */
    @PostMapping("/reservations/{id}/release")
    public ReservationResponse release(@PathVariable Long id, HttpServletRequest request) {
        Reservation reservation = getReservation(request, id);
        reservation.release();
        return ReservationResponse.from(reservation);
    }
}
