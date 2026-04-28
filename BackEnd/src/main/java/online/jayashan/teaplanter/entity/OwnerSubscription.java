package online.jayashan.teaplanter.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "owner_subscriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OwnerSubscription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String clerkId;

    @Column(nullable = false, unique = true)
    private String orderId;

    @Column
    private String paymentId;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false, length = 10)
    private String currency;

    @Column
    private String planName;

    @Column
    private LocalDateTime paidAt;

    @Column
    private LocalDateTime validUntil;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column
    private LocalDateTime invoiceSentAt;

    @Column
    private LocalDateTime reminderSevenDaysSentAt;

    @Column
    private LocalDateTime reminderOneDaySentAt;
}
