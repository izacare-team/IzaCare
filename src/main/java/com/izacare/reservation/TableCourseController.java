package com.izacare.reservation;

import com.izacare.member.Member;
import com.izacare.store.StoreInfo;
import com.izacare.store.StoreInfoService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * 테이블 · 코스 관리 (사장님 전용) — 가게 설정 화면의 테이블 구성과 코스 메뉴 영역.
 * 예약 기록이 걸린 테이블은 지우지 않고 감추며, 변경 후에는 가게 설정 전체(StoreInfo)를 돌려준다.
 */
@RestController
@RequestMapping("/api/store")
@Transactional
public class TableCourseController {

    private final StoreInfoService storeInfoService;
    private final DiningTableRepository tableRepository;
    private final ReservationRepository reservationRepository;
    private final CourseRepository courseRepository;

    public TableCourseController(StoreInfoService storeInfoService,
                                 DiningTableRepository tableRepository,
                                 ReservationRepository reservationRepository,
                                 CourseRepository courseRepository) {
        this.storeInfoService = storeInfoService;
        this.tableRepository = tableRepository;
        this.reservationRepository = reservationRepository;
        this.courseRepository = courseRepository;
    }

    private Member me(HttpServletRequest request) {
        return (Member) request.getAttribute("loginMember");
    }

    public record TableAddRequest(@Min(1) int number, @Min(1) int capacity) {}
    public record CourseAddRequest(@NotBlank String name, Integer durationMinutes, Boolean unlimitedRefill) {}

    /**
     * 테이블 추가. 같은 번호를 예전에 치운 적이 있으면 그 행을 새 정원으로 되살린다 —
     * (store_id, tableNumber) 유니크 제약 때문에 새 행을 넣을 수 없기도 하고,
     * 그렇게 해야 그 번호를 쓰던 지난 예약 기록도 그대로 이어진다.
     */
    @PostMapping("/tables")
    @ResponseStatus(HttpStatus.CREATED)
    public StoreInfo addTable(@Valid @RequestBody TableAddRequest req, HttpServletRequest request) {
        storeInfoService.requireOwner(me(request));
        Long storeId = me(request).getStoreId();
        DiningTable existing = tableRepository
                .findByStoreIdAndTableNumber(storeId, req.number()).orElse(null);

        if (existing != null) {
            if (existing.isActive()) {
                throw new IllegalArgumentException(req.number() + "번 테이블이 이미 있습니다.");
            }
            existing.reactivate(req.capacity());
        } else {
            tableRepository.save(new DiningTable(storeId, req.number(), req.capacity()));
        }
        return storeInfoService.info(me(request));
    }

    /**
     * 테이블 삭제.
     * 사용중인 예약이 걸려 있으면 거부하고, 지난 예약 기록만 있으면 목록에서 감춘다.
     * 예약 기록이 아예 없을 때만 행을 지운다.
     */
    @DeleteMapping("/tables/{id}")
    public StoreInfo removeTable(@PathVariable Long id, HttpServletRequest request) {
        storeInfoService.requireOwner(me(request));
        DiningTable t = tableRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("테이블을 찾을 수 없습니다."));
        Long storeId = me(request).getStoreId();
        if (!t.getStoreId().equals(storeId)) {
            throw new IllegalArgumentException("우리 가게 테이블이 아닙니다.");
        }
        if (reservationRepository.existsByStoreIdAndStatusAndTables_Id(
                storeId, Reservation.Status.ACTIVE, t.getId())) {
            throw new IllegalStateException(t.getTableNumber()
                    + "번 테이블은 사용중인 예약이 있어 삭제할 수 없습니다. 공석 처리 후 다시 시도해 주세요.");
        }
        if (reservationRepository.existsByTables_Id(t.getId())) {
            t.deactivate();   // 지난 예약이 참조하므로 행은 남기고 목록에서만 감춘다
        } else {
            tableRepository.delete(t);
        }
        return storeInfoService.info(me(request));
    }

    @PostMapping("/courses")
    @ResponseStatus(HttpStatus.CREATED)
    public StoreInfo addCourse(@Valid @RequestBody CourseAddRequest req, HttpServletRequest request) {
        storeInfoService.requireOwner(me(request));
        Long storeId = me(request).getStoreId();
        String name = req.name().trim();
        if (courseRepository.existsByStoreIdAndName(storeId, name)) {
            throw new IllegalArgumentException("이미 있는 코스입니다: " + name);
        }
        Integer duration = req.durationMinutes() == null || req.durationMinutes() <= 0 ? null : req.durationMinutes();
        boolean refill = Boolean.TRUE.equals(req.unlimitedRefill());
        courseRepository.save(new Course(storeId, name, duration, refill));
        return storeInfoService.info(me(request));
    }

    @DeleteMapping("/courses/{id}")
    public StoreInfo removeCourse(@PathVariable Long id, HttpServletRequest request) {
        storeInfoService.requireOwner(me(request));
        Course c = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("코스를 찾을 수 없습니다."));
        if (!c.getStoreId().equals(me(request).getStoreId())) {
            throw new IllegalArgumentException("우리 가게 코스가 아닙니다.");
        }
        courseRepository.delete(c);
        return storeInfoService.info(me(request));
    }
}
