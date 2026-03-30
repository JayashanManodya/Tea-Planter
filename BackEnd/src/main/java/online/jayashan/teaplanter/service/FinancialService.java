package online.jayashan.teaplanter.service;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.FactoryPaysheet;
import online.jayashan.teaplanter.entity.Payroll;
import online.jayashan.teaplanter.entity.Worker;
import online.jayashan.teaplanter.repository.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FinancialService {

        private final PayrollRepository payrollRepository;
        private final WorkerRepository workerRepository;
        private final HarvestRepository harvestRepository;
        private final TaskRepository taskRepository;
        private final TaskRateRepository taskRateRepository;
        private final FactoryPaysheetRepository factoryPaysheetRepository;
        private final FactoryRepository factoryRepository;
        private final StockEntryRepository stockEntryRepository;
        private final online.jayashan.teaplanter.repository.PlantationRepository plantationRepository;

        public Payroll generatePayroll(Payroll payroll) {
                Worker worker = workerRepository.findById(payroll.getWorker().getId())
                                .orElseThrow(() -> new RuntimeException("Worker not found"));

                return calculateAndSavePayroll(worker, payroll.getMonth(), payroll);
        }

        private Payroll calculateAndSavePayroll(Worker worker, java.time.LocalDate month, Payroll payroll) {
                java.time.LocalDate start = month.withDayOfMonth(1);
                java.time.LocalDate end = month.withDayOfMonth(month.lengthOfMonth());

                double harvestEarnings = harvestRepository.findByWorkerAndHarvestDateBetween(worker, start, end)
                                .stream()
                                .mapToDouble(h -> h.getCalculatedPay() != null ? h.getCalculatedPay() : 0.0)
                                .sum();

                double taskEarnings = calculateTaskEarnings(taskRepository
                                .findByAssignedWorkerAndCompletedAtBetween(worker, start.atStartOfDay(),
                                                end.atTime(23, 59, 59)));

                payroll.setWorker(worker);
                payroll.setMonth(start);
                
                double basicWage;
                if (isFixedSalaryWorker(worker)) {
                        basicWage = worker.getBaseSalary() != null ? worker.getBaseSalary() : 0.0;
                } else {
                        basicWage = harvestEarnings + taskEarnings;
                }
                
                payroll.setBasicWage(basicWage);
                payroll.setStatus("PENDING");
                payroll.setPlantation(worker.getPlantation()); // Scoping
                return payrollRepository.save(payroll);
        }

        public List<Payroll> generateAllPayrolls(java.time.LocalDate month, Long plantationId) {
                online.jayashan.teaplanter.entity.Plantation plantation = plantationRepository.findById(plantationId)
                                .orElseThrow(() -> new RuntimeException("Plantation not found"));

                List<Worker> workers = workerRepository.findByPlantation(plantation);
                java.time.LocalDate targetMonth = month.withDayOfMonth(1);

                return workers.stream()
                                .filter(w -> !payrollRepository.existsByWorkerAndMonth(w, targetMonth))
                                .map(w -> {
                                        Payroll p = new Payroll();
                                        p.setWorker(w);
                                        p.setMonth(targetMonth);
                                        p.setPlantation(plantation);
                                        return calculateAndSavePayroll(w, targetMonth, p);
                                })
                                .collect(java.util.stream.Collectors.toList());
        }

        public List<Payroll> getAllPayrolls(java.time.LocalDate month, Long plantationId) {
                if (plantationId != null) {
                        online.jayashan.teaplanter.entity.Plantation plantation = plantationRepository
                                        .findById(plantationId)
                                        .orElseThrow(() -> new RuntimeException("Plantation not found"));
                        if (month != null) {
                                java.time.LocalDate start = month.withDayOfMonth(1);
                                java.time.LocalDate end = month.withDayOfMonth(month.lengthOfMonth());
                                return payrollRepository.findByPlantation(plantation).stream()
                                                .filter(p -> !p.getMonth().isBefore(start)
                                                                && !p.getMonth().isAfter(end))
                                                .collect(java.util.stream.Collectors.toList());
                        }
                        return payrollRepository.findByPlantation(plantation);
                }

                if (month == null) {
                        return payrollRepository.findAll();
                }
                java.time.LocalDate start = month.withDayOfMonth(1);
                java.time.LocalDate end = month.withDayOfMonth(month.lengthOfMonth());
                return payrollRepository.findByMonthBetween(start, end);
        }

        public Payroll updatePayrollStatus(Long id, String status, String mode) {
                Payroll payroll = payrollRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Payroll record not found"));

                if ("PAID".equals(payroll.getStatus()) || "APPROVED".equals(payroll.getStatus())) {
                        if ("REMOVED".equals(status)) {
                                throw new RuntimeException("Cannot remove approved or paid payroll");
                        }
                }

                payroll.setStatus(status);
                if (mode != null) {
                        payroll.setPaymentMode(mode);
                }
                
                if ("PAID".equals(status)) {
                        payroll.setPaidDate(java.time.LocalDate.now());
                }
                return payrollRepository.save(payroll);
        }

        public List<Payroll> bulkUpdatePayrollStatus(List<Long> ids, String status, String mode) {
                List<Payroll> payrolls = payrollRepository.findAllById(ids);
                payrolls.forEach(p -> {
                        p.setStatus(status);
                        if (mode != null) {
                                p.setPaymentMode(mode);
                        }
                        if ("PAID".equals(status)) {
                                p.setPaidDate(java.time.LocalDate.now());
                        }
                });
                return payrollRepository.saveAll(payrolls);
        }

        public List<Payroll> getPayrollByWorker(Long workerId) {
                Worker worker = workerRepository.findById(workerId)
                                .orElseThrow(() -> new RuntimeException("Worker not found"));
                return payrollRepository.findByWorker(worker);
        }

        public Payroll updatePayroll(Long id, Payroll details) {
                Payroll payroll = payrollRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Payroll record not found"));

                payroll.setBonuses(details.getBonuses() != null ? details.getBonuses() : 0.0);
                payroll.setDeductions(details.getDeductions() != null ? details.getDeductions() : 0.0);
                payroll.calculateNetPay();

                return payrollRepository.save(payroll);
        }

        public void deletePayroll(Long id) {
                Payroll payroll = payrollRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Payroll record not found"));
                payrollRepository.delete(payroll);
        }

        public FactoryPaysheet saveIncome(FactoryPaysheet paysheet, Long plantationId) {
                if (paysheet.getReceivedDate() == null) {
                        paysheet.setReceivedDate(java.time.LocalDate.now());
                }
                if (paysheet.getFactory() != null && paysheet.getFactory().getId() != null) {
                        paysheet.setFactory(factoryRepository.findById(paysheet.getFactory().getId())
                                        .orElseThrow(() -> new RuntimeException("Factory not found")));
                }
                if (plantationId != null) {
                        plantationRepository.findById(plantationId).ifPresent(paysheet::setPlantation);
                }
                paysheet.calculateTotals();
                return factoryPaysheetRepository.save(paysheet);
        }

        public List<FactoryPaysheet> getAllIncomes(java.time.LocalDate month, Long plantationId) {
                if (plantationId != null) {
                        online.jayashan.teaplanter.entity.Plantation plantation = plantationRepository
                                        .findById(plantationId)
                                        .orElseThrow(() -> new RuntimeException("Plantation not found"));
                        if (month != null) {
                                return factoryPaysheetRepository.findByPlantation(plantation).stream()
                                                .filter(p -> p.getDate().getMonth().equals(month.getMonthValue())
                                                                && p.getDate().getYear().equals(month.getYear()))
                                                .collect(java.util.stream.Collectors.toList());
                        }
                        return factoryPaysheetRepository.findByPlantation(plantation);
                }

                if (month == null) {
                        return factoryPaysheetRepository.findAll();
                }
                return factoryPaysheetRepository.findByDateMonthAndDateYear(month.getMonthValue(), month.getYear());
        }

        public FactoryPaysheet updateIncome(Long id, FactoryPaysheet details) {
                FactoryPaysheet paysheet = factoryPaysheetRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Income record not found"));

                if (details.getFactory() != null && details.getFactory().getId() != null) {
                        paysheet.setFactory(factoryRepository.findById(details.getFactory().getId())
                                        .orElseThrow(() -> new RuntimeException("Factory not found")));
                }

                paysheet.setTotalWeight(details.getTotalWeight());
                paysheet.setPricePerKg(details.getPricePerKg());
                paysheet.setTransportDeduction(details.getTransportDeduction());
                paysheet.setOtherDeductions(details.getOtherDeductions());
                paysheet.setDescription(details.getDescription());
                paysheet.setReceivedDate(details.getReceivedDate());

                if (details.getDate() != null) {
                        paysheet.setDate(details.getDate());
                }

                paysheet.calculateTotals();
                return factoryPaysheetRepository.save(paysheet);
        }

        public void deleteIncome(Long id) {
                FactoryPaysheet paysheet = factoryPaysheetRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Income record not found"));
                factoryPaysheetRepository.delete(paysheet);
        }

        public online.jayashan.teaplanter.dto.PayrollPreviewDTO getPayrollPreview(Long workerId,
                        java.time.LocalDate month) {
                Worker worker = workerRepository.findById(workerId)
                                .orElseThrow(() -> new RuntimeException("Worker not found"));

                java.time.LocalDate start = month.withDayOfMonth(1);
                java.time.LocalDate end = month.withDayOfMonth(month.lengthOfMonth());

                List<online.jayashan.teaplanter.entity.Harvest> harvests = harvestRepository
                                .findByWorkerAndHarvestDateBetween(worker, start, end);
                double harvestEarnings = harvests.stream()
                                .mapToDouble(h -> h.getCalculatedPay() != null ? h.getCalculatedPay() : 0.0)
                                .sum();

                List<online.jayashan.teaplanter.entity.Task> tasks = taskRepository
                                .findByAssignedWorkerAndCompletedAtBetween(worker, start.atStartOfDay(),
                                                end.atTime(23, 59, 59));
                double taskEarnings = calculateTaskEarnings(tasks);

                double baseSalary = 0.0;
                double totalEarnings;
                boolean isFixedSalary = isFixedSalaryWorker(worker);

                if (isFixedSalary) {
                        baseSalary = worker.getBaseSalary() != null ? worker.getBaseSalary() : 0.0;
                        totalEarnings = baseSalary;
                } else {
                        totalEarnings = harvestEarnings + taskEarnings;
                }

                return online.jayashan.teaplanter.dto.PayrollPreviewDTO.builder()
                                .harvestEarnings(isFixedSalary ? 0.0 : harvestEarnings)
                                .taskEarnings(isFixedSalary ? 0.0 : taskEarnings)
                                .totalEarnings(totalEarnings)
                                .harvestCount((long) harvests.size())
                                .taskCount((long) tasks.size())
                                .build();
        }

        public Double getTotalInventoryExpenses(java.time.LocalDate month, Long plantationId) {
                java.time.LocalDateTime start = month.withDayOfMonth(1).atStartOfDay();
                java.time.LocalDateTime end = month.withDayOfMonth(month.lengthOfMonth()).atTime(23, 59, 59);

                java.util.stream.Stream<online.jayashan.teaplanter.entity.StockEntry> entries = stockEntryRepository
                                .findByTypeAndEntryDateBetween("PURCHASE", start, end).stream();

                if (plantationId != null) {
                        entries = entries.filter(e -> e.getPlantation() != null
                                        && e.getPlantation().getId().equals(plantationId));
                }

                return entries
                                .mapToDouble(e -> (e.getQuantity() != null ? e.getQuantity() : 0.0)
                                                * (e.getUnitPrice() != null ? e.getUnitPrice() : 0.0))
                                .sum();
        }

        private double calculateTaskEarnings(List<online.jayashan.teaplanter.entity.Task> tasks) {
                return tasks.stream()
                                .mapToDouble(t -> {
                                        if (t.getPaymentAmount() != null && t.getPaymentAmount() > 0) {
                                                return t.getPaymentAmount();
                                        }
                                        if (t.getTaskCategory() != null) {
                                                return taskRateRepository
                                                                .findByCategory(t.getTaskCategory().trim()
                                                                                 .toUpperCase())
                                                                .map(online.jayashan.teaplanter.entity.TaskRate::getRate)
                                                                .orElse(0.0);
                                        }
                                        return 0.0;
                                })
                                .sum();
        }

        private boolean isFixedSalaryWorker(Worker worker) {
                if (worker.getWorkerFunctions() == null) return false;
                String functions = worker.getWorkerFunctions();
                return functions.contains("Clerk") || 
                       functions.contains("Supervisor") || 
                       functions.contains("Driver") || 
                       functions.contains("Maintenance") || 
                       functions.contains("Security") || 
                       functions.contains("Other");
        }
}
