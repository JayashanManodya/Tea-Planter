package online.jayashan.teaplanter.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String clerkId;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column
    private String password;

    @Column(length = 6)
    private String pin;

    private String phone;
    private String gender;
    private java.time.LocalDate birthday;
    private String bankName;
    private String branchName;
    private String accountNumber;
    private String accountHolderName;
    private String emergencyContact;

    @ManyToOne
    @JoinColumn(name = "plantation_id")
    private Plantation plantation;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Set<Role> roles = new java.util.HashSet<>();
}
