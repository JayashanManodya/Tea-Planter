<<<<<<< Updated upstream
package online.teaplanter.backend.repository;

import online.teaplanter.backend.entity.Payroll;
import online.teaplanter.backend.entity.Worker;
=======
package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.Payroll;
import online.jayashan.teaplanter.entity.Worker;
>>>>>>> Stashed changes
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayrollRepository extends JpaRepository<Payroll, Long> {
    List<Payroll> findByWorker(Worker worker);

    List<Payroll> findByStatus(String status);

    List<Payroll> findByMonthBetween(java.time.LocalDate start, java.time.LocalDate end);

<<<<<<< Updated upstream
    List<Payroll> findByPlantation(online.teaplanter.backend.entity.Plantation plantation);

    List<Payroll> findByWorkerAndPlantation(Worker worker, online.teaplanter.backend.entity.Plantation plantation);
=======
    List<Payroll> findByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);

    List<Payroll> findByWorkerAndPlantation(Worker worker, online.jayashan.teaplanter.entity.Plantation plantation);
    
    boolean existsByWorkerAndMonth(Worker worker, java.time.LocalDate month);
    
    java.util.Optional<Payroll> findByWorkerAndMonth(Worker worker, java.time.LocalDate month);

    void deleteByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);
>>>>>>> Stashed changes
}
