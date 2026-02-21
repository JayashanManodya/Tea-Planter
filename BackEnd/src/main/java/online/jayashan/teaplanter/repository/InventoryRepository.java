package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryRepository extends JpaRepository<InventoryItem, Long> {
    java.util.List<online.jayashan.teaplanter.entity.InventoryItem> findByPlantation(
            online.jayashan.teaplanter.entity.Plantation plantation);
}
