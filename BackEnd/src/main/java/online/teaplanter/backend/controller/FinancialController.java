package online.teaplanter.backend.controller;

import lombok.RequiredArgsConstructor;
import online.teaplanter.backend.entity.FactoryPaysheet;
import online.teaplanter.backend.entity.Payroll;
import online.teaplanter.backend.service.FinancialService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/financial")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FinancialController {

    private final FinancialService financialService;

    @PostMapping("/payroll")
    public Payroll generatePayroll(@RequestBody Payroll payroll) {
        return financialService.generatePayroll(payroll);
    }

    @GetMapping("/payroll")
    public List<Payroll> getAllPayrolls(@RequestParam(required = false) String month,
            @RequestParam(required = false) Long plantationId) {
        java.time.LocalDate date = (month != null) ? java.time.LocalDate.parse(month + "-01") : null;
        return financialService.getAllPayrolls(date, plantationId);
    }

    @PatchMapping("/payroll/{id}/status")
    public Payroll updateStatus(@PathVariable Long id, @RequestParam String status) {
        return financialService.updatePayrollStatus(id, status);
    }

    @PutMapping("/payroll/{id}")
    public Payroll updatePayroll(@PathVariable Long id, @RequestBody Payroll payrollDetails) {
        return financialService.updatePayroll(id, payrollDetails);
    }

    @DeleteMapping("/payroll/{id}")
    public void deletePayroll(@PathVariable Long id) {
        financialService.deletePayroll(id);
    }

    @PostMapping("/incomes")
    public FactoryPaysheet createIncome(@RequestBody FactoryPaysheet income,
            @RequestParam(required = false) Long plantationId) {
        return financialService.saveIncome(income, plantationId);
    }

    @GetMapping("/incomes")
    public Object getAllIncomes(@RequestParam(required = false) String month,
            @RequestParam(required = false) Long plantationId) {
        try {
            java.time.LocalDate date = (month != null) ? java.time.LocalDate.parse(month + "-01") : null;
            return financialService.getAllIncomes(date, plantationId);
        } catch (Throwable e) {
            e.printStackTrace();
            return java.util.Map.of("error", true, "message", e.getMessage());
        }
    }

    @PutMapping("/incomes/{id}")
    public Object updateIncome(@PathVariable Long id, @RequestBody FactoryPaysheet paysheet) {
        try {
            return financialService.updateIncome(id, paysheet);
        } catch (Throwable e) {
            return java.util.Map.of("error", true, "message", e.getMessage());
        }
    }

    @DeleteMapping("/incomes/{id}")
    public void deleteIncome(@PathVariable Long id) {
        financialService.deleteIncome(id);
    }

    @GetMapping("/expenses/inventory")
    public Double getInventoryExpenses(@RequestParam String month, @RequestParam(required = false) Long plantationId) {
        java.time.LocalDate date = java.time.LocalDate.parse(month + "-01");
        return financialService.getTotalInventoryExpenses(date, plantationId);
    }

    @GetMapping("/payroll/preview")
    public online.teaplanter.backend.dto.PayrollPreviewDTO getPayrollPreview(
            @RequestParam Long workerId,
            @RequestParam String month) {
        java.time.LocalDate date = java.time.LocalDate.parse(month + "-01");
        return financialService.getPayrollPreview(workerId, date);
    }
}
