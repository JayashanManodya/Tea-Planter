package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.Plot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlotRepository extends JpaRepository<Plot, Long> {
    java.util.Optional<Plot> findByBlockIdAndPlantation(String blockId, online.jayashan.teaplanter.entity.Plantation plantation);

    boolean existsByBlockIdAndPlantation(String blockId, online.jayashan.teaplanter.entity.Plantation plantation);

    List<Plot> findByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);

    void deleteByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);
}
