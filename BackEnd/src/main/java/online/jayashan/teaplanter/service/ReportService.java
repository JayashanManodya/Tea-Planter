package online.jayashan.teaplanter.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.*;
import online.jayashan.teaplanter.repository.*;
import org.jfree.chart.ChartFactory;
import org.jfree.chart.JFreeChart;
import org.jfree.chart.plot.PlotOrientation;
import org.jfree.data.category.DefaultCategoryDataset;
import org.jfree.data.general.DefaultPieDataset;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

        private final HarvestRepository harvestRepository;
        private final PayrollRepository payrollRepository;
        private final StockEntryRepository stockEntryRepository;
        private final PlantationRepository plantationRepository;
        private final FactoryPaysheetRepository factoryPaysheetRepository;
        private final WorkerRepository workerRepository;
        private final UserRepository userRepository;
        private final TaskRepository taskRepository;
        private final TaskRateRepository taskRateRepository;

        private static final Font TITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.BLACK);
        private static final Font SUBTITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.DARK_GRAY);
        private static final Font HEADER_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.WHITE);
        private static final Font NORMAL_FONT = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);

        public byte[] generateHarvestReport(Long plantationId, LocalDate month) {
                Plantation plantation = plantationRepository.findById(plantationId)
                                .orElseThrow(() -> new RuntimeException("Plantation not found"));

                LocalDate start = month.withDayOfMonth(1);
                LocalDate end = month.withDayOfMonth(month.lengthOfMonth());

                List<Harvest> harvests = harvestRepository.findByPlantation(plantation).stream()
                                .filter(h -> !h.getHarvestDate().isBefore(start) && !h.getHarvestDate().isAfter(end))
                                .toList();

                try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        Document document = new Document(PageSize.A4);
                        PdfWriter.getInstance(document, out);
                        document.open();

                        addHeader(document, "Harvest & Yield Report", plantation, month);

                        PdfPTable table = new PdfPTable(6);
                        table.setWidthPercentage(100);
                        table.setSpacingBefore(10f);
                        table.setWidths(new float[] { 2f, 3f, 2f, 2f, 2f, 2f });

                        addTableHeader(table, List.of("Date", "Worker", "Plot", "Gross (kg)", "Tare (kg)", "Net (kg)"));

                        double totalNet = 0;
                        for (Harvest h : harvests) {
                                table.addCell(createCell(h.getHarvestDate().toString()));
                                table.addCell(createCell(h.getWorker().getUser().getName()));
                                table.addCell(createCell(h.getPlot().getBlockId()));
                                table.addCell(createCell(String.format("%.2f", h.getGrossWeight())));
                                table.addCell(createCell(String.format("%.2f", h.getTareWeight())));
                                table.addCell(createCell(String.format("%.2f", h.getNetWeight())));
                                totalNet += h.getNetWeight();
                        }

                        document.add(table);
                        document.add(
                                        new Paragraph("\nTotal Monthly Yield: " + String.format("%.2f", totalNet)
                                                        + " kg", SUBTITLE_FONT));

                        document.close();
                        return out.toByteArray();
                } catch (Exception e) {
                        throw new RuntimeException("Failed to generate harvest report", e);
                }
        }

        public byte[] generatePayrollReport(Long plantationId, LocalDate month) {
                Plantation plantation = plantationRepository.findById(plantationId)
                                .orElseThrow(() -> new RuntimeException("Plantation not found"));

                LocalDate start = month.withDayOfMonth(1);
                LocalDate end = month.withDayOfMonth(month.lengthOfMonth());

                List<Payroll> payrolls = payrollRepository.findByPlantation(plantation).stream()
                                .filter(p -> !p.getMonth().isBefore(start) && !p.getMonth().isAfter(end))
                                .toList();

                try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        Document document = new Document(PageSize.A4);
                        PdfWriter.getInstance(document, out);
                        document.open();

                        addHeader(document, "Worker Payroll Registry", plantation, month);

                        PdfPTable table = new PdfPTable(5);
                        table.setWidthPercentage(100);
                        table.setSpacingBefore(10f);

                        addTableHeader(table, List.of("Worker", "Basic Wage", "Bonuses", "Deductions", "Net Pay"));

                        double totalPayroll = 0;
                        for (Payroll p : payrolls) {
                                table.addCell(createCell(p.getWorker().getUser().getName()));
                                table.addCell(createCell("LKR " + String.format("%,.2f", p.getBasicWage())));
                                table.addCell(createCell("LKR " + String.format("%,.2f", p.getBonuses())));
                                table.addCell(createCell("LKR " + String.format("%,.2f", p.getDeductions())));
                                table.addCell(createCell("LKR " + String.format("%,.2f", p.getNetPay())));
                                totalPayroll += p.getNetPay();
                        }

                        document.add(table);
                        document.add(new Paragraph(
                                        "\nTotal Monthly Payroll Expense: LKR " + String.format("%,.2f", totalPayroll),
                                        SUBTITLE_FONT));

                        document.close();
                        return out.toByteArray();
                } catch (Exception e) {
                        throw new RuntimeException("Failed to generate payroll report", e);
                }
        }

        public byte[] generateInventoryReport(Long plantationId, LocalDate month) {
                Plantation plantation = plantationRepository.findById(plantationId)
                                .orElseThrow(() -> new RuntimeException("Plantation not found"));

                java.time.LocalDateTime start = month.withDayOfMonth(1).atStartOfDay();
                java.time.LocalDateTime end = month.withDayOfMonth(month.lengthOfMonth()).atTime(23, 59, 59);

                List<StockEntry> entries = stockEntryRepository.findByEntryDateBetween(start, end).stream()
                                .filter(e -> e.getPlantation() != null
                                                && e.getPlantation().getId().equals(plantationId))
                                .toList();

                try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        Document document = new Document(PageSize.A4);
                        PdfWriter.getInstance(document, out);
                        document.open();

                        addHeader(document, "Resource Usage & Inventory Report", plantation, month);

                        PdfPTable table = new PdfPTable(6);
                        table.setWidthPercentage(100);
                        table.setSpacingBefore(10f);

                        addTableHeader(table, List.of("Date", "Item", "Type", "Qty", "Unit Price", "Total"));

                        double totalExpense = 0;
                        for (StockEntry e : entries) {
                                table.addCell(createCell(e.getEntryDate().toLocalDate().toString()));
                                table.addCell(createCell(e.getItem().getName()));
                                table.addCell(createCell(e.getType()));
                                table.addCell(createCell(e.getQuantity() + " " + e.getItem().getUnit()));
                                table.addCell(
                                                createCell(e.getUnitPrice() != null
                                                                ? "LKR " + String.format("%.2f", e.getUnitPrice())
                                                                : "-"));

                                double total = (e.getQuantity() != null && e.getUnitPrice() != null)
                                                ? e.getQuantity() * e.getUnitPrice()
                                                : 0.0;
                                table.addCell(createCell(total > 0 ? "LKR " + String.format("%,.2f", total) : "-"));

                                if ("PURCHASE".equals(e.getType()))
                                        totalExpense += total;
                        }

                        document.add(table);
                        document.add(new Paragraph(
                                        "\nTotal Purchase Expenses: LKR " + String.format("%,.2f", totalExpense),
                                        SUBTITLE_FONT));

                        document.close();
                        return out.toByteArray();
                } catch (Exception e) {
                        throw new RuntimeException("Failed to generate inventory report", e);
                }
        }

        public byte[] generateFinancialSummaryReport(Long plantationId, LocalDate month) {
                Plantation plantation = plantationRepository.findById(plantationId)
                                .orElseThrow(() -> new RuntimeException("Plantation not found"));

                LocalDate start = month.withDayOfMonth(1);
                LocalDate end = month.withDayOfMonth(month.lengthOfMonth());

                // 1. Calculate Revenue (Incomes)
                List<FactoryPaysheet> factoryIncomes = factoryPaysheetRepository.findByPlantation(plantation).stream()
                                .filter(p -> p.getDate().getMonth().equals(month.getMonthValue())
                                                && p.getDate().getYear().equals(month.getYear()))
                                .toList();

                double totalRevenue = factoryIncomes.stream()
                                .mapToDouble(p -> p.getNetAmount() != null ? p.getNetAmount() : 0.0)
                                .sum();

                // 2. Calculate Expenses (Payroll + Inventory)
                double totalPayroll = payrollRepository.findByPlantation(plantation).stream()
                                .filter(p -> !p.getMonth().isBefore(start) && !p.getMonth().isAfter(end))
                                .mapToDouble(p -> p.getNetPay() != null ? p.getNetPay() : 0.0)
                                .sum();

                LocalDateTime startDt = start.atStartOfDay();
                LocalDateTime endDt = end.atTime(23, 59, 59);
                double totalInventory = stockEntryRepository.findByTypeAndEntryDateBetween("PURCHASE", startDt, endDt)
                                .stream()
                                .filter(e -> e.getPlantation() != null
                                                && e.getPlantation().getId().equals(plantationId))
                                .mapToDouble(e -> (e.getQuantity() != null ? e.getQuantity() : 0.0)
                                                * (e.getUnitPrice() != null ? e.getUnitPrice() : 0.0))
                                .sum();

                double totalExpenses = totalPayroll + totalInventory;
                double netProfit = totalRevenue - totalExpenses;

                try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        Document document = new Document(PageSize.A4);
                        PdfWriter.getInstance(document, out);
                        document.open();

                        addHeader(document, "Financial Summary & Profit Analysis", plantation, month);

                        // 1. Summary Overview Table
                        document.add(new Paragraph("1. Monthly Performance Summary", SUBTITLE_FONT));
                        PdfPTable summaryTable = new PdfPTable(2);
                        summaryTable.setWidthPercentage(100);
                        summaryTable.setSpacingBefore(10f);

                        summaryTable.addCell(createCell("Category"));
                        summaryTable.addCell(createCell("Amount (LKR)"));

                        summaryTable.addCell(createCell("Total Revenue"));
                        summaryTable.addCell(createCell("LKR " + String.format("%,.2f", totalRevenue)));

                        summaryTable.addCell(createCell("Labor (Payroll) Expenses"));
                        summaryTable.addCell(createCell("LKR " + String.format("%,.2f", totalPayroll)));

                        summaryTable.addCell(createCell("Input (Inventory) Expenses"));
                        summaryTable.addCell(createCell("LKR " + String.format("%,.2f", totalInventory)));

                        summaryTable.addCell(createCell("Total Expenses"));
                        summaryTable.addCell(createCell("LKR " + String.format("%,.2f", totalExpenses)));

                        PdfPCell profitCell = createCell("Net Profit");
                        profitCell.setBackgroundColor(
                                        netProfit >= 0 ? new Color(220, 252, 231) : new Color(254, 226, 226));
                        summaryTable.addCell(profitCell);

                        PdfPCell profitAmountCell = createCell("LKR " + String.format("%,.2f", netProfit));
                        profitAmountCell
                                        .setBackgroundColor(netProfit >= 0 ? new Color(22, 163, 74, 50)
                                                         : new Color(220, 38, 38, 50));
                        summaryTable.addCell(profitAmountCell);

                        document.add(summaryTable);

                        // 2. Factory Income Detailed Breakdown
                        document.add(new Paragraph("\n2. Income & Revenue Detailed Overview", SUBTITLE_FONT));
                        PdfPTable incomeTable = new PdfPTable(3);
                        incomeTable.setWidthPercentage(100);
                        incomeTable.setSpacingBefore(10f);
                        addTableHeader(incomeTable, List.of("Factory Name", "Total Weight (kg)", "Net Income (LKR)"));

                        for (FactoryPaysheet fp : factoryIncomes) {
                                incomeTable.addCell(createCell(fp.getFactory() != null ? fp.getFactory().getName() : "Unknown"));
                                incomeTable.addCell(createCell(String.format("%,.2f kg", fp.getTotalWeight())));
                                incomeTable.addCell(createCell("LKR " + String.format("%,.2f", fp.getNetAmount())));
                        }

                        if (factoryIncomes.isEmpty()) {
                                PdfPCell emptyCell = createCell("No income records found for this period.");
                                emptyCell.setColspan(3);
                                emptyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                                incomeTable.addCell(emptyCell);
                        }

                        document.add(incomeTable);

                        // Add Charts
                        document.add(new Paragraph("\nFinancial Charts Analysis", SUBTITLE_FONT));

                        // 1. Revenue vs Expenses Bar Chart
                        DefaultCategoryDataset dataset = new DefaultCategoryDataset();
                        dataset.addValue(totalRevenue, "Amount", "Revenue");
                        dataset.addValue(totalExpenses, "Amount", "Expenses");
                        dataset.addValue(netProfit, "Amount", "Profit");

                        JFreeChart barChart = ChartFactory.createBarChart(
                                        "Revenue vs Expenses", "Category", "Amount (LKR)",
                                        dataset, PlotOrientation.VERTICAL, false, true, false);

                        BufferedImage barImg = barChart.createBufferedImage(500, 300);
                        Image barItext = Image.getInstance(barImg, null);
                        barItext.setAlignment(Element.ALIGN_CENTER);
                        barItext.scaleToFit(500, 300);
                        document.add(barItext);

                        document.add(new Paragraph("\n"));

                        // 2. Expense Breakdown Pie Chart
                        DefaultPieDataset pieDataset = new DefaultPieDataset();
                        pieDataset.setValue("Labor/Payroll", totalPayroll);
                        pieDataset.setValue("Inventory/Resources", totalInventory);

                        JFreeChart pieChart = ChartFactory.createPieChart("Expense Breakdown", pieDataset, true, true,
                                        false);
                        BufferedImage pieImg = pieChart.createBufferedImage(500, 300);
                        Image pieItext = Image.getInstance(pieImg, null);
                        pieItext.setAlignment(Element.ALIGN_CENTER);
                        pieItext.scaleToFit(500, 300);
                        document.add(pieItext);

                        document.close();
                        return out.toByteArray();
                } catch (Exception e) {
                        throw new RuntimeException("Failed to generate financial summary", e);
                }
        }

        public byte[] generateIncomeAnalysisReport(Long plantationId, LocalDate month) {
                Plantation plantation = plantationRepository.findById(plantationId)
                                .orElseThrow(() -> new RuntimeException("Plantation not found"));

                List<FactoryPaysheet> incomes = factoryPaysheetRepository.findByPlantation(plantation).stream()
                                .filter(p -> p.getDate().getMonth().equals(month.getMonthValue())
                                                && p.getDate().getYear().equals(month.getYear()))
                                .toList();

                try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        Document document = new Document(PageSize.A4);
                        PdfWriter.getInstance(document, out);
                        document.open();

                        addHeader(document, "Factory Income & Delivery Analysis", plantation, month);

                        // Group by Factory
                        java.util.Map<String, Double> incomeByFactory = new java.util.HashMap<>();
                        java.util.Map<String, Double> weightByFactory = new java.util.HashMap<>();

                        for (FactoryPaysheet p : incomes) {
                                String factoryName = p.getFactory() != null ? p.getFactory().getName()
                                                : "Unknown Factory";
                                incomeByFactory.put(factoryName, incomeByFactory.getOrDefault(factoryName, 0.0)
                                                + (p.getNetAmount() != null ? p.getNetAmount() : 0.0));
                                weightByFactory.put(factoryName, weightByFactory.getOrDefault(factoryName, 0.0)
                                                + (p.getTotalWeight() != null ? p.getTotalWeight() : 0.0));
                        }

                        // Factory breakdown table
                        PdfPTable table = new PdfPTable(3);
                        table.setWidthPercentage(100);
                        table.setSpacingBefore(10f);
                        addTableHeader(table, List.of("Factory Name", "Total Weight (kg)", "Net Income (LKR)"));

                        double grandTotalWeight = 0;
                        double grandTotalIncome = 0;

                        for (String factory : incomeByFactory.keySet()) {
                                double weight = weightByFactory.get(factory);
                                double income = incomeByFactory.get(factory);
                                table.addCell(createCell(factory));
                                table.addCell(createCell(String.format("%,.2f kg", weight)));
                                table.addCell(createCell(String.format("LKR %,.2f", income)));
                                grandTotalWeight += weight;
                                grandTotalIncome += income;
                        }

                        // Totals row
                        PdfPCell totalLabel = createCell("Grand Totals");
                        totalLabel.setBackgroundColor(new Color(243, 244, 246));
                        table.addCell(totalLabel);

                        PdfPCell totalWeightCell = createCell(String.format("%,.2f kg", grandTotalWeight));
                        totalWeightCell.setBackgroundColor(new Color(243, 244, 246));
                        table.addCell(totalWeightCell);

                        PdfPCell totalIncomeCell = createCell(String.format("LKR %,.2f", grandTotalIncome));
                        totalIncomeCell.setBackgroundColor(new Color(243, 244, 246));
                        table.addCell(totalIncomeCell);

                        document.add(table);

                        // Charts Section
                        document.add(new Paragraph("\nIncome & Weight Distribution Analysis", SUBTITLE_FONT));

                        // 1. Income Pie Chart
                        DefaultPieDataset incomeDataset = new DefaultPieDataset();
                        for (java.util.Map.Entry<String, Double> entry : incomeByFactory.entrySet()) {
                                incomeDataset.setValue(entry.getKey(), entry.getValue());
                        }

                        JFreeChart incomePie = ChartFactory.createPieChart("Income Distribution by Factory",
                                        incomeDataset, true, true, false);
                        BufferedImage incomeImg = incomePie.createBufferedImage(500, 300);
                        Image incomeItext = Image.getInstance(incomeImg, null);
                        incomeItext.setAlignment(Element.ALIGN_CENTER);
                        incomeItext.scaleToFit(500, 250);
                        document.add(incomeItext);

                        document.add(new Paragraph("\n"));

                        // 2. Weight Bar Chart
                        DefaultCategoryDataset weightDataset = new DefaultCategoryDataset();
                        for (java.util.Map.Entry<String, Double> entry : weightByFactory.entrySet()) {
                                weightDataset.addValue(entry.getValue(), "Weight", entry.getKey());
                        }

                        JFreeChart weightBar = ChartFactory.createBarChart("Tea Leaf Deliveries by Factory", "Factory",
                                        "Weight (kg)", weightDataset, PlotOrientation.VERTICAL, false, true, false);
                        BufferedImage weightImg = weightBar.createBufferedImage(500, 300);
                        Image weightItext = Image.getInstance(weightImg, null);
                        weightItext.setAlignment(Element.ALIGN_CENTER);
                        weightItext.scaleToFit(500, 250);
                        document.add(weightItext);

                        document.close();
                        return out.toByteArray();
                } catch (Exception e) {
                        throw new RuntimeException("Failed to generate income analysis report", e);
                }
        }

        public byte[] generateWorkerPersonalReport(Long plantationId, String clerkId, LocalDate month) {
                User user = userRepository.findByClerkId(clerkId)
                                .orElseThrow(() -> new RuntimeException("User not found"));
                Plantation plantation = plantationRepository.findById(plantationId)
                                .orElseThrow(() -> new RuntimeException("Plantation not found"));
                Worker worker = workerRepository.findByUserAndPlantation(user, plantation)
                                .orElseThrow(() -> new RuntimeException("Worker assignment not found"));

                LocalDate start = month.withDayOfMonth(1);
                LocalDate end = month.withDayOfMonth(month.lengthOfMonth());

                List<Harvest> harvests = harvestRepository.findByWorker(worker).stream()
                                .filter(h -> !h.getHarvestDate().isBefore(start) && !h.getHarvestDate().isAfter(end))
                                .sorted((h1, h2) -> h1.getHarvestDate().compareTo(h2.getHarvestDate()))
                                .toList();

                Payroll payroll = payrollRepository.findByWorker(worker).stream()
                                .filter(p -> p.getMonth().getYear() == month.getYear()
                                                && p.getMonth().getMonthValue() == month.getMonthValue())
                                .findFirst()
                                .orElse(null);

                try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        Document document = new Document(PageSize.A4);
                        PdfWriter.getInstance(document, out);
                        document.open();

                        addHeader(document, "Personal Performance & Earnings Report", plantation, month);

                        document.add(new Paragraph("Worker Name: " + user.getName(), SUBTITLE_FONT));
                        document.add(new Paragraph(
                                        "Report Period: " + month.format(DateTimeFormatter.ofPattern("MMMM yyyy")),
                                        NORMAL_FONT));
                        document.add(new Paragraph("\n"));

                        // 1. Performance Summary
                        document.add(new Paragraph("1. Monthly Harvesting Performance", SUBTITLE_FONT));
                        double totalNet = harvests.stream().mapToDouble(Harvest::getNetWeight).sum();
                        int activeDays = (int) harvests.stream().map(Harvest::getHarvestDate).distinct().count();

                        PdfPTable summaryTable = new PdfPTable(2);
                        summaryTable.setWidthPercentage(100);
                        summaryTable.setSpacingBefore(10f);
                        summaryTable.addCell(createCell("Total Weight Plucked"));
                        summaryTable.addCell(createCell(String.format("%.2f kg", totalNet)));
                        summaryTable.addCell(createCell("Days Worked"));
                        summaryTable.addCell(createCell(String.valueOf(activeDays)));
                        summaryTable.addCell(createCell("Daily Average"));
                        summaryTable.addCell(createCell(
                                        activeDays > 0 ? String.format("%.2f kg", totalNet / activeDays) : "0 kg"));
                        document.add(summaryTable);

                        // 2. Harvesting Log
                        document.add(new Paragraph("\n2. Daily Harvesting Log", SUBTITLE_FONT));
                        PdfPTable harvestTable = new PdfPTable(4);
                        harvestTable.setWidthPercentage(100);
                        harvestTable.setSpacingBefore(10f);
                        addTableHeader(harvestTable, List.of("Date", "Plot", "Gross (kg)", "Net (kg)"));

                        for (Harvest h : harvests) {
                                harvestTable.addCell(createCell(h.getHarvestDate().toString()));
                                harvestTable.addCell(createCell(h.getPlot().getBlockId()));
                                harvestTable.addCell(createCell(String.format("%.2f", h.getGrossWeight())));
                                harvestTable.addCell(createCell(String.format("%.2f", h.getNetWeight())));
                        }
                        document.add(harvestTable);

                        // 3. Task Summary Selection
                        document.add(new Paragraph("\n3. Specialized Task Performance", SUBTITLE_FONT));
                        List<online.jayashan.teaplanter.entity.Task> tasks = taskRepository
                                        .findByAssignedWorkerAndCompletedAtBetween(worker, start.atStartOfDay(),
                                                        end.atTime(23, 59, 59));

                        if (!tasks.isEmpty()) {
                                PdfPTable tasksTable = new PdfPTable(3);
                                tasksTable.setWidthPercentage(100);
                                tasksTable.setSpacingBefore(10f);
                                addTableHeader(tasksTable, List.of("Task Category", "Completed", "Earnings (LKR)"));

                                java.util.Map<String, List<online.jayashan.teaplanter.entity.Task>> tasksByCategory = tasks
                                                .stream()
                                                .collect(java.util.stream.Collectors
                                                                .groupingBy(t -> t.getTaskCategory() != null
                                                                                ? t.getTaskCategory()
                                                                                : "GENERAL"));

                                double totalTaskEarnings = 0;
                                for (java.util.Map.Entry<String, List<online.jayashan.teaplanter.entity.Task>> entry : tasksByCategory
                                                .entrySet()) {
                                        double categoryEarnings = entry.getValue().stream()
                                                        .mapToDouble(t -> {
                                                                if (t.getPaymentAmount() != null
                                                                                && t.getPaymentAmount() > 0) {
                                                                        return t.getPaymentAmount();
                                                                }
                                                                if (t.getTaskCategory() != null) {
                                                                        return taskRateRepository.findByCategory(
                                                                                        t.getTaskCategory().trim()
                                                                                                        .toUpperCase())
                                                                                        .map(online.jayashan.teaplanter.entity.TaskRate::getRate)
                                                                                        .orElse(0.0);
                                                                }
                                                                return 0.0;
                                                        }).sum();

                                        tasksTable.addCell(createCell(entry.getKey()));
                                        tasksTable.addCell(createCell(String.valueOf(entry.getValue().size())));
                                        tasksTable.addCell(createCell(String.format("LKR %,.2f", categoryEarnings)));
                                        totalTaskEarnings += categoryEarnings;
                                }
                                document.add(tasksTable);
                                document.add(new Paragraph(
                                                "Total Task Earnings: LKR " + String.format("%,.2f", totalTaskEarnings),
                                                NORMAL_FONT));
                        } else {
                                document.add(new Paragraph("No tasks recorded for this period.", NORMAL_FONT));
                        }

                        // 4. Earnings Selection
                        document.add(new Paragraph("\n4. Earnings & Payslip Details", SUBTITLE_FONT));
                        if (payroll != null) {
                                PdfPTable payrollTable = new PdfPTable(2);
                                payrollTable.setWidthPercentage(100);
                                payrollTable.setSpacingBefore(10f);

                                payrollTable.addCell(createCell("Basic Wage"));
                                payrollTable.addCell(
                                                createCell("LKR " + String.format("%,.2f", payroll.getBasicWage())));
                                payrollTable.addCell(createCell("Extra Bonuses"));
                                payrollTable.addCell(createCell("LKR " + String.format("%,.2f", payroll.getBonuses())));
                                payrollTable.addCell(createCell("Deductions"));
                                payrollTable.addCell(
                                                createCell("LKR " + String.format("%,.2f", payroll.getDeductions())));

                                PdfPCell netLabelCell = createCell("Net Pay (Received)");
                                netLabelCell.setBackgroundColor(new Color(220, 252, 231));
                                payrollTable.addCell(netLabelCell);

                                PdfPCell netValCell = createCell("LKR " + String.format("%,.2f", payroll.getNetPay()));
                                netValCell.setBackgroundColor(new Color(220, 252, 231));
                                payrollTable.addCell(netValCell);

                                payrollTable.addCell(createCell("Payment Status"));
                                payrollTable.addCell(createCell(payroll.getStatus()));

                                document.add(payrollTable);
                        } else {
                                document.add(new Paragraph("No payroll record generated yet for this period.",
                                                NORMAL_FONT));
                        }

                        document.close();
                        return out.toByteArray();
                } catch (Exception e) {
                        throw new RuntimeException("Failed to generate worker personal report", e);
                }
        }

        private void addHeader(Document document, String title, Plantation plantation, LocalDate month)
                        throws DocumentException {
                Paragraph pTitle = new Paragraph(title, TITLE_FONT);
                pTitle.setAlignment(Element.ALIGN_CENTER);
                document.add(pTitle);

                Paragraph pEstate = new Paragraph(plantation.getName() + " - " + plantation.getLocation(),
                                SUBTITLE_FONT);
                pEstate.setAlignment(Element.ALIGN_CENTER);
                document.add(pEstate);

                Paragraph pDate = new Paragraph("Period: " + month.format(DateTimeFormatter.ofPattern("MMMM yyyy")),
                                NORMAL_FONT);
                pDate.setAlignment(Element.ALIGN_CENTER);
                pDate.setSpacingAfter(20f);
                document.add(pDate);

                document.add(new Paragraph("Generated on: " + LocalDate.now(), NORMAL_FONT));
                document.add(
                                new Paragraph("______________________________________________________________________________\n\n"));
        }

        private void addTableHeader(PdfPTable table, List<String> headers) {
                for (String header : headers) {
                        PdfPCell cell = new PdfPCell(new Phrase(header, HEADER_FONT));
                        cell.setBackgroundColor(new Color(22, 163, 74)); // Green-600
                        cell.setPadding(5);
                        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                        table.addCell(cell);
                }
        }

        private PdfPCell createCell(String text) {
                PdfPCell cell = new PdfPCell(new Phrase(text, NORMAL_FONT));
                cell.setPadding(5);
                cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                return cell;
        }
}
