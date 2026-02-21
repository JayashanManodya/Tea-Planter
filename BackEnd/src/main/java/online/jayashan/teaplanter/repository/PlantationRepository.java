package online.jayashan.teaplanter.repository;

import online.jayashan.teaplanter.entity.Plantation;
import online.jayashan.teaplanter.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlantationRepository extends JpaRepository<Plantation, Long> {
    Optional<Plantation> findByOwner(User owner);
}
