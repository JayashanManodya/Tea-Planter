package online.teaplanter.backend.service;

import lombok.RequiredArgsConstructor;
import online.teaplanter.backend.entity.Task;
import online.teaplanter.backend.entity.Worker;
import online.teaplanter.backend.repository.TaskRepository;
import online.teaplanter.backend.repository.WorkerRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final WorkerRepository workerRepository;
    private final online.teaplanter.backend.repository.TaskRateRepository taskRateRepository;
    private final online.teaplanter.backend.repository.PlantationRepository plantationRepository;

    public Task createTask(online.jayashan.teaplanter.dto.TaskRequestDTO dto) {
        Worker worker = null;
        if (dto.getWorkerId() != null) {
            worker = workerRepository.findById(dto.getWorkerId())
                    .orElseThrow(() -> new RuntimeException("Worker not found"));
        }

        Task.TaskBuilder taskBuilder = Task.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .assignedWorker(worker)
                .priority(dto.getPriority())
                .plotId(dto.getPlotId())
                .status("ASSIGNED")
                .createdAt(LocalDateTime.now())
                .taskDate(dto.getTaskDate() != null ? java.time.LocalDate.parse(dto.getTaskDate())
                        : java.time.LocalDate.now())
                .taskCategory(dto.getTaskCategory());

        if (dto.getPlantationId() != null) {
            plantationRepository.findById(dto.getPlantationId()).ifPresent(taskBuilder::plantation);
        } else if (worker != null) {
            taskBuilder.plantation(worker.getPlantation());
        }

        return taskRepository.save(taskBuilder.build());
    }

    public List<Task> getAllTasks(java.time.LocalDate month, Long plantationId) {
        java.time.LocalDate start = month != null ? month.withDayOfMonth(1) : null;
        java.time.LocalDate end = month != null ? month.withDayOfMonth(month.lengthOfMonth()) : null;

        if (plantationId != null) {
            online.teaplanter.backend.entity.Plantation plantation = plantationRepository.findById(plantationId)
                    .orElseThrow(() -> new RuntimeException("Plantation not found"));
            if (month != null) {
                return taskRepository.findByPlantation(plantation).stream()
                        .filter(t -> !t.getTaskDate().isBefore(start) && !t.getTaskDate().isAfter(end))
                        .collect(java.util.stream.Collectors.toList());
            }
            return taskRepository.findByPlantation(plantation);
        }

        if (month == null) {
            return taskRepository.findAll();
        }
        return taskRepository.findByTaskDateBetween(start, end);
    }

    public List<Task> getTasksByWorker(Long workerId) {
        Worker worker = workerRepository.findById(workerId)
                .orElseThrow(() -> new RuntimeException("Worker not found"));
        return taskRepository.findByAssignedWorker(worker);
    }

    public Task updateTaskStatus(Long id, String status) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        task.setStatus(status);
        if ("COMPLETED".equals(status)) {
            task.setCompletedAt(LocalDateTime.now());
            // Set payment amount from current rate snapshot
            if (task.getTaskCategory() != null) {
                double rate = taskRateRepository.findByCategory(task.getTaskCategory().trim().toUpperCase())
                        .map(online.teaplanter.backend.entity.TaskRate::getRate)
                        .orElse(0.0);
                task.setPaymentAmount(rate);
            }
        }
        return taskRepository.save(task);
    }

    public Task updateTask(Long id, online.jayashan.teaplanter.dto.TaskRequestDTO dto) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (dto.getWorkerId() != null) {
            Worker worker = workerRepository.findById(dto.getWorkerId())
                    .orElseThrow(() -> new RuntimeException("Worker not found"));
            task.setAssignedWorker(worker);
        } else {
            task.setAssignedWorker(null);
        }

        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        task.setPriority(dto.getPriority());
        task.setPlotId(dto.getPlotId());
        task.setTaskCategory(dto.getTaskCategory());
        if (dto.getTaskDate() != null) {
            task.setTaskDate(java.time.LocalDate.parse(dto.getTaskDate()));
        }

        return taskRepository.save(task);
    }

    public void deleteTask(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        taskRepository.delete(task);
    }
}