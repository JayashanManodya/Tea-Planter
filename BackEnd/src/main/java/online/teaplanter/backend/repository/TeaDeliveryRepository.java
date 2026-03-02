package online.teaplanter.backend.repository;

import online.teaplanter.backend.entity.TeaDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeaDeliveryRepository extends JpaRepository<TeaDelivery, Long> {
    List<TeaDelivery> findByFactoryId(Long factoryId);

    List<TeaDelivery> findByDeliveryDateBetween(java.time.LocalDate start, java.time.LocalDate end);

    List<TeaDelivery> findByDeliveryDate(java.time.LocalDate date);

    List<TeaDelivery> findByPlantation(online.teaplanter.backend.entity.Plantation plantation);
}
