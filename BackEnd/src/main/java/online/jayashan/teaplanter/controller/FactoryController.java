package online.jayashan.teaplanter.controller;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.Factory;
import online.jayashan.teaplanter.entity.TeaDelivery;
import online.jayashan.teaplanter.service.FactoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/factories")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FactoryController {

    private final FactoryService factoryService;

    @GetMapping
    public List<Factory> getAllFactories(@RequestParam(required = false) Long plantationId) {
        return factoryService.getAllFactories(plantationId);
    }

    @PostMapping
    public Factory createFactory(@RequestBody Factory factory, @RequestParam(required = false) Long plantationId) {
        return factoryService.saveFactory(factory, plantationId);
    }

    @PutMapping("/{id}")
    public Factory updateFactory(@PathVariable Long id, @RequestBody Factory factoryDetails) {
        Factory factory = factoryService.getFactoryById(id);
        factory.setName(factoryDetails.getName());
        factory.setRegisterNo(factoryDetails.getRegisterNo());
        factory.setContactNumber(factoryDetails.getContactNumber());
        factory.setLorrySupervisorName(factoryDetails.getLorrySupervisorName());
        factory.setLorrySupervisorContact(factoryDetails.getLorrySupervisorContact());
        return factoryService.saveFactory(factory, null);
    }

    @DeleteMapping("/{id}")
    public void deleteFactory(@PathVariable Long id) {
        factoryService.deleteFactory(id);
    }

    @GetMapping("/deliveries")
    public List<TeaDelivery> getAllDeliveries(@RequestParam(required = false) String month,
            @RequestParam(required = false) Long plantationId) {
        java.time.LocalDate date = (month != null) ? java.time.LocalDate.parse(month + "-01") : null;
        return factoryService.getAllDeliveries(date, plantationId);
    }

    @PostMapping("/deliveries")
    public TeaDelivery recordDelivery(@RequestBody TeaDelivery delivery,
            @RequestParam(required = false) Long plantationId) {
        return factoryService.recordDelivery(delivery, plantationId);
    }

    @PutMapping("/deliveries/{id}")
    public TeaDelivery updateDelivery(@PathVariable Long id, @RequestBody TeaDelivery delivery) {
        return factoryService.updateDelivery(id, delivery);
    }

    @DeleteMapping("/deliveries/{id}")
    public void deleteDelivery(@PathVariable Long id) {
        factoryService.deleteDelivery(id);
    }
}
