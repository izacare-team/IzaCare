package com.izacare.store;

import com.izacare.member.Member;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;

/** 가게 설정 (사장님 전용) — 가게 이름·영업시간, 코드 재발급 */
@RestController
@RequestMapping("/api/store")
@Transactional
public class StoreSettingController {

    private final StoreInfoService storeInfoService;
    private final StoreCodeGenerator codeGenerator;

    public StoreSettingController(StoreInfoService storeInfoService,
                                  StoreCodeGenerator codeGenerator) {
        this.storeInfoService = storeInfoService;
        this.codeGenerator = codeGenerator;
    }

    private Member me(HttpServletRequest request) {
        return (Member) request.getAttribute("loginMember");
    }

    public record StoreUpdate(@NotBlank String name, String open, String close) {}

    /** 내 가게 설정 조회 (코드는 사장님에게만) */
    @GetMapping
    @Transactional(readOnly = true)
    public StoreInfo info(HttpServletRequest request) {
        return storeInfoService.info(me(request));
    }

    @PatchMapping
    public StoreInfo update(@Valid @RequestBody StoreUpdate req, HttpServletRequest request) {
        storeInfoService.requireOwner(me(request));
        Store s = storeInfoService.storeOf(me(request));
        s.rename(req.name().trim());
        s.setBusinessHours(parse(req.open()), parse(req.close()));
        return storeInfoService.info(me(request));
    }

    /** 가게 코드 재발급 — 유출 시 이전 코드를 무효화한다 */
    @PostMapping("/regenerate-code")
    public StoreInfo regenerateCode(HttpServletRequest request) {
        storeInfoService.requireOwner(me(request));
        Store s = storeInfoService.storeOf(me(request));
        s.changeCode(codeGenerator.generateUnique());
        return storeInfoService.info(me(request));
    }

    private LocalTime parse(String hhmm) {
        return (hhmm == null || hhmm.isBlank()) ? null : LocalTime.parse(hhmm);
    }
}
