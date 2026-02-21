package online.jayashan.teaplanter.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class HarvestRequestDTO {
    private Long workerId;
    private String plotId; // Block ID
    private LocalDate harvestDate;
    private Double grossWeight;
    private Double tareWeight;
    private Long plantationId;
}
