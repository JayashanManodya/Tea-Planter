package online.jayashan.teaplanter.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "factory_income_final")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FactoryPaysheet {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "factory_id", nullable = true)
    private Factory factory;

    private Double totalWeight;
    private Double pricePerKg;

    @Builder.Default
    private Double transportDeduction = 0.0;

    @Builder.Default
    private Double otherDeductions = 0.0;

    private Double grossAmount;
    private Double netAmount;

    @Embedded
    private IncomeDate date;

    private String description;
    private LocalDate receivedDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plantation_id")
    private Plantation plantation;

    public void calculateTotals() {
        this.grossAmount = (totalWeight != null ? totalWeight : 0.0) * (pricePerKg != null ? pricePerKg : 0.0);
        this.netAmount = this.grossAmount - (transportDeduction != null ? transportDeduction : 0.0)
                - (otherDeductions != null ? otherDeductions : 0.0);
    }
}
