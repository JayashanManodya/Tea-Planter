package online.jayashan.teaplanter.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;

@Entity
@Table(name = "workers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Worker {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String workerFunctions; // Comma-separated: Harvester, Pruner, etc.

    @OneToOne
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private User user;

    @ManyToOne
    @JoinColumn(name = "plantation_id")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Plantation plantation;

    private LocalDate joinDate;

    private String assignedBlock;

    @Column(nullable = false)
    private String status; // Active, On Leave, Inactive

    @Column(unique = true)
    private String qrCode;

    private Double baseSalary;

    private Double monthlyHarvest; // This might be calculated, but can store summary
}
