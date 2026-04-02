package online.teaplanter.backend.repository;

import online.teaplanter.backend.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryRepository extends JpaRepository<InventoryItem, Long> {
    java.util.List<online.teaplanter.backend.entity.InventoryItem> findByPlantation(
            online.teaplanter.backend.entity.Plantation plantation);
}
