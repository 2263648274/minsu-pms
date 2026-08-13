package com.xkzoom.pms.controller;

import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.dto.RateCalendarBatchRequest;
import com.xkzoom.pms.dto.RateCalendarUpsertRequest;
import com.xkzoom.pms.entity.RateCalendar;
import com.xkzoom.pms.service.RateCalendarService;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/rate-calendar")
@RequiredArgsConstructor
public class RateCalendarController {

    private final RateCalendarService service;

    @GetMapping
    public Result<List<RateCalendar>> query(
            @RequestParam Long roomTypeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long ratePlanId) {
        return Result.ok(service.query(roomTypeId, from, to, ratePlanId));
    }

    @PostMapping
    public Result<RateCalendar> upsert(@Valid @RequestBody RateCalendarUpsertRequest req) {
        return Result.ok(service.upsert(req));
    }

    @PostMapping("/batch")
    public Result<Integer> batch(@Valid @RequestBody RateCalendarBatchRequest req) {
        return Result.ok(service.batchUpdate(req));
    }
}