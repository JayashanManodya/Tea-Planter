package online.teaplanter.backend.repository;

import online.teaplanter.backend.entity.Factory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FactoryRepository extends JpaRepository<Factory, Long> {
    List<Factory> findByPlantation(online.teaplanter.backend.entity.Plantation plantation);
}
