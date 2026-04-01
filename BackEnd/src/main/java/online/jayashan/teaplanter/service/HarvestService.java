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
        // Identify plantation first to find the correct plot within it
        online.jayashan.teaplanter.entity.Plantation plantation = null;
        if (dto.getPlantationId() != null) {
            plantation = plantationRepository.findById(dto.getPlantationId())
                    .orElseThrow(() -> new RuntimeException("Plantation not found"));
        } else if (worker.getPlantation() != null) {
            plantation = worker.getPlantation();
        }

        if (plantation == null) {
            throw new RuntimeException("Plantation context is required to identify a plot");
        }

        final online.jayashan.teaplanter.entity.Plantation finalPlantation = plantation;
        Plot plot = plotRepository.findByBlockIdAndPlantation(dto.getPlotId(), finalPlantation)
                .orElseThrow(() -> new RuntimeException("Plot '" + dto.getPlotId() + "' not found in plantation: " + finalPlantation.getName()));

        if (!"Active".equalsIgnoreCase(plot.getStatus())) {
            throw new RuntimeException("Harvest records can only be added for active plots");
        }

        double netWeight = dto.getGrossWeight() - dto.getTareWeight();

        // Rate calculation - reuse the plantation we found above

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
                .plantation(plantation)
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

    public Harvest updateHarvest(Long id, online.jayashan.teaplanter.dto.HarvestRequestDTO dto) {
        Harvest harvest = harvestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Harvest record not found"));

        if (dto.getWorkerId() != null) {
            Worker worker = workerRepository.findById(dto.getWorkerId())
                    .orElseThrow(() -> new RuntimeException("Worker not found"));
            harvest.setWorker(worker);
        }

        if (dto.getPlotId() != null) {
            Plot plot = plotRepository.findByBlockIdAndPlantation(dto.getPlotId(), harvest.getPlantation())
                    .orElseThrow(() -> new RuntimeException("Plot not found in this harvest's plantation"));
            harvest.setPlot(plot);
        }

        if (dto.getHarvestDate() != null) {
            harvest.setHarvestDate(dto.getHarvestDate());
        }

        if (dto.getGrossWeight() != null) {
            harvest.setGrossWeight(dto.getGrossWeight());
        }

        if (dto.getTareWeight() != null) {
            harvest.setTareWeight(dto.getTareWeight());
        }

        harvest.calculateNetWeight(); // Recalculate net weight

        // Recalculate pay based on new weight and current plantation rate
        online.jayashan.teaplanter.entity.Plantation plantation = harvest.getPlantation();
        if (plantation != null) {
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
