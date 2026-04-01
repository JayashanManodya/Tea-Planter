package online.jayashan.teaplanter.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.PastOrPresent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;

@Entity
@Table(name = "plots", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"blockId", "plantation_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Plot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String blockId;

    private Double acreage;

    private String teaClone;

    @PastOrPresent(message = "Planting date cannot be in the future")
    private LocalDate plantingDate;

    private String status; // Active, Retired, Replanted

    private Double soilPh;

    private String soilType;

    private Double latitude;

    private Double longitude;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plantation_id")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Plantation plantation;

    @OneToMany(mappedBy = "plot", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("plot")
    private java.util.List<SoilTest> soilTests;
}
