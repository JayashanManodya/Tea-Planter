package online.jayashan.teaplanter.controller;

import online.jayashan.teaplanter.dto.WorkerDashboardDTO;
import online.jayashan.teaplanter.entity.*;
import online.jayashan.teaplanter.repository.*;
import online.jayashan.teaplanter.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@RequestMapping("/api/worker")
@CrossOrigin(origins = "*")
public class WorkerController {

    @Autowired
    private WorkerRepository workerRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private HarvestRepository harvestRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private PayrollRepository payrollRepository;

    @Autowired
    private UserService userService;

    @GetMapping("/plantations")
    public ResponseEntity<?> getWorkerPlantations(@RequestHeader("X-User-Clerk-Id") String clerkId) {
        try {
            User user = userService.getUserByClerkId(clerkId);
            List<Worker> workers = workerRepository.findByUser(user);

            List<Map<String, Object>> plantations = workers.stream()
                    .filter(w -> w.getPlantation() != null)
                    .map(w -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", w.getPlantation().getId());
                        map.put("name", w.getPlantation().getName());
                        map.put("location", w.getPlantation().getLocation());
                        map.put("workerId", w.getId());
                        map.put("qrCode", w.getQrCode());
                        return map;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(plantations);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching plantations: " + e.getMessage());
        }
    }

    @GetMapping("/dashboard/{plantationId}")
    public ResponseEntity<?> getWorkerDashboard(
            @RequestHeader("X-User-Clerk-Id") String clerkId,
            @PathVariable Long plantationId) {
        try {
            User user = userService.getUserByClerkId(clerkId);

            // Find the worker record for this user and plantation
            Worker worker = workerRepository.findByUser(user).stream()
                    .filter(w -> w.getPlantation() != null && w.getPlantation().getId().equals(plantationId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Worker not found for this plantation"));

            Plantation plantation = worker.getPlantation();

            // Get current month data
            YearMonth currentMonth = YearMonth.now();
            LocalDate monthStart = currentMonth.atDay(1);
            LocalDate monthEnd = currentMonth.atEndOfMonth();

            // Fetch tasks
            List<Task> tasks = taskRepository.findByAssignedWorkerAndPlantation(worker, plantation);
            int pendingTasks = (int) tasks.stream()
                    .filter(t -> "ASSIGNED".equals(t.getStatus()) || "IN_PROGRESS".equals(t.getStatus())).count();
            int completedTasks = (int) tasks.stream().filter(t -> "COMPLETED".equals(t.getStatus())).count();

            // Fetch harvests for current month
            List<Harvest> harvests = harvestRepository.findByWorkerAndPlantation(worker, plantation);
            double totalHarvestWeight = harvests.stream()
                    .filter(h -> !h.getHarvestDate().isBefore(monthStart) && !h.getHarvestDate().isAfter(monthEnd))
                    .mapToDouble(Harvest::getNetWeight)
                    .sum();

            // Fetch payroll for current month
            List<Payroll> payrolls = payrollRepository.findByWorkerAndPlantation(worker, plantation);
            double monthlyEarnings = payrolls.stream()
                    .filter(p -> !p.getMonth().isBefore(monthStart) && !p.getMonth().isAfter(monthEnd))
                    .mapToDouble(Payroll::getNetPay)
                    .sum();

            // Fetch attendance for current month
            List<Attendance> attendances = attendanceRepository.findByWorkerAndPlantation(worker, plantation);
            int attendanceDays = (int) attendances.stream()
                    .filter(a -> {
                        LocalDate checkInDate = a.getCheckIn().toLocalDate();
                        return !checkInDate.isBefore(monthStart) && !checkInDate.isAfter(monthEnd);
                    })
                    .count();

            WorkerDashboardDTO dashboard = WorkerDashboardDTO.builder()
                    .plantationId(plantation.getId())
                    .plantationName(plantation.getName())
                    .pendingTasks(pendingTasks)
                    .completedTasks(completedTasks)
                    .totalHarvestWeight(totalHarvestWeight)
                    .monthlyEarnings(monthlyEarnings)
                    .attendanceDays(attendanceDays)
                    .qrCode(worker.getQrCode())
                    .workerId(worker.getId())
                    .build();

            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching dashboard: " + e.getMessage());
        }
    }

    @GetMapping("/tasks/{plantationId}")
    public ResponseEntity<?> getWorkerTasks(
            @RequestHeader("X-User-Clerk-Id") String clerkId,
            @PathVariable Long plantationId) {
        try {
            User user = userService.getUserByClerkId(clerkId);
            Worker worker = workerRepository.findByUser(user).stream()
                    .filter(w -> w.getPlantation() != null && w.getPlantation().getId().equals(plantationId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Worker not found for this plantation"));

            List<Task> tasks = taskRepository.findByAssignedWorkerAndPlantation(worker, worker.getPlantation());
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching tasks: " + e.getMessage());
        }
    }

    @GetMapping("/harvests/{plantationId}")
    public ResponseEntity<?> getWorkerHarvests(
            @RequestHeader("X-User-Clerk-Id") String clerkId,
            @PathVariable Long plantationId,
            @RequestParam(required = false) String month) {
        try {
            User user = userService.getUserByClerkId(clerkId);
            Worker worker = workerRepository.findByUser(user).stream()
                    .filter(w -> w.getPlantation() != null && w.getPlantation().getId().equals(plantationId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Worker not found for this plantation"));

            List<Harvest> harvests = harvestRepository.findByWorkerAndPlantation(worker, worker.getPlantation());

            // Filter by month if provided
            if (month != null && !month.isEmpty()) {
                YearMonth yearMonth = YearMonth.parse(month);
                LocalDate monthStart = yearMonth.atDay(1);
                LocalDate monthEnd = yearMonth.atEndOfMonth();
                harvests = harvests.stream()
                        .filter(h -> !h.getHarvestDate().isBefore(monthStart) && !h.getHarvestDate().isAfter(monthEnd))
                        .collect(Collectors.toList());
            }

            return ResponseEntity.ok(harvests);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching harvests: " + e.getMessage());
        }
    }

    @GetMapping("/attendance/{plantationId}")
    public ResponseEntity<?> getWorkerAttendance(
            @RequestHeader("X-User-Clerk-Id") String clerkId,
            @PathVariable Long plantationId,
            @RequestParam(required = false) String month) {
        try {
            User user = userService.getUserByClerkId(clerkId);
            Worker worker = workerRepository.findByUser(user).stream()
                    .filter(w -> w.getPlantation() != null && w.getPlantation().getId().equals(plantationId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Worker not found for this plantation"));

            List<Attendance> attendances = attendanceRepository.findByWorkerAndPlantation(worker,
                    worker.getPlantation());

            // Filter by month if provided
            if (month != null && !month.isEmpty()) {
                YearMonth yearMonth = YearMonth.parse(month);
                LocalDate monthStart = yearMonth.atDay(1);
                LocalDate monthEnd = yearMonth.atEndOfMonth();
                attendances = attendances.stream()
                        .filter(a -> {
                            LocalDate checkInDate = a.getCheckIn().toLocalDate();
                            return !checkInDate.isBefore(monthStart) && !checkInDate.isAfter(monthEnd);
                        })
                        .collect(Collectors.toList());
            }

            return ResponseEntity.ok(attendances);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching attendance: " + e.getMessage());
        }
    }

    @GetMapping("/payroll/{plantationId}")
    public ResponseEntity<?> getWorkerPayroll(
            @RequestHeader("X-User-Clerk-Id") String clerkId,
            @PathVariable Long plantationId,
            @RequestParam(required = false) String month) {
        try {
            User user = userService.getUserByClerkId(clerkId);
            Worker worker = workerRepository.findByUser(user).stream()
                    .filter(w -> w.getPlantation() != null && w.getPlantation().getId().equals(plantationId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Worker not found for this plantation"));

            List<Payroll> payrolls = payrollRepository.findByWorkerAndPlantation(worker, worker.getPlantation());

            // Filter by month if provided
            if (month != null && !month.isEmpty()) {
                YearMonth yearMonth = YearMonth.parse(month);
                LocalDate monthStart = yearMonth.atDay(1);
                LocalDate monthEnd = yearMonth.atEndOfMonth();
                payrolls = payrolls.stream()
                        .filter(p -> !p.getMonth().isBefore(monthStart) && !p.getMonth().isAfter(monthEnd))
                        .collect(Collectors.toList());
            }

            return ResponseEntity.ok(payrolls);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching payroll: " + e.getMessage());
        }
    }

    @PutMapping("/tasks/{taskId}/status")
    public ResponseEntity<?> updateTaskStatus(
            @RequestHeader("X-User-Clerk-Id") String clerkId,
            @PathVariable Long taskId,
            @RequestBody Map<String, String> body) {
        try {
            User user = userService.getUserByClerkId(clerkId);
            Task task = taskRepository.findById(taskId)
                    .orElseThrow(() -> new RuntimeException("Task not found"));

            // Verify the task is assigned to this worker
            if (task.getAssignedWorker() == null ||
                    !task.getAssignedWorker().getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body("Not authorized to update this task");
            }

            String newStatus = body.get("status");
            task.setStatus(newStatus);

            if ("COMPLETED".equals(newStatus)) {
                task.setCompletedAt(java.time.LocalDateTime.now());
            }

            taskRepository.save(task);
            return ResponseEntity.ok(task);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error updating task: " + e.getMessage());
        }
    }
}
