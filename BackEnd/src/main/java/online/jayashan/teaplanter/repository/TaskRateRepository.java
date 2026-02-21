package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.TaskRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRateRepository extends JpaRepository<TaskRate, Long> {
    Optional<TaskRate> findByCategory(String category);

    java.util.List<TaskRate> findByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);
}
