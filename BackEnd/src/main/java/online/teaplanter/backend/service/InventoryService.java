package online.teaplanter.backend.service;

import lombok.RequiredArgsConstructor;
import online.teaplanter.backend.entity.InventoryItem;
import online.teaplanter.backend.entity.StockEntry;
import online.teaplanter.backend.repository.InventoryRepository;
import online.teaplanter.backend.repository.StockEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final StockEntryRepository stockEntryRepository;
    private final online.teaplanter.backend.repository.PlantationRepository plantationRepository;

    public InventoryItem addItem(InventoryItem item, Long plantationId) {
        if (plantationId != null) {
            plantationRepository.findById(plantationId).ifPresent(item::setPlantation);
        }
        return inventoryRepository.save(item);
    }

    public List<InventoryItem> getAllItems(Long plantationId) {
        if (plantationId != null) {
            return getItemsByPlantation(plantationId);
        }
        return inventoryRepository.findAll();
    }

    public List<InventoryItem> getItemsByPlantation(Long plantationId) {
        online.teaplanter.backend.entity.Plantation plantation = plantationRepository.findById(plantationId)
                .orElseThrow(() -> new RuntimeException("Plantation not found"));
        return inventoryRepository.findByPlantation(plantation);
    }

    public List<StockEntry> getAllStockEntries(Long plantationId) {
        if (plantationId != null) {
            online.teaplanter.backend.entity.Plantation plantation = plantationRepository.findById(plantationId)
                    .orElseThrow(() -> new RuntimeException("Plantation not found"));
            return stockEntryRepository.findByPlantation(plantation);
        }
        return stockEntryRepository.findAll();
    }

    public StockEntry getStockEntryById(Long id) {
        return stockEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stock entry not found"));
    }

    @Transactional
    public StockEntry recordStockEntry(Long itemId, Double quantity, Double unitPrice, String type) {
        InventoryItem item = inventoryRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        StockEntry entry = StockEntry.builder()
                .item(item)
                .quantity(quantity)
                .unitPrice(unitPrice)
                .type(type)
                .entryDate(LocalDateTime.now())
                .plantation(item.getPlantation()) // Inherit from item
                .build();

        if ("USAGE".equals(type)) {
            item.setCurrentStock((item.getCurrentStock() != null ? item.getCurrentStock() : 0.0) - quantity);
        } else if ("PURCHASE".equals(type)) {
            item.setCurrentStock((item.getCurrentStock() != null ? item.getCurrentStock() : 0.0) + quantity);
            if (unitPrice != null) {
                item.setUnitPrice(unitPrice);
            }
        }

        inventoryRepository.save(item);
        return stockEntryRepository.save(entry);
    }

    public void deleteItem(Long id) {
        inventoryRepository.deleteById(id);
    }

    public InventoryItem updateItem(Long id, InventoryItem details) {
        InventoryItem item = inventoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found"));
        item.setName(details.getName());
        item.setCategory(details.getCategory());
        item.setCurrentStock(details.getCurrentStock());
        item.setUnit(details.getUnit());
        item.setReorderLevel(details.getReorderLevel());
        item.setUnitPrice(details.getUnitPrice());
        return inventoryRepository.save(item);
    }

    @Transactional
    public StockEntry updateStockEntry(Long id, Double newQuantity, Double newUnitPrice) {
        StockEntry entry = getStockEntryById(id);
        InventoryItem item = entry.getItem();

        // 1. Reverse the old impact
        if ("USAGE".equals(entry.getType())) {
            item.setCurrentStock((item.getCurrentStock() != null ? item.getCurrentStock() : 0.0) + entry.getQuantity());
        } else if ("PURCHASE".equals(entry.getType())) {
            item.setCurrentStock((item.getCurrentStock() != null ? item.getCurrentStock() : 0.0) - entry.getQuantity());
        }

        // 2. Apply the new impact
        if ("USAGE".equals(entry.getType())) {
            item.setCurrentStock(item.getCurrentStock() - newQuantity);
        } else if ("PURCHASE".equals(entry.getType())) {
            item.setCurrentStock(item.getCurrentStock() + newQuantity);
            if (newUnitPrice != null) {
                item.setUnitPrice(newUnitPrice);
                entry.setUnitPrice(newUnitPrice);
            }
        }

        entry.setQuantity(newQuantity);
        inventoryRepository.save(item);
        return stockEntryRepository.save(entry);
    }

    @Transactional
    public void deleteStockEntry(Long id) {
        StockEntry entry = getStockEntryById(id);
        InventoryItem item = entry.getItem();

        // Reverse impact before deletion
        if ("USAGE".equals(entry.getType())) {
            item.setCurrentStock((item.getCurrentStock() != null ? item.getCurrentStock() : 0.0) + entry.getQuantity());
        } else if ("PURCHASE".equals(entry.getType())) {
            item.setCurrentStock((item.getCurrentStock() != null ? item.getCurrentStock() : 0.0) - entry.getQuantity());
        }

        inventoryRepository.save(item);
        stockEntryRepository.delete(entry);
    }
}
