package online.jayashan.teaplanter.controller;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.Attendance;
import online.jayashan.teaplanter.entity.Leave;
import online.jayashan.teaplanter.entity.Worker;
import online.jayashan.teaplanter.service.WorkforceService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workforce")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WorkforceController {

    private final WorkforceService workforceService;

    @PostMapping("/workers/assign")
    public Worker assignWorker(@RequestParam Long userId, @RequestParam Long plantationId,
            @RequestParam String functions, @RequestParam String pin,
            @RequestParam(required = false) String assignedBlock) {
        return workforceService.assignWorker(userId, plantationId, functions, pin, assignedBlock);
    }

    @GetMapping("/users/available")
    public List<online.jayashan.teaplanter.entity.User> getAvailableUsers() {
        return workforceService.getAvailableUsers();
    }

    @GetMapping("/workers")
    public List<Worker> getAllWorkers(@RequestParam(required = false) Long plantationId) {
        return workforceService.getAllWorkers(plantationId);
    }

    @PutMapping("/workers/{id}")
    public Worker updateWorker(@PathVariable Long id, @RequestBody Worker worker) {
        return workforceService.updateWorker(id, worker);
    }

    @DeleteMapping("/workers/{id}")
    public void deactivateWorker(@PathVariable Long id) {
        workforceService.deactivateWorker(id);
    }

    @DeleteMapping("/workers/{id}/permanent")
    public void deleteWorker(@PathVariable Long id) {
        workforceService.deleteWorker(id);
    }

    @PostMapping("/attendance/check-in/{workerId}")
    public Attendance checkIn(@PathVariable Long workerId) {
        return workforceService.checkIn(workerId);
    }

    @PostMapping("/attendance/check-out/{attendanceId}")
    public Attendance checkOut(@PathVariable Long attendanceId) {
        return workforceService.checkOut(attendanceId);
    }

    @PostMapping("/attendance/scan")
    public Attendance markAttendanceByQr(@RequestParam String qrCode, @RequestParam Long plantationId) {
        return workforceService.markAttendanceByQr(qrCode, plantationId);
    }

    @PostMapping("/workers/{id}/generate-qr")
    public Worker generateQrCode(@PathVariable Long id) {
        return workforceService.generateQrCode(id);
    }

    @GetMapping("/attendance")
    public List<Attendance> getAllAttendance(@RequestParam(required = false) Long plantationId) {
        return workforceService.getAllAttendance(plantationId);
    }

    @GetMapping("/attendance/worker/{workerId}")
    public List<Attendance> getAttendanceByWorker(@PathVariable Long workerId) {
        return workforceService.getAttendanceByWorker(workerId);
    }

    @PostMapping("/attendance/manual")
    public Attendance recordManualAttendance(
            @RequestBody online.jayashan.teaplanter.dto.AttendanceRequestDTO attendanceRequest) {
        return workforceService.recordManualAttendance(attendanceRequest);
    }

    @PutMapping("/attendance/{id}")
    public Attendance updateAttendance(@PathVariable Long id,
            @RequestBody online.jayashan.teaplanter.dto.AttendanceRequestDTO attendanceRequest) {
        return workforceService.updateAttendance(id, attendanceRequest);
    }

    @DeleteMapping("/attendance/{id}")
    public void deleteAttendance(@PathVariable Long id) {
        workforceService.deleteAttendance(id);
    }

    @PostMapping("/leaves")
    public Leave requestLeave(@RequestBody Leave leave) {
        return workforceService.requestLeave(leave);
    }

    @PutMapping("/leaves/{id}/status")
    public Leave approveLeave(@PathVariable Long id, @RequestParam String status) {
        return workforceService.approveLeave(id, status);
    }

    @GetMapping("/leaves/worker/{workerId}")
    public List<Leave> getLeavesByWorker(@PathVariable Long workerId) {
        return workforceService.getLeavesByWorker(workerId);
    }

    @GetMapping("/leaves")
    public List<Leave> getAllLeaves(@RequestParam(required = false) Long plantationId) {
        return workforceService.getAllLeaves(plantationId);
    }
}
