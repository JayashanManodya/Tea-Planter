package online.teaplanter.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TaskRequestDTO {

    private String title;
    private String description;
    private Long workerId;
    private String priority;
    private String plotId;
    private String taskCategory;
    private String taskDate;
    private Long plantationId;
}