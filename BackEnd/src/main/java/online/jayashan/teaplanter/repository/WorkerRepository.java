package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.Worker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkerRepository extends JpaRepository<Worker, Long> {
    List<Worker> findByStatus(String status);

    java.util.Optional<Worker> findByUserAndPlantation(online.jayashan.teaplanter.entity.User user,
            online.jayashan.teaplanter.entity.Plantation plantation);

    List<Worker> findByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);
    
    java.util.Optional<Worker> findByQrCode(String qrCode);

    List<Worker> findByUser(online.jayashan.teaplanter.entity.User user);
}
