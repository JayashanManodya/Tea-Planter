package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.Plot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlotRepository extends JpaRepository<Plot, Long> {
    Optional<Plot> findByBlockId(String blockId);

    List<Plot> findByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);
}
