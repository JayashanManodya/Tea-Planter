package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.OwnerSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OwnerSubscriptionRepository extends JpaRepository<OwnerSubscription, Long> {
    Optional<OwnerSubscription> findByOrderId(String orderId);
    Optional<OwnerSubscription> findTopByClerkIdOrderByCreatedAtDesc(String clerkId);

    Optional<OwnerSubscription> findFirstByClerkIdAndStatusIgnoreCaseOrderByValidUntilDesc(String clerkId, String status);

    Optional<OwnerSubscription> findFirstByClerkIdAndStatusIgnoreCaseOrderByCreatedAtDesc(String clerkId, String status);

    List<OwnerSubscription> findTop10ByClerkIdOrderByCreatedAtDesc(String clerkId);

    List<OwnerSubscription> findByStatusIgnoreCase(String status);
}
