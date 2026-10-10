package com.izacare.attendance;

import com.izacare.common.web.ClientIpResolver;
import com.izacare.member.Member;
import com.izacare.store.StoreInfo;
import com.izacare.store.StoreInfoService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * 출근 위치 확인 기준 설정 (사장님 전용) — 가게 설정 화면의 '출근 위치 확인' 영역.
 * 매장 좌표·반경과 매장 Wi-Fi 공인 IP를 정한다. 변경 후에는 가게 설정 전체(StoreInfo)를 돌려준다.
 */
@RestController
@RequestMapping("/api/store")
@Transactional
public class AttendanceLocationController {

    private final StoreInfoService storeInfoService;
    private final ClientIpResolver clientIpResolver;

    public AttendanceLocationController(StoreInfoService storeInfoService, ClientIpResolver clientIpResolver) {
        this.storeInfoService = storeInfoService;
        this.clientIpResolver = clientIpResolver;
    }

    private Member me(HttpServletRequest request) {
        return (Member) request.getAttribute("loginMember");
    }

    public record LocationUpdate(@NotNull Double latitude, @NotNull Double longitude, Integer radius) {}

    /** 사장님이 매장에서 "현재 위치로 설정"을 눌렀을 때 — 그 좌표가 매장 기준점이 된다 */
    @PatchMapping("/attendance-location")
    public StoreInfo setAttendanceLocation(@Valid @RequestBody LocationUpdate req,
                                           HttpServletRequest request) {
        storeInfoService.requireOwner(me(request));
        storeInfoService.storeOf(me(request)).setAttendanceLocation(req.latitude(), req.longitude(), req.radius());
        return storeInfoService.info(me(request));
    }

    /** 매장 Wi-Fi에서 이 버튼을 눌러야 한다 — 지금 접속한 공인 IP를 매장 IP로 등록한다 */
    @PostMapping("/attendance-ip")
    public StoreInfo setAttendanceIp(HttpServletRequest request) {
        storeInfoService.requireOwner(me(request));
        storeInfoService.storeOf(me(request)).setAllowedIp(clientIpResolver.resolve(request));
        return storeInfoService.info(me(request));
    }

    @DeleteMapping("/attendance-ip")
    public StoreInfo clearAttendanceIp(HttpServletRequest request) {
        storeInfoService.requireOwner(me(request));
        storeInfoService.storeOf(me(request)).setAllowedIp(null);
        return storeInfoService.info(me(request));
    }
}
