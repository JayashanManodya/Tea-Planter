package online.jayashan.teaplanter.service;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.Plot;
import online.jayashan.teaplanter.entity.SoilTest;
import online.jayashan.teaplanter.repository.PlotRepository;
import online.jayashan.teaplanter.repository.SoilTestRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RegistryService {

    private final PlotRepository plotRepository;
    private final SoilTestRepository soilTestRepository;
    private final online.jayashan.teaplanter.repository.PlantationRepository plantationRepository;

    public Plot createPlot(Plot plot, Long plantationId) {
        if (plantationId != null) {
            plantationRepository.findById(plantationId).ifPresent(plot::setPlantation);
        }
        if (plot.getStatus() == null || plot.getStatus().trim().isEmpty()) {
            plot.setStatus("Active");
        }
        return plotRepository.save(plot);
    }

    public List<Plot> getAllPlots() {
        return plotRepository.findAll();
    }

    public List<Plot> getPlotsByPlantation(Long plantationId) {
        online.jayashan.teaplanter.entity.Plantation plantation = plantationRepository.findById(plantationId)
                .orElseThrow(() -> new RuntimeException("Plantation not found"));
        return plotRepository.findByPlantation(plantation);
    }

    public Plot updatePlot(Long id, Plot plotDetails) {
        Plot plot = plotRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plot not found"));
        plot.setAcreage(plotDetails.getAcreage());
        plot.setTeaClone(plotDetails.getTeaClone());
        plot.setPlantingDate(plotDetails.getPlantingDate());
        plot.setStatus(plotDetails.getStatus());
        plot.setSoilPh(plotDetails.getSoilPh());
        plot.setSoilType(plotDetails.getSoilType());
        plot.setLatitude(plotDetails.getLatitude());
        plot.setLongitude(plotDetails.getLongitude());
        return plotRepository.save(plot);
    }

    public void deletePlot(Long id) {
        plotRepository.deleteById(id);
    }

    public SoilTest addSoilTest(SoilTest soilTest, Long plantationId) {
        if (plantationId != null) {
            plantationRepository.findById(plantationId).ifPresent(soilTest::setPlantation);
        }
        return soilTestRepository.save(soilTest);
    }

    public List<SoilTest> getSoilTestsByPlot(Long plotId) {
        Plot plot = plotRepository.findById(plotId)
                .orElseThrow(() -> new RuntimeException("Plot not found"));
        return soilTestRepository.findByPlot(plot);
    }
}
