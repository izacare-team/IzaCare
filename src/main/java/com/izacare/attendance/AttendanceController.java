package com.izacare.attendance;

import com.izacare.common.web.ClientIpResolver;
import com.izacare.member.Member;
import com.izacare.store.Store;
import com.izacare.store.StoreRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/** 출퇴근 기록 — 근무일은 매장 영업일 기준, 출근 때만 위치를 확인한다 */
@RestController
@RequestMapping("/api/attendance")
@Transactional
public class AttendanceController {

    private final AttendanceRepository attendanceRepository;
    private final StoreRepository storeRepository;
    private final ClientIpResolver clientIpResolver;

    public AttendanceController(AttendanceRepository attendanceRepository,
                                StoreRepository storeRepository,
                                ClientIpResolver clientIpResolver) {
        this.attendanceRepository = attendanceRepository;
        this.storeRepository = storeRepository;
        this.clientIpResolver = clientIpResolver;
    }

    private Member loginMember(HttpServletRequest request) {
        return (Member) request.getAttribute("loginMember");
    }

    /** 위경도는 브라우저가 위치 권한을 줬을 때만 채워진다 — 없어도 출근은 정상 처리된다 */
    public record ClockRequest(@NotBlank String action, Double latitude, Double longitude) {}
    public record AttendanceResponse(Long id, String staffName, LocalDate workDate,
                                     LocalTime clockIn, LocalTime breakAt,
                                     LocalTime breakEnd, LocalTime clockOut,
                                     String locationCheck, Integer distanceMeters,
                                     String locationLabel) {
        static AttendanceResponse from(Attendance a) {
            return new AttendanceResponse(a.getId(), a.getStaffName(), a.getWorkDate(),
                    a.getClockIn(), a.getBreakAt(), a.getBreakEnd(), a.getClockOut(),
                    a.getClockInLocation() == null ? null : a.getClockInLocation().name(),
                    a.getClockInDistance(),
                    a.locationLabel());
        }
    }

    /**
     * 지금이 속한 영업일. 매장이 자정을 넘겨 영업하면 새벽 시간대는 아직 전날 근무다.
     * 매장을 못 찾는 예외적인 경우에만 달력 날짜로 물러선다.
     */
    private LocalDate businessToday(Long storeId) {
        return storeRepository.findById(storeId)
                .map(s -> s.businessDayOf(LocalDateTime.now()))
                .orElseGet(LocalDate::now);
    }

    @GetMapping("/today")
    @Transactional(readOnly = true)
    public AttendanceResponse todayAttendance(HttpServletRequest request) {
        Member me = loginMember(request);
        String name = me.getDisplayName();
        LocalDate workDate = businessToday(me.getStoreId());
        return attendanceRepository.findByStoreIdAndStaffNameAndWorkDate(me.getStoreId(), name, workDate)
                .map(AttendanceResponse::from)
                .orElse(new AttendanceResponse(null, name, workDate,
                        null, null, null, null, null, null, null));
    }

    @PostMapping("/clock")
    public AttendanceResponse clock(@Valid @RequestBody ClockRequest req,
                                    HttpServletRequest request) {
        Member me = loginMember(request);
        String name = me.getDisplayName();
        LocalDate workDate = businessToday(me.getStoreId());
        Attendance attendance = attendanceRepository
                .findByStoreIdAndStaffNameAndWorkDate(me.getStoreId(), name, workDate)
                .orElseGet(() -> attendanceRepository.save(
                        new Attendance(me.getStoreId(), name, workDate)));
        attendance.mark(req.action(), LocalTime.now().withSecond(0).withNano(0));

        if ("clock-in".equals(req.action())) {
            checkClockInLocation(attendance, me.getStoreId(), req, request);
        }
        return AttendanceResponse.from(attendance);
    }

    /** 그 영업일의 전 직원 근태 — 사장님이 깜빡한 기록을 찾아 고치는 화면용 */
    @GetMapping
    @Transactional(readOnly = true)
    public List<AttendanceResponse> attendanceByDate(@RequestParam LocalDate date, HttpServletRequest request) {
        Member me = loginMember(request);
        if (!me.isOwner()) throw new IllegalStateException("사장님만 조회할 수 있습니다.");
        return attendanceRepository.findByStoreIdAndWorkDate(me.getStoreId(), date)
                .stream().map(AttendanceResponse::from).toList();
    }

    public record AttendanceCorrectRequest(LocalTime clockIn, LocalTime breakAt,
                                           LocalTime breakEnd, LocalTime clockOut) {}

    /**
     * 퇴근을 깜빡한 기록 등을 사장님이 직접 고친다 — clock()의 mark()와 달리 순서 제약 없이
     * 네 시각을 한 번에 다시 쓴다. 값을 비우면 그 항목은 지워진다.
     */
    @PatchMapping("/{id}")
    public AttendanceResponse correctAttendance(@PathVariable Long id,
                                                @RequestBody AttendanceCorrectRequest req,
                                                HttpServletRequest request) {
        Member me = loginMember(request);
        if (!me.isOwner()) throw new IllegalStateException("사장님만 수정할 수 있습니다.");
        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("근태 기록을 찾을 수 없습니다: " + id));
        if (!attendance.getStoreId().equals(me.getStoreId())) {
            throw new IllegalArgumentException("근태 기록을 찾을 수 없습니다: " + id);
        }
        attendance.correct(req.clockIn(), req.breakAt(), req.breakEnd(), req.clockOut());
        return AttendanceResponse.from(attendance);
    }

    /**
     * 출근 위치 확인 — GPS 반경과 매장 Wi-Fi IP 중 하나라도 통과하면 정상으로 본다.
     * 실내에서는 GPS가 안 잡히고 LTE로 접속하면 IP가 안 맞으므로 서로의 빈틈을 메운다.
     * 어느 쪽도 통과 못 해도 출근은 막지 않고 기록만 남긴다.
     */
    private void checkClockInLocation(Attendance attendance, Long storeId,
                                      ClockRequest req, HttpServletRequest request) {
        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            attendance.recordClockInLocation(Attendance.LocationCheck.UNKNOWN, null);
            return;
        }
        Integer distance = (req.latitude() != null && req.longitude() != null)
                ? store.distanceMeters(req.latitude(), req.longitude())
                : null;

        Attendance.LocationCheck check;
        if (distance != null && store.isWithinRadius(distance)) {
            check = Attendance.LocationCheck.GPS_OK;
        } else if (store.matchesAllowedIp(clientIpResolver.resolve(request))) {
            check = Attendance.LocationCheck.IP_OK;
        } else if (distance != null) {
            check = Attendance.LocationCheck.OUTSIDE;
        } else {
            check = Attendance.LocationCheck.UNKNOWN;
        }
        attendance.recordClockInLocation(check, distance);
    }
}
