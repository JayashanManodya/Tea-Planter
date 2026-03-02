package online.teaplanter.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollPreviewDTO {
    private Double harvestEarnings;
    private Double taskEarnings;
    private Double totalEarnings;
    private Long harvestCount;
    private Long taskCount;
    private Long plantationId;
}
