package online.jayashan.teaplanter.service;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.Plantation;
import online.jayashan.teaplanter.entity.Role;
import online.jayashan.teaplanter.entity.User;
import online.jayashan.teaplanter.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PlantationService {

    private final PlantationRepository plantationRepository;
    private final UserRepository userRepository;
    private final WorkerRepository workerRepository;
    private final TaskRepository taskRepository;
    private final HarvestRepository harvestRepository;
    private final AttendanceRepository attendanceRepository;
    private final PayrollRepository payrollRepository;
    private final InventoryRepository inventoryRepository;
    private final StockEntryRepository stockEntryRepository;
    private final PlotRepository plotRepository;
    private final FactoryRepository factoryRepository;
    private final ClerkService clerkService;
    
    @Value("${PLANTATION_CREATION_PIN}")
    private String requiredCreationPin;

    @Transactional
    public Plantation createPlantation(Plantation plantation, String clerkId, String creationPin) {
        if (requiredCreationPin != null && !requiredCreationPin.equals(creationPin)) {
            throw new RuntimeException("Invalid Administrative PIN. Contact system administrator.");
        }
        
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new RuntimeException("User not found: " + clerkId));

        // Validation: If user is already assigned to a plantation (as worker/clerk), they cannot create one
        if (user.getPlantation() != null && !user.getRoles().contains(Role.OWNER)) {
            throw new RuntimeException("You are already assigned as a worker or clerk to another plantation. Please have the estate owner remove you before creating your own estate.");
        }

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

    @Transactional
    public void deletePlantation(String clerkId, String confirmedName) {
        User owner = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new RuntimeException("User not found: " + clerkId));

        if (!owner.getRoles().contains(Role.OWNER)) {
            throw new RuntimeException("Access denied: Only owners can delete a plantation.");
        }

        Plantation plantation = plantationRepository.findByOwner(owner)
                .orElseThrow(() -> new RuntimeException("No plantation found for this user."));

        if (!plantation.getName().equals(confirmedName)) {
            throw new RuntimeException("Confirmation failed: The plantation name typed does not match.");
        }

        // Clean up dependent entities
        System.out.println("DEBUG: COMMENCING FULL WIPE for plantation: " + plantation.getName());

        // 1. Delete specialized records
        taskRepository.deleteByPlantation(plantation);
        harvestRepository.deleteByPlantation(plantation);
        attendanceRepository.deleteByPlantation(plantation);
        payrollRepository.deleteByPlantation(plantation);
        
        // Items and stock
        stockEntryRepository.deleteByPlantation(plantation);
        inventoryRepository.deleteByPlantation(plantation);
        
        // Plots and factories
        plotRepository.deleteByPlantation(plantation);
        factoryRepository.deleteByPlantation(plantation);

        // 2. Clear worker references in User entity before deleting Worker entity
        List<User> affectedUsers = userRepository.findByPlantation(plantation);
        for (User u : affectedUsers) {
            u.setPlantation(null);
            u.getRoles().remove(Role.WORKER);
            u.getRoles().remove(Role.CLERK);
            userRepository.save(u);
            // Revoke role and plantation in Clerk metadata too
            clerkService.updateUserMetadata(u.getClerkId(), null, null);
        }

        // 3. Delete Worker table entries
        workerRepository.deleteByPlantation(plantation);

        // 4. Update the owner
        owner.setPlantation(null);
        owner.getRoles().remove(Role.OWNER);
        userRepository.save(owner);

        // 5. Update Clerk Metadata (remove role and plantationId)
        clerkService.updateUserMetadata(clerkId, null, null);

        // 6. Delete the Plantation itself
        plantationRepository.delete(plantation);
        
        System.out.println("DEBUG: Plantation " + confirmedName + " and all its data have been permanently deleted.");
    }

    public void validatePlantationPin(String pin) {
        if (requiredCreationPin != null && !requiredCreationPin.equals(pin)) {
            throw new RuntimeException("Invalid Administrative PIN. Contact system administrator.");
        }
    }
}
