package online.jayashan.teaplanter.controller;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.Task;
import online.jayashan.teaplanter.service.TaskService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    public Task createTask(@RequestBody online.jayashan.teaplanter.dto.TaskRequestDTO taskRequest) {
        return taskService.createTask(taskRequest);
    }

    @GetMapping
    public List<Task> getAllTasks(@RequestParam(required = false) String month,
            @RequestParam(required = false) Long plantationId) {
        java.time.LocalDate date = (month != null) ? java.time.LocalDate.parse(month + "-01") : null;
        return taskService.getAllTasks(date, plantationId);
    }

    @PutMapping("/{id}/status")
    public Task updateStatus(@PathVariable Long id, @RequestParam String status) {
        return taskService.updateTaskStatus(id, status);
    }

    @PutMapping("/{id}")
    public Task updateTask(@PathVariable Long id,
            @RequestBody online.jayashan.teaplanter.dto.TaskRequestDTO taskRequest) {
        return taskService.updateTask(id, taskRequest);
    }

    @GetMapping("/worker/{workerId}")
    public List<Task> getByWorker(@PathVariable Long workerId) {
        return taskService.getTasksByWorker(workerId);
    }

    @DeleteMapping("/{id}")
    public void deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
    }
}
