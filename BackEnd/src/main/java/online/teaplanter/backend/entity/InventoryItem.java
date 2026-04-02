package online.teaplanter.backend.entity;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import online.teaplanter.backend.entity.Plantation;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "inventory_items")
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class InventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // Fertilizer, Pesticide, Tools
    private String category;
    private double unitPrice;
    private String unit; // Kg, liters, units
    private double reorderLevel;
    private double currentStock;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plantation_id")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Plantation plantation;
}
