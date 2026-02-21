package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.Factory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FactoryRepository extends JpaRepository<Factory, Long> {
    List<Factory> findByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);
}
