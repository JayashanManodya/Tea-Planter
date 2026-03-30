package online.jayashan.teaplanter.service;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.Plantation;
import online.jayashan.teaplanter.entity.Role;
import online.jayashan.teaplanter.entity.User;
import online.jayashan.teaplanter.repository.PlantationRepository;
import online.jayashan.teaplanter.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class PlantationService {

    private final PlantationRepository plantationRepository;
    private final UserRepository userRepository;
    private final ClerkService clerkService;

    @Transactional
    public Plantation createPlantation(Plantation plantation, String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new RuntimeException("User not found: " + clerkId));

        return plantationRepository.findByOwner(user)
                .map(existing -> {
                    existing.setName(plantation.getName());
                    existing.setLocation(plantation.getLocation());
                    existing.setTotalArea(plantation.getTotalArea());
                    existing.setLatitude(plantation.getLatitude());
                    existing.setLongitude(plantation.getLongitude());
                    existing.setHarvestingRate(plantation.getHarvestingRate());
                    Plantation saved = plantationRepository.save(existing);

                    if (user.getPlantation() == null || !user.getPlantation().getId().equals(saved.getId())) {
                        user.setPlantation(saved);
                    }
                    if (!user.getRoles().contains(Role.OWNER)) {
                        user.getRoles().add(Role.OWNER);
                    }
                    userRepository.save(user);

                    clerkService.updateUserMetadata(clerkId, Role.OWNER.name(), saved.getId());
                    return saved;
                })
                .orElseGet(() -> {
                    plantation.setOwner(user);
                    Plantation savedPlantation = plantationRepository.save(plantation);

                    user.setPlantation(savedPlantation);
                    user.getRoles().add(Role.OWNER);
                    userRepository.save(user);

                    clerkService.updateUserMetadata(clerkId, Role.OWNER.name(), savedPlantation.getId());

                    return savedPlantation;
                });
    }

    @Transactional
    public Plantation updatePlantation(Plantation details, String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getRoles().contains(Role.OWNER)) {
            throw new RuntimeException("Access denied: Only Owners can update plantation details");
        }

        Plantation plantation = plantationRepository.findByOwner(user)
                .orElseThrow(() -> new RuntimeException("Plantation not found for this user"));

        plantation.setName(details.getName());
        plantation.setLocation(details.getLocation());
        plantation.setTotalArea(details.getTotalArea());
        plantation.setLatitude(details.getLatitude());
        plantation.setLongitude(details.getLongitude());
        plantation.setHarvestingRate(details.getHarvestingRate());

        return plantationRepository.save(plantation);
    }

    public Plantation getPlantationByClerkId(String clerkId) {
        return userRepository.findByClerkId(clerkId)
                .map(User::getPlantation)
                .orElseThrow(() -> new RuntimeException("User not found or no plantation associated"));
    }
}
