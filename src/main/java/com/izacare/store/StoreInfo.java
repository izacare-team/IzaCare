package com.izacare.store;

import java.time.LocalTime;
import java.util.List;

/**
 * 가게 설정 화면이 한 번에 받는 매장 정보.
 * 코드와 출근 위치 설정은 사장님에게만 채워서 내려준다.
 */
public record StoreInfo(String name, String code, LocalTime open, LocalTime close,
                        List<TableInfo> tables, List<CourseInfo> courses,
                        AttendanceLocation attendanceLocation) {

    public record TableInfo(Long id, int number, int capacity) {}

    public record CourseInfo(Long id, String name, Integer durationMinutes, boolean unlimitedRefill) {}

    /** 출근 위치 확인 설정 (사장님에게만 내려간다) */
    public record AttendanceLocation(Double latitude, Double longitude, int radius, String allowedIp) {}
}
