package online.jayashan.teaplanter.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AttendanceRequestDTO {
    private Long workerId;
    private LocalDateTime checkIn;
    private LocalDateTime checkOut;
    private String status;
    private String remarks;
    private Long plantationId;
}
