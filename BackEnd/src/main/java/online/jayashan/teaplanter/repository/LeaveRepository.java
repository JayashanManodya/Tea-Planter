package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.Leave;
import online.jayashan.teaplanter.entity.Worker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaveRepository extends JpaRepository<Leave, Long> {
    List<Leave> findByWorker(Worker worker);

    List<Leave> findByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);
}
