package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.Payroll;
import online.jayashan.teaplanter.entity.Worker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayrollRepository extends JpaRepository<Payroll, Long> {
    List<Payroll> findByWorker(Worker worker);

    List<Payroll> findByStatus(String status);

    List<Payroll> findByMonthBetween(java.time.LocalDate start, java.time.LocalDate end);

    List<Payroll> findByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);

    List<Payroll> findByWorkerAndPlantation(Worker worker, online.jayashan.teaplanter.entity.Plantation plantation);
}
