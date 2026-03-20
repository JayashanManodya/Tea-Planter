package online.jayashan.teaplanter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerDashboardDTO {
    private Long plantationId;
    private String plantationName;
    private int pendingTasks;
    private int completedTasks;
    private double totalHarvestWeight;
    private double monthlyEarnings;
    private int attendanceDays;
    private String qrCode;
    private Long workerId;
}
