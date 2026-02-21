package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.FactoryPaysheet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FactoryPaysheetRepository extends JpaRepository<FactoryPaysheet, Long> {
    List<FactoryPaysheet> findByDateMonthAndDateYear(Integer month, Integer year);

    List<FactoryPaysheet> findByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);
}
