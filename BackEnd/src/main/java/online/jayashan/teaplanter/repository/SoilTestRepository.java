package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.Plantation;
import online.jayashan.teaplanter.entity.Plot;
import online.jayashan.teaplanter.entity.SoilTest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SoilTestRepository extends JpaRepository<SoilTest, Long> {
    List<SoilTest> findByPlot(Plot plot);
}
