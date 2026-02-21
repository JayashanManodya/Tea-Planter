package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.Attendance;
import online.jayashan.teaplanter.entity.Worker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findByWorker(Worker worker);

    List<Attendance> findByWorkerAndCheckInBetween(Worker worker, java.time.LocalDateTime start,
            java.time.LocalDateTime end);

    List<Attendance> findByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);

    List<Attendance> findByWorkerAndPlantation(Worker worker, online.jayashan.teaplanter.entity.Plantation plantation);
}
