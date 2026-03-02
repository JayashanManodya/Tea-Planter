package online.teaplanter.backend.repository;

import online.teaplanter.backend.entity.FactoryPaysheet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FactoryPaysheetRepository extends JpaRepository<FactoryPaysheet, Long> {
    List<FactoryPaysheet> findByDateMonthAndDateYear(Integer month, Integer year);

    List<FactoryPaysheet> findByPlantation(online.teaplanter.backend.entity.Plantation plantation);
}
