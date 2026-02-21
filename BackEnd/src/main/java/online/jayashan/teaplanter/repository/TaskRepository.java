package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.Task;
import online.jayashan.teaplanter.entity.Worker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByAssignedWorker(Worker worker);

    List<Task> findByStatus(String status);

    List<Task> findByAssignedWorkerAndCompletedAtBetween(Worker worker, java.time.LocalDateTime start,
            java.time.LocalDateTime end);

    List<Task> findByCreatedAtBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);

    List<Task> findByTaskDateBetween(java.time.LocalDate start, java.time.LocalDate end);

    List<Task> findByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);

    List<Task> findByAssignedWorkerAndPlantation(Worker worker,
            online.jayashan.teaplanter.entity.Plantation plantation);
}
