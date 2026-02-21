package online.jayashan.teaplanter.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;

@Entity
@Table(name = "payrolls")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payroll {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worker_id", nullable = false)
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Worker worker;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plantation_id")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Plantation plantation;

    private LocalDate month;

    private Double basicWage;

    private Double bonuses;

    private Double deductions;

    private Double netPay;

    @Column(nullable = false)
    private String status; // PENDING, APPROVED, PAID, REMOVED

    @PrePersist
    @PreUpdate
    public void calculateNetPay() {
        this.netPay = (this.basicWage != null ? this.basicWage : 0.0)
                + (this.bonuses != null ? this.bonuses : 0.0)
                - (this.deductions != null ? this.deductions : 0.0);
    }
}
