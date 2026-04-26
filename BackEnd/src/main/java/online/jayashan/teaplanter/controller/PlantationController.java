package online.jayashan.teaplanter.controller;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.Plantation;
import online.jayashan.teaplanter.service.PlantationService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/plantations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PlantationController {

    private final PlantationService plantationService;

    @PostMapping
    public Plantation createPlantation(@RequestBody Plantation plantation, @RequestParam String clerkId, @RequestParam String creationPin) {
        return plantationService.createPlantation(plantation, clerkId, creationPin);
    }

    @GetMapping
    public Plantation getPlantation(@RequestParam String clerkId) {
        return plantationService.getPlantationByClerkId(clerkId);
    }

    @PutMapping
    public Plantation updatePlantation(@RequestBody Plantation plantation, @RequestParam String clerkId) {
        return plantationService.updatePlantation(plantation, clerkId);
    }

    @DeleteMapping
    public void deletePlantation(@RequestParam String clerkId, @RequestParam String name) {
        plantationService.deletePlantation(clerkId, name);
    }

    @PostMapping("/validate-pin")
    public void validatePin(@RequestParam String pin) {
        plantationService.validatePlantationPin(pin);
    }
}
