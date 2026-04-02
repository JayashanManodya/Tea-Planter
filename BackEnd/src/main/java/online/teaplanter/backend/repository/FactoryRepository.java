<<<<<<< Updated upstream
package online.teaplanter.backend.repository;

import online.teaplanter.backend.entity.Factory;
=======
package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.Factory;
>>>>>>> Stashed changes
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FactoryRepository extends JpaRepository<Factory, Long> {
<<<<<<< Updated upstream
    List<Factory> findByPlantation(online.teaplanter.backend.entity.Plantation plantation);
=======
    List<Factory> findByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);

    void deleteByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);
>>>>>>> Stashed changes
}
