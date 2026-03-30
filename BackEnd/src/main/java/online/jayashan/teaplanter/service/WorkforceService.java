package online.jayashan.teaplanter.service;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.Attendance;
import online.jayashan.teaplanter.entity.Leave;
import online.jayashan.teaplanter.entity.User;
import online.jayashan.teaplanter.entity.Worker;
import online.jayashan.teaplanter.repository.AttendanceRepository;
import online.jayashan.teaplanter.repository.LeaveRepository;
import online.jayashan.teaplanter.repository.WorkerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class WorkforceService {
    private final online.jayashan.teaplanter.repository.UserRepository userRepository;

    private final WorkerRepository workerRepository;
    private final AttendanceRepository attendanceRepository;
    
    // QR Code Management
    public Worker generateQrCode(Long workerId) {
        Worker worker = getWorkerById(workerId);
        if (worker.getQrCode() == null || worker.getQrCode().isEmpty()) {
            String qrCode = "TP-WORKER-" + workerId + "-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            worker.setQrCode(qrCode);
            return workerRepository.save(worker);
        }
        return worker;
    }

    @Transactional
    public Attendance markAttendanceByQr(String qrCode, Long plantationId) {
        log.info("Processing QR Attendance scan. QR: {}, PlantationId: {}", qrCode, plantationId);
        
        Worker worker = workerRepository.findByQrCode(qrCode)
                .orElseThrow(() -> {
                    log.error("Worker not found for QR: {}", qrCode);
                    return new RuntimeException("Invalid QR code. Worker not found.");
                });

        log.info("Worker found: {} (ID: {}). Assigned Plantation ID: {}", 
                worker.getUser().getName(), worker.getId(), worker.getPlantation().getId());

        if (!worker.getPlantation().getId().equals(plantationId)) {
            log.warn("Plantation mismatch! Worker's: {}, Scanner's: {}", 
                    worker.getPlantation().getId(), plantationId);
            throw new RuntimeException("Worker does not belong to this plantation.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = now.toLocalDate().atTime(23, 59, 59, 999999999);

        log.debug("Checking attendance for date: {}. Range: {} to {}", now.toLocalDate(), startOfDay, endOfDay);
        List<Attendance> existing = attendanceRepository.findByWorkerAndCheckInBetween(worker, startOfDay, endOfDay);

        if (existing.isEmpty()) {
            log.info("No existing attendance today. Performing Check-in for worker: {}", worker.getId());
            Attendance attendance = Attendance.builder()
                    .worker(worker)
                    .checkIn(now)
                    .status("Present")
                    .plantation(worker.getPlantation())
                    .build();
            return attendanceRepository.save(attendance);
        } else {
            Attendance attendance = existing.get(0);
            log.info("Existing attendance found (ID: {}). Check-in time: {}", attendance.getId(), attendance.getCheckIn());
            
            // Grace period: ignore duplicate scans within 10 seconds of check-in
            if (java.time.Duration.between(attendance.getCheckIn(), now).getSeconds() < 10) {
                log.info("Scan within 10s grace period of Check-in. Returning existing record to handle duplicate scans.");
                return attendance;
            }

            if (attendance.getCheckOut() != null) {
                // Grace period for check-out as well
                if (java.time.Duration.between(attendance.getCheckOut(), now).getSeconds() < 10) {
                    log.info("Scan within 10s grace period of Check-out. Returning existing record.");
                    return attendance;
                }
                log.warn("Attendance already completed for today (Check-out exists).");
                throw new RuntimeException("Attendance already completed for today.");
            }
            
            log.info("Performing Check-out for worker: {}", worker.getId());
            attendance.setCheckOut(now);
            return attendanceRepository.save(attendance);
        }
    }

    private final LeaveRepository leaveRepository;
    private final online.jayashan.teaplanter.repository.HarvestRepository harvestRepository;
    private final online.jayashan.teaplanter.repository.PayrollRepository payrollRepository;
    private final online.jayashan.teaplanter.repository.TaskRepository taskRepository;
    private final UserService userService;
    private final ClerkService clerkService;
    private final online.jayashan.teaplanter.repository.PlantationRepository plantationRepository;

    // Worker Management
    public Worker assignWorker(Long userId, Long plantationId, String workerFunctions, String pin, String assignedBlock) {
        User user = userService.getUserById(userId);

        // PIN Validation
        if (user.getPin() == null) {
            throw new RuntimeException(
                    "Target user has not set a security PIN yet. They must set it in Settings first.");
        }
        if (!user.getPin().equals(pin)) {
            throw new RuntimeException("Incorrect PIN provided for this user. Worker assignment failed.");
        }

        online.jayashan.teaplanter.entity.Plantation plantation = plantationRepository.findById(plantationId)
                .orElseThrow(() -> new RuntimeException("Plantation not found"));

        // Check if already assigned
        if (workerRepository.findByUserAndPlantation(user, plantation).isPresent()) {
            throw new RuntimeException("User already assigned to this plantation");
        }

        Worker worker = Worker.builder()
                .user(user)
                .plantation(plantation)
                .workerFunctions(workerFunctions)
                .assignedBlock(assignedBlock)
                .status("Active")
                .joinDate(java.time.LocalDate.now())
                .build();

        // Update roles based on assigned functions
        boolean isClerk = workerFunctions != null && workerFunctions.contains("Clerk");
        boolean changed = false;

        if (isClerk && !user.getRoles().contains(online.jayashan.teaplanter.entity.Role.CLERK)) {
            user.getRoles().add(online.jayashan.teaplanter.entity.Role.CLERK);
            changed = true;
            clerkService.updateUserMetadata(user.getClerkId(), "clerk", plantationId);
        } else if (!isClerk && !user.getRoles().contains(online.jayashan.teaplanter.entity.Role.WORKER)) {
            user.getRoles().add(online.jayashan.teaplanter.entity.Role.WORKER);
            changed = true;
            clerkService.updateUserMetadata(user.getClerkId(), "worker", plantationId);
        }

        if (user.getPlantation() == null || !user.getPlantation().getId().equals(plantationId)) {
            user.setPlantation(plantation);
            changed = true;
        }

        if (changed) {
            userRepository.save(user);
        }

        return workerRepository.save(worker);
    }

    public List<online.jayashan.teaplanter.entity.User> getAvailableUsers() {
        return userService.getAvailableUsers();
    }

    public List<Worker> getAllWorkers(Long plantationId) {
        if (plantationId != null) {
            return getWorkersByPlantation(plantationId);
        }
        return calculateMonthlyHarvest(workerRepository.findAll());
    }

    public List<Worker> getWorkersByPlantation(Long plantationId) {
        online.jayashan.teaplanter.entity.Plantation plantation = plantationRepository.findById(plantationId)
                .orElseThrow(() -> new RuntimeException("Plantation not found"));
        return calculateMonthlyHarvest(workerRepository.findByPlantation(plantation));
    }

    private List<Worker> calculateMonthlyHarvest(List<Worker> workers) {
        java.time.LocalDate now = java.time.LocalDate.now();
        java.time.LocalDate start = now.withDayOfMonth(1);
        java.time.LocalDate end = now.withDayOfMonth(now.lengthOfMonth());

        workers.forEach(worker -> {
            double monthlyTotal = harvestRepository.findByWorkerAndHarvestDateBetween(worker, start, end)
                    .stream()
                    .mapToDouble(h -> h.getNetWeight() != null ? h.getNetWeight() : 0.0)
                    .sum();
            worker.setMonthlyHarvest(monthlyTotal);
        });

        return workers;
    }

    public Worker getWorkerById(Long id) {
        return workerRepository.findById(id).orElseThrow(() -> new RuntimeException("Worker not found"));
    }

    public Worker updateWorker(Long id, Worker workerDetails) {
        Worker worker = getWorkerById(id);
        
        // Safety: Only update fields that can be changed through the profile edit
        // Do NOT overwrite user or plantation relationships as they are fixed on assignment
        if (workerDetails.getWorkerFunctions() != null) {
            worker.setWorkerFunctions(workerDetails.getWorkerFunctions());
            
            // Sync roles if "Clerk" status changed
            User user = worker.getUser();
            boolean currentlyClerk = user.getRoles().contains(online.jayashan.teaplanter.entity.Role.CLERK);
            boolean newIsClerk = workerDetails.getWorkerFunctions().contains("Clerk");
            
            if (newIsClerk && !currentlyClerk) {
                user.getRoles().add(online.jayashan.teaplanter.entity.Role.CLERK);
                userRepository.save(user);
                clerkService.updateUserMetadata(user.getClerkId(), "clerk", worker.getPlantation().getId());
            } else if (!newIsClerk && currentlyClerk) {
                // If they were a Clerk and are no longer, demote to worker
                user.getRoles().remove(online.jayashan.teaplanter.entity.Role.CLERK);
                if (!user.getRoles().contains(online.jayashan.teaplanter.entity.Role.WORKER)) {
                    user.getRoles().add(online.jayashan.teaplanter.entity.Role.WORKER);
                }
                userRepository.save(user);
                clerkService.updateUserMetadata(user.getClerkId(), "worker", worker.getPlantation().getId());
            }
        }
        if (workerDetails.getAssignedBlock() != null) {
            worker.setAssignedBlock(workerDetails.getAssignedBlock());
        }
        if (workerDetails.getStatus() != null) {
            worker.setStatus(workerDetails.getStatus());
        }
        if (workerDetails.getBaseSalary() != null) {
            worker.setBaseSalary(workerDetails.getBaseSalary());
        }
        
        return workerRepository.save(worker);
    }

    public void deactivateWorker(Long id) {
        Worker worker = getWorkerById(id);
        worker.setStatus("Inactive");
        workerRepository.save(worker);
    }

    @Transactional
    public void deleteWorker(Long id) {
        Worker worker = getWorkerById(id);

        // Delete all dependent records first to avoid foreign key violations
        attendanceRepository.deleteAll(attendanceRepository.findByWorker(worker));
        harvestRepository.deleteAll(harvestRepository.findByWorker(worker));
        taskRepository.deleteAll(taskRepository.findByAssignedWorker(worker));
        payrollRepository.deleteAll(payrollRepository.findByWorker(worker));
        leaveRepository.deleteAll(leaveRepository.findByWorker(worker));

        // Now safe to delete the worker
        workerRepository.delete(worker);
    }

    // Attendance Management
    public Attendance checkIn(Long workerId) {
        Worker worker = getWorkerById(workerId);

        // Validation: Prevent multiple attendance records for the same worker on the
        // same day
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59).withNano(999999999);

        List<Attendance> existing = attendanceRepository.findByWorkerAndCheckInBetween(worker, startOfDay, endOfDay);
        if (!existing.isEmpty()) {
            throw new RuntimeException("Worker already has an attendance record for today.");
        }

        Attendance attendance = Attendance.builder()
                .worker(worker)
                .checkIn(LocalDateTime.now())
                .status("Present")
                .plantation(worker.getPlantation())
                .build();
        return attendanceRepository.save(attendance);
    }

    public Attendance checkOut(Long attendanceId) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new RuntimeException("Attendance record not found"));
        attendance.setCheckOut(LocalDateTime.now());
        return attendanceRepository.save(attendance);
    }

    public Attendance recordManualAttendance(online.jayashan.teaplanter.dto.AttendanceRequestDTO dto) {
        Worker worker = getWorkerById(dto.getWorkerId());

        // Validation: Prevent multiple attendance records for the same worker on the
        // same day
        LocalDateTime startOfDay = dto.getCheckIn().toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = dto.getCheckIn().toLocalDate().atTime(23, 59, 59, 999999999);

        List<Attendance> existing = attendanceRepository.findByWorkerAndCheckInBetween(worker, startOfDay, endOfDay);
        if (!existing.isEmpty()) {
            throw new RuntimeException("Worker already has an attendance record for this date.");
        }

        Attendance attendance = Attendance.builder()
                .worker(worker)
                .checkIn(dto.getCheckIn())
                .checkOut(dto.getCheckOut())
                .status(dto.getStatus())
                .remarks(dto.getRemarks())
                .plantation(worker.getPlantation())
                .build();
        return attendanceRepository.save(attendance);
    }

    public Attendance updateAttendance(Long id, online.jayashan.teaplanter.dto.AttendanceRequestDTO dto) {
        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Attendance record not found"));
        Worker worker = getWorkerById(dto.getWorkerId());

        attendance.setWorker(worker);
        attendance.setCheckIn(dto.getCheckIn());
        attendance.setCheckOut(dto.getCheckOut());
        attendance.setStatus(dto.getStatus());
        attendance.setRemarks(dto.getRemarks());

        return attendanceRepository.save(attendance);
    }

    public void deleteAttendance(Long id) {
        attendanceRepository.deleteById(id);
    }

    public List<Attendance> getAllAttendance(Long plantationId) {
        if (plantationId != null) {
            online.jayashan.teaplanter.entity.Plantation plantation = plantationRepository.findById(plantationId)
                    .orElseThrow(() -> new RuntimeException("Plantation not found"));
            return attendanceRepository.findByPlantation(plantation);
        }
        return attendanceRepository.findAll();
    }

    public List<Attendance> getAttendanceByWorker(Long workerId) {
        Worker worker = getWorkerById(workerId);
        return attendanceRepository.findByWorker(worker);
    }

    // Leave Management
    public Leave requestLeave(Leave leaveRequest) {
        leaveRequest.setStatus("PENDING");
        return leaveRepository.save(leaveRequest);
    }

    public Leave approveLeave(Long leaveId, String status) {
        Leave leave = leaveRepository.findById(leaveId)
                .orElseThrow(() -> new RuntimeException("Leave record not found"));
        leave.setStatus(status);
        return leaveRepository.save(leave);
    }

    public List<Leave> getLeavesByWorker(Long workerId) {
        Worker worker = getWorkerById(workerId);
        return leaveRepository.findByWorker(worker);
    }

    public List<Leave> getLeavesByPlantation(Long plantationId) {
        online.jayashan.teaplanter.entity.Plantation plantation = plantationRepository.findById(plantationId)
                .orElseThrow(() -> new RuntimeException("Plantation not found"));
        return leaveRepository.findByPlantation(plantation);
    }

    public List<Leave> getAllLeaves(Long plantationId) {
        if (plantationId != null) {
            return getLeavesByPlantation(plantationId);
        }
        return leaveRepository.findAll();
    }
}
