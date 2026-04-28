package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByClerkId(String clerkId);

    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE NOT EXISTS (SELECT 1 FROM Worker w WHERE w.user = u)")
    java.util.List<User> findAvailableUsers();

    java.util.List<User> findByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);
}
