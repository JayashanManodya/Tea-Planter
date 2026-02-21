package online.jayashan.teaplanter.service;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.Factory;
import online.jayashan.teaplanter.entity.TeaDelivery;
import online.jayashan.teaplanter.repository.FactoryRepository;
import online.jayashan.teaplanter.repository.TeaDeliveryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FactoryService {

    private final FactoryRepository factoryRepository;
    private final TeaDeliveryRepository teaDeliveryRepository;
    private final online.jayashan.teaplanter.repository.HarvestRepository harvestRepository;
    private final online.jayashan.teaplanter.repository.PlantationRepository plantationRepository;

    public List<Factory> getAllFactories(Long plantationId) {
        if (plantationId != null) {
            online.jayashan.teaplanter.entity.Plantation plantation = plantationRepository.findById(plantationId)
                    .orElseThrow(() -> new RuntimeException("Plantation not found"));
            return factoryRepository.findByPlantation(plantation);
        }
        return factoryRepository.findAll();
    }

    public Factory saveFactory(Factory factory, Long plantationId) {
        if (plantationId != null) {
            online.jayashan.teaplanter.entity.Plantation plantation = plantationRepository.findById(plantationId)
                    .orElseThrow(() -> new RuntimeException("Plantation not found"));
            factory.setPlantation(plantation);
        }
        return factoryRepository.save(factory);
    }

    public Factory getFactoryById(Long id) {
        return factoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Factory not found"));
    }

    public List<TeaDelivery> getAllDeliveries(java.time.LocalDate month, Long plantationId) {
        if (plantationId != null) {
            online.jayashan.teaplanter.entity.Plantation plantation = plantationRepository.findById(plantationId)
                    .orElseThrow(() -> new RuntimeException("Plantation not found"));
            if (month != null) {
                java.time.LocalDate start = month.withDayOfMonth(1);
                java.time.LocalDate end = month.withDayOfMonth(month.lengthOfMonth());
                return teaDeliveryRepository.findByPlantation(plantation).stream()
                        .filter(d -> !d.getDeliveryDate().isBefore(start) && !d.getDeliveryDate().isAfter(end))
                        .collect(java.util.stream.Collectors.toList());
            }
            return teaDeliveryRepository.findByPlantation(plantation);
        }

        if (month == null) {
            return teaDeliveryRepository.findAll();
        }
        java.time.LocalDate start = month.withDayOfMonth(1);
        java.time.LocalDate end = month.withDayOfMonth(month.lengthOfMonth());
        return teaDeliveryRepository.findByDeliveryDateBetween(start, end);
    }

    public TeaDelivery recordDelivery(TeaDelivery delivery, Long plantationId) {
        if (delivery.getFactory() != null && delivery.getFactory().getId() != null) {
            Factory factory = getFactoryById(delivery.getFactory().getId());
            delivery.setFactory(factory);
        }

        if (delivery.getDeliveryDate() == null) {
            delivery.setDeliveryDate(java.time.LocalDate.now());
        }

        if (plantationId != null) {
            plantationRepository.findById(plantationId).ifPresent(delivery::setPlantation);
        }

        // Validation: Delivery weight cannot exceed total harvested weight for the day
        // within the SAME plantation
        List<online.jayashan.teaplanter.entity.Harvest> dailyHarvests = (delivery.getPlantation() != null)
                ? harvestRepository.findByPlantation(delivery.getPlantation()).stream()
                        .filter(h -> h.getHarvestDate().equals(delivery.getDeliveryDate()))
                        .collect(java.util.stream.Collectors.toList())
                : harvestRepository.findByHarvestDate(delivery.getDeliveryDate());

        double totalHarvested = dailyHarvests.stream()
                .mapToDouble(h -> h.getNetWeight() != null ? h.getNetWeight() : 0.0)
                .sum();

        double alreadyDelivered = (delivery.getPlantation() != null)
                ? teaDeliveryRepository.findByPlantation(delivery.getPlantation()).stream()
                        .filter(d -> d.getDeliveryDate().equals(delivery.getDeliveryDate()))
                        .filter(d -> delivery.getId() == null || !d.getId().equals(delivery.getId()))
                        .mapToDouble(d -> d.getWeight() != null ? d.getWeight() : 0.0)
                        .sum()
                : teaDeliveryRepository.findByDeliveryDate(delivery.getDeliveryDate())
                        .stream()
                        .filter(d -> delivery.getId() == null || !d.getId().equals(delivery.getId()))
                        .mapToDouble(d -> d.getWeight() != null ? d.getWeight() : 0.0)
                        .sum();

        double currentWeight = delivery.getWeight() != null ? delivery.getWeight() : 0.0;
        double tolerance = 0.001;

        if (dailyHarvests.isEmpty()) {
            throw new RuntimeException("Cannot record delivery for " + delivery.getDeliveryDate()
                    + ". No harvest records found for this date. Total harvested is 0.00kg.");
        }

        if (alreadyDelivered + currentWeight > totalHarvested + tolerance) {
            throw new RuntimeException("Delivery validation failed for " + delivery.getDeliveryDate() + ". " +
                    "Daily Harvest Total: " + String.format("%.2f", totalHarvested) + "kg (" + dailyHarvests.size()
                    + " records). " +
                    "Already Delivered: " + String.format("%.2f", alreadyDelivered) + "kg. " +
                    "New Attempt: " + String.format("%.2f", currentWeight) + "kg. " +
                    "The total delivery (" + String.format("%.2f", alreadyDelivered + currentWeight)
                    + "kg) would exceed the total harvested amount.");
        }

        return teaDeliveryRepository.save(delivery);
    }

    public TeaDelivery getDeliveryById(Long id) {
        return teaDeliveryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Delivery record not found"));
    }

    public TeaDelivery updateDelivery(Long id, TeaDelivery details) {
        TeaDelivery delivery = getDeliveryById(id);

        // Update basic fields
        if (details.getFactory() != null && details.getFactory().getId() != null) {
            delivery.setFactory(getFactoryById(details.getFactory().getId()));
        }
        delivery.setWeight(details.getWeight());
        delivery.setDeliveryDate(details.getDeliveryDate());

        // Re-run validation for the updated record
        return recordDelivery(delivery, delivery.getPlantation() != null ? delivery.getPlantation().getId() : null);
    }

    public void deleteDelivery(Long id) {
        TeaDelivery delivery = getDeliveryById(id);
        teaDeliveryRepository.delete(delivery);
    }

    public void deleteFactory(Long id) {
        Factory factory = getFactoryById(id);
        factoryRepository.delete(factory);
    }
}
