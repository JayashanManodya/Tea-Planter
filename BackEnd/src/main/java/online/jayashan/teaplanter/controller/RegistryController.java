package online.jayashan.teaplanter.controller;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.Plot;
import online.jayashan.teaplanter.entity.SoilTest;
import online.jayashan.teaplanter.service.RegistryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/registry")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RegistryController {

    private final RegistryService registryService;

    @PostMapping("/plots")
    public Plot createPlot(@RequestBody Plot plot, @RequestParam(required = false) Long plantationId) {
        return registryService.createPlot(plot, plantationId);
    }

    @GetMapping("/plots")
    public List<Plot> getAllPlots(@RequestParam(required = false) Long plantationId) {
        if (plantationId != null) {
            return registryService.getPlotsByPlantation(plantationId);
        }
        return registryService.getAllPlots();
    }

    @PutMapping("/plots/{id}")
    public Plot updatePlot(@PathVariable Long id, @RequestBody Plot plot) {
        return registryService.updatePlot(id, plot);
    }

    @DeleteMapping("/plots/{id}")
    public void deletePlot(@PathVariable Long id) {
        registryService.deletePlot(id);
    }

    @PostMapping("/soil-tests")
    public SoilTest addSoilTest(@RequestBody SoilTest test, @RequestParam(required = false) Long plantationId) {
        return registryService.addSoilTest(test, plantationId);
    }

    @GetMapping("/plots/{plotId}/soil-tests")
    public List<SoilTest> getTests(@PathVariable Long plotId) {
        return registryService.getSoilTestsByPlot(plotId);
    }
}
