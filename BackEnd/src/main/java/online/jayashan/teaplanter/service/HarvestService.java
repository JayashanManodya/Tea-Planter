package online.jayashan.teaplanter.service;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.Harvest;
import online.jayashan.teaplanter.entity.Plot;
import online.jayashan.teaplanter.entity.Worker;
import online.jayashan.teaplanter.repository.HarvestRepository;
import online.jayashan.teaplanter.repository.PlotRepository;
import online.jayashan.teaplanter.repository.WorkerRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HarvestService {

    private final HarvestRepository harvestRepository;
    private final WorkerRepository workerRepository;
    private final PlotRepository plotRepository;
    private final online.jayashan.teaplanter.repository.TaskRateRepository taskRateRepository;
    private final online.jayashan.teaplanter.repository.PlantationRepository plantationRepository;

    public List<Harvest> getAllHarvests(java.time.LocalDate month, Long plantationId) {
        java.time.LocalDate start = month != null ? month.withDayOfMonth(1) : null;
        java.time.LocalDate end = month != null ? month.withDayOfMonth(month.lengthOfMonth()) : null;

        if (plantationId != null) {
            online.jayashan.teaplanter.entity.Plantation plantation = plantationRepository.findById(plantationId)
                    .orElseThrow(() -> new RuntimeException("Plantation not found"));
            if (month != null) {
                return harvestRepository.findByPlantation(plantation).stream()
                        .filter(h -> !h.getHarvestDate().isBefore(start) && !h.getHarvestDate().isAfter(end))
                        .collect(java.util.stream.Collectors.toList());
            }
            return harvestRepository.findByPlantation(plantation);
        }

        if (month == null) {
            return harvestRepository.findAll();
        }
        return harvestRepository.findByHarvestDateBetween(start, end);
    }

    public Harvest recordHarvest(online.jayashan.teaplanter.dto.HarvestRequestDTO dto) {
        Worker worker = workerRepository.findById(dto.getWorkerId())
                .orElseThrow(() -> new RuntimeException("Worker not found"));
        Plot plot = plotRepository.findByBlockId(dto.getPlotId())
                .orElseThrow(() -> new RuntimeException("Plot not found"));

        double netWeight = dto.getGrossWeight() - dto.getTareWeight();

        // Explicitly fetch plantation to ensure we have the most up-to-date data (e.g.
        // harvestingRate)
        online.jayashan.teaplanter.entity.Plantation plantation = null;
        if (dto.getPlantationId() != null) {
            plantation = plantationRepository.findById(dto.getPlantationId()).orElse(null);
        }
        if (plantation == null && worker.getPlantation() != null) {
            plantation = plantationRepository.findById(worker.getPlantation().getId()).orElse(null);
        }

        double rate = 0.0;
        if (plantation != null && plantation.getHarvestingRate() != null) {
            rate = plantation.getHarvestingRate();
        } else {
            // Fallback to global task rate if plantation-specific rate is not set
            rate = taskRateRepository.findByCategory("HARVESTING")
                    .map(online.jayashan.teaplanter.entity.TaskRate::getRate)
                    .orElse(0.0);
        }

        if (worker.getPlantation() != null && plot.getPlantation() != null) {
            if (!worker.getPlantation().getId().equals(plot.getPlantation().getId())) {
                throw new RuntimeException("Worker and Plot belong to different plantations");
            }
        }

        Harvest harvest = Harvest.builder()
                .worker(worker)
                .plot(plot)
                .harvestDate(dto.getHarvestDate())
                .grossWeight(dto.getGrossWeight())
                .tareWeight(dto.getTareWeight())
                .netWeight(netWeight)
                .calculatedPay(netWeight * rate)
                .plantation(plantation != null ? plantation : worker.getPlantation())
                .build();

        return harvestRepository.save(harvest);
    }

    public List<Harvest> getHarvestsByWorker(Long workerId) {
        Worker worker = workerRepository.findById(workerId)
                .orElseThrow(() -> new RuntimeException("Worker not found"));
        return harvestRepository.findByWorker(worker);
    }

    public List<Harvest> getHarvestsByPlot(Long plotId) {
        Plot plot = plotRepository.findById(plotId)
                .orElseThrow(() -> new RuntimeException("Plot not found"));
        return harvestRepository.findByPlot(plot);
    }

    public Harvest updateHarvest(Long id, Harvest harvestDetails) {
        Harvest harvest = harvestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Harvest record not found"));
        harvest.setGrossWeight(harvestDetails.getGrossWeight());
        harvest.setTareWeight(harvestDetails.getTareWeight());
        harvest.calculateNetWeight(); // Recalculate net weight
        harvest.setHarvestDate(harvestDetails.getHarvestDate());

        // Recalculate pay based on new weight and current plantation rate
        online.jayashan.teaplanter.entity.Plantation plantation = harvest.getPlantation();
        if (plantation != null) {
            // Freshly fetch plantation to get the latest rate
            plantation = plantationRepository.findById(plantation.getId()).orElse(plantation);
        }

        double rate = 0.0;
        if (plantation != null && plantation.getHarvestingRate() != null) {
            rate = plantation.getHarvestingRate();
        } else {
            rate = taskRateRepository.findByCategory("HARVESTING")
                    .map(online.jayashan.teaplanter.entity.TaskRate::getRate)
                    .orElse(0.0);
        }

        if (harvest.getNetWeight() != null) {
            harvest.setCalculatedPay(harvest.getNetWeight() * rate);
        }

        return harvestRepository.save(harvest);
    }

    public void deleteHarvest(Long id) {
        harvestRepository.deleteById(id);
    }
}
