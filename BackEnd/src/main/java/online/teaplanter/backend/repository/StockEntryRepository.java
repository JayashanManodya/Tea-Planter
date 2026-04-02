package online.teaplanter.backend.repository;

import online.teaplanter.backend.entity.InventoryItem;
import online.teaplanter.backend.entity.StockEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StockEntryRepository extends JpaRepository<StockEntry, Long> {
    List<StockEntry> findByItem(InventoryItem item);

    List<StockEntry> findByTypeAndEntryDateBetween(String type, LocalDateTime start, LocalDateTime end);

    List<StockEntry> findByEntryDateBetween(LocalDateTime start, LocalDateTime end);

    List<StockEntry> findByPlantation(online.teaplanter.backend.entity.Plantation plantation);
}
