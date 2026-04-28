package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.Role;
import online.jayashan.teaplanter.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByClerkId(String clerkId);

    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE NOT EXISTS (SELECT 1 FROM Worker w WHERE w.user = u)")
    java.util.List<User> findAvailableUsers();

    java.util.List<User> findByPlantation(online.jayashan.teaplanter.entity.Plantation plantation);

    @Query("SELECT DISTINCT u FROM User u WHERE :role MEMBER OF u.roles")
    List<User> findAllHavingRole(@Param("role") Role role);
}
