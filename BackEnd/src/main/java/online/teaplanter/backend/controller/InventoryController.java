package online.teaplanter.backend.controller;

import lombok.RequiredArgsConstructor;
import online.teaplanter.backend.entity.InventoryItem;
import online.teaplanter.backend.entity.StockEntry;
import online.teaplanter.backend.service.InventoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping("/items")
    public InventoryItem addItem(@RequestBody InventoryItem item, @RequestParam(required = false) Long plantationId) {
        return inventoryService.addItem(item, plantationId);
    }

    @GetMapping("/items")
    public List<InventoryItem> getAllItems(@RequestParam(required = false) Long plantationId) {
        return inventoryService.getAllItems(plantationId);
    }

    @PostMapping("/stock-entry")
    public StockEntry recordEntry(
            @RequestParam Long itemId,
            @RequestParam Double quantity,
            @RequestParam(required = false) Double unitPrice,
            @RequestParam String type) {
        return inventoryService.recordStockEntry(itemId, quantity, unitPrice, type);
    }

    @GetMapping("/stock-entries")
    public List<StockEntry> getAllStockEntries(@RequestParam(required = false) Long plantationId) {
        return inventoryService.getAllStockEntries(plantationId);
    }

    @PutMapping("/stock-entries/{id}")
    public StockEntry updateStockEntry(
            @PathVariable Long id,
            @RequestParam Double quantity,
            @RequestParam(required = false) Double unitPrice) {
        return inventoryService.updateStockEntry(id, quantity, unitPrice);
    }

    @DeleteMapping("/stock-entries/{id}")
    public void deleteStockEntry(@PathVariable Long id) {
        inventoryService.deleteStockEntry(id);
    }

    @DeleteMapping("/items/{id}")
    public void deleteItem(@PathVariable Long id) {
        inventoryService.deleteItem(id);
    }

    @PutMapping("/items/{id}")
    public InventoryItem updateItem(@PathVariable Long id, @RequestBody InventoryItem item) {
        return inventoryService.updateItem(id, item);
    }
}
