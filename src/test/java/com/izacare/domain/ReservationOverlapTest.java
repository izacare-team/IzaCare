package com.izacare.domain;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 예약 시간 겹침 판정 — 여기가 틀리면 같은 테이블에 손님이 겹치거나,
 * 비어 있는 테이블을 사용중으로 막아 예약을 못 받는다.
 */
class ReservationOverlapTest {

    private static final LocalDate 금요일 = LocalDate.of(2026, 10, 2);

    private Reservation reservation(String timeSlot, Integer durationMinutes) {
        DiningTable table = new DiningTable(1L, 1, 4);
        String course = durationMinutes == null ? null : "코스 (" + durationMinutes + "분)";
        return new Reservation(금요일, timeSlot, 2, List.of(table), "손님", course, durationMinutes);
    }

    private LocalDateTime at(int hour) {
        return LocalDateTime.of(금요일, LocalTime.of(hour, 0));
    }

    @Test
    void 이십시_예약이_있어도_십칠시_120분_코스는_잡힌다() {
        Reservation 이십시 = reservation("20:00", 120);
        assertThat(이십시.overlaps(at(17), at(19))).isFalse();
    }

    @Test
    void 코스가_끝나는_시각에_바로_다음_예약을_받을_수_있다() {
        Reservation 십칠시 = reservation("17:00", 120);
        assertThat(십칠시.overlaps(at(19), at(21))).isFalse();
    }

    @Test
    void 시간이_겹치면_막는다() {
        Reservation 십칠시 = reservation("17:00", 120);
        assertThat(십칠시.overlaps(at(18), at(20))).isTrue();
    }

    @Test
    void 끝이_정해지지_않은_기존_예약은_그_뒤_시간을_계속_막는다() {
        Reservation 코스없음 = reservation("17:00", null);
        assertThat(코스없음.overlaps(at(20), at(22))).isTrue();
        // 그 전 시간에 끝나는 예약은 받을 수 있다
        assertThat(reservation("19:00", null).overlaps(at(17), at(19))).isFalse();
    }

    @Test
    void 끝이_정해지지_않은_새_예약은_그_뒤에_잡힌_예약과_겹친다() {
        Reservation 이십시 = reservation("20:00", 120);
        assertThat(이십시.overlaps(at(17), null)).isTrue();
    }
}
