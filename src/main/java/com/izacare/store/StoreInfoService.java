package com.izacare.store;

import com.izacare.member.Member;
import com.izacare.reservation.CourseRepository;
import com.izacare.reservation.DiningTableRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 가게 설정 관련 API들이 공통으로 쓰는 조회.
 * 매장 정보 · 테이블/코스 · 출근 위치 설정 API가 모두 변경 후 같은 StoreInfo 를 돌려주기 때문에 한곳에 모았다.
 */
@Service
@Transactional
public class StoreInfoService {

    private final StoreRepository storeRepository;
    private final DiningTableRepository tableRepository;
    private final CourseRepository courseRepository;

    public StoreInfoService(StoreRepository storeRepository,
                            DiningTableRepository tableRepository,
                            CourseRepository courseRepository) {
        this.storeRepository = storeRepository;
        this.tableRepository = tableRepository;
        this.courseRepository = courseRepository;
    }

    /** 로그인한 사람의 매장 */
    public Store storeOf(Member me) {
        return storeRepository.findById(me.getStoreId())
                .orElseThrow(() -> new IllegalStateException("가게 정보를 찾을 수 없습니다."));
    }

    /** 사장님 전용 설정 — 직원이면 409 (화면설계서 상태 코드 표 참고) */
    public void requireOwner(Member me) {
        if (!me.isOwner()) throw new IllegalStateException("사장님만 사용할 수 있는 기능입니다.");
    }

    /** 가게 설정 화면 데이터 (코드·출근 위치는 사장님에게만) */
    public StoreInfo info(Member me) {
        Store s = storeOf(me);
        List<StoreInfo.TableInfo> tables = tableRepository.findByStoreIdAndActiveTrueOrderByTableNumberAsc(s.getId()).stream()
                .map(t -> new StoreInfo.TableInfo(t.getId(), t.getTableNumber(), t.getCapacity())).toList();
        List<StoreInfo.CourseInfo> courses = courseRepository.findByStoreIdOrderByIdAsc(s.getId()).stream()
                .map(c -> new StoreInfo.CourseInfo(c.getId(), c.getName(), c.getDurationMinutes(), c.isUnlimitedRefill()))
                .toList();
        boolean owner = me.isOwner();
        String code = owner ? s.getCode() : null;
        StoreInfo.AttendanceLocation location = owner
                ? new StoreInfo.AttendanceLocation(s.getLatitude(), s.getLongitude(),
                                                   s.getAttendanceRadius(), s.getAllowedIp())
                : null;
        return new StoreInfo(s.getName(), code, s.getBusinessOpen(), s.getBusinessClose(),
                tables, courses, location);
    }
}
