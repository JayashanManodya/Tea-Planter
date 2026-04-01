package online.jayashan.teaplanter.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.Attendance;
import online.jayashan.teaplanter.entity.Harvest;
import online.jayashan.teaplanter.entity.Payroll;
import online.jayashan.teaplanter.entity.Task;
import online.jayashan.teaplanter.repository.AttendanceRepository;
import online.jayashan.teaplanter.repository.HarvestRepository;
import online.jayashan.teaplanter.repository.PayrollRepository;
import online.jayashan.teaplanter.repository.TaskRepository;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.core.io.FileSystemResource;
import org.springframework.beans.factory.annotation.Value;
import jakarta.annotation.PostConstruct;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final AttendanceRepository attendanceRepository;
    private final HarvestRepository harvestRepository;
    private final TaskRepository taskRepository;
    private final PayrollRepository payrollRepository;

    @Value("${spring.mail.host:Not Configured}")
    private String mailHost;

    @Value("${spring.mail.port:0}")
    private int mailPort;

    @Value("${spring.mail.username:Not Configured}")
    private String mailUser;

    @PostConstruct
    public void init() {
        System.out.println("DEBUG: EmailService initialized with Host: " + mailHost + ", Port: " + mailPort + ", User: " + mailUser);
    }

    @Async
    @Transactional(readOnly = true)
    public void sendPayrollEmail(Long payrollId) {
        System.out.println("DEBUG: Starting background payroll email process for ID: " + payrollId);
        Payroll payroll = payrollRepository.findById(payrollId)
                .orElseThrow(() -> new RuntimeException("Payroll record not found for async email: " + payrollId));

        if (payroll.getWorker() == null || payroll.getWorker().getUser() == null || payroll.getWorker().getUser().getEmail() == null) {
            return;
        }

        String to = payroll.getWorker().getUser().getEmail();
        String monthStr = payroll.getMonth().format(DateTimeFormatter.ofPattern("MMMM yyyy"));
        String plantationName = (payroll.getPlantation() != null) ? payroll.getPlantation().getName() : "Tea Planter";
        String subject = plantationName + ": Interactive Paysheet - " + monthStr;

        try {
            // Fetch month records
            LocalDate start = payroll.getMonth().withDayOfMonth(1);
            LocalDate end = payroll.getMonth().withDayOfMonth(payroll.getMonth().lengthOfMonth());
            LocalDateTime startDateTime = start.atStartOfDay();
            LocalDateTime endDateTime = end.atTime(23, 59, 59);

            List<Attendance> attendance = attendanceRepository.findByWorkerAndCheckInBetween(payroll.getWorker(), startDateTime, endDateTime);
            List<Task> tasks = taskRepository.findByAssignedWorkerAndCompletedAtBetween(payroll.getWorker(), startDateTime, endDateTime);
            
            List<Harvest> harvests = null;
            if (isLaborer(payroll.getWorker())) {
                harvests = harvestRepository.findByWorkerAndHarvestDateBetween(payroll.getWorker(), start, end);
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(buildEnhancedHtmlContent(payroll, attendance, tasks, harvests), true);
            
            // Use a relative path from the project root instead of a hardcoded Windows drive
            File logoFile = new File("Pics/TeaPlanterLogo3.png");
            if (!logoFile.exists()) {
                // If running from within the BackEnd directory
                logoFile = new File("../Pics/TeaPlanterLogo3.png");
            }

            if (logoFile.exists()) {
                FileSystemResource logo = new FileSystemResource(logoFile);
                helper.addInline("logo", logo);
            }

            mailSender.send(message);
            System.out.println("DEBUG: Successfully sent background payroll email to " + to);
        } catch (Exception e) {
            System.err.println("CRITICAL: Failed to send background payroll email to " + to + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    private boolean isLaborer(online.jayashan.teaplanter.entity.Worker worker) {
        if (worker.getWorkerFunctions() == null) return false;
        String functions = worker.getWorkerFunctions();
        return functions.contains("Harvester") || functions.contains("Pruner") || functions.contains("Field Worker");
    }

    @Async
    @Transactional(readOnly = true)
    public void sendTaskAssignmentEmail(Long taskId) {
        System.out.println("DEBUG: Starting background task assignment email process for ID: " + taskId);
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task record not found for async email: " + taskId));

        if (task.getAssignedWorker() == null || task.getAssignedWorker().getUser() == null || task.getAssignedWorker().getUser().getEmail() == null) {
            return;
        }

        String to = task.getAssignedWorker().getUser().getEmail();
        String plantationName = task.getPlantation() != null ? task.getPlantation().getName() : "Tea Planter";
        String subject = plantationName + ": New Task Assigned - " + task.getTitle();
        String workerName = task.getAssignedWorker().getUser().getName();

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject(subject);

            StringBuilder content = new StringBuilder();
            content.append("<html><body style='font-family: \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px;'>");
            content.append("<div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;'>");
            
            // Header
            content.append("<div style='background-color: #f9fbf9; padding: 30px; text-align: center; border-bottom: 1px solid #eee;'>");
            content.append("<h1 style='margin: 0; font-size: 20px; font-weight: 600; color: #2e7d32; text-transform: uppercase; letter-spacing: 2px;'>").append(plantationName).append("</h1>");
            content.append("<p style='margin: 5px 0 0 0; color: #666; font-size: 13px; font-weight: 500;'>New Task Assignment</p>");
            content.append("</div>");
 
            // Body
            content.append("<div style='padding: 30px;'>");
            content.append("<h2 style='color: #1a3c22; margin-top: 0;'>Hello, ").append(workerName).append("!</h2>");
            content.append("<p style='color: #555; line-height: 1.6;'>You have been assigned a new task on the plantation. Please review the details below:</p>");

            content.append("<div style='background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #eee;'>");
            content.append("<p style='margin: 0 0 10px 0;'><strong>Plantation:</strong> ").append(plantationName).append("</p>");
            content.append("<p style='margin: 0 0 10px 0;'><strong>Task Title:</strong> ").append(task.getTitle()).append("</p>");
            content.append("<p style='margin: 0 0 10px 0;'><strong>Category:</strong> ").append(task.getTaskCategory()).append("</p>");
            content.append("<p style='margin: 0 0 10px 0;'><strong>Date:</strong> ").append(task.getTaskDate() != null ? task.getTaskDate() : "N/A").append("</p>");
            content.append("<p style='margin: 0 0 10px 0;'><strong>Priority:</strong> ").append(task.getPriority() != null ? task.getPriority() : "Normal").append("</p>");
            content.append("<p style='margin: 0 0 10px 0;'><strong>Details:</strong> ").append(task.getDescription() != null ? task.getDescription() : "None").append("</p>");
            content.append("</div>");

            content.append("<p style='color: #555; line-height: 1.6;'>Check your dashboard for more information and to update the task status once completed.</p>");
            
            // Footer
            content.append("<div style='margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #777; font-size: 12px;'>");
            content.append("<p style='margin: 5px 0;'><strong>").append(plantationName).append(" Dashboard</strong></p>");
            content.append("<p style='margin: 20px 0 0 0; color: #aaa;'>Copyright &copy; 2026 ").append(plantationName).append(". All rights reserved.</p>");
            content.append("</div>");

            content.append("</div></div></body></html>");

            helper.setText(content.toString(), true);
            mailSender.send(message);
            System.out.println("DEBUG: Successfully sent background task assignment email to " + to);
        } catch (Exception e) {
            System.err.println("CRITICAL: Failed to send background task assignment email to " + to + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String buildEnhancedHtmlContent(Payroll payroll, List<Attendance> attendance, List<Task> tasks, List<Harvest> harvests) {
        String workerName = (payroll.getWorker() != null && payroll.getWorker().getUser() != null) ? payroll.getWorker().getUser().getName() : "Worker";
        String monthStr = payroll.getMonth().format(DateTimeFormatter.ofPattern("MMMM yyyy"));
        
        String plantationName = "Tea Planter";
        if (payroll.getPlantation() != null) {
            plantationName = payroll.getPlantation().getName();
        } else if (payroll.getWorker() != null && payroll.getWorker().getPlantation() != null) {
            plantationName = payroll.getWorker().getPlantation().getName();
        }
        
        // Earnings Details
        double basic = payroll.getBasicWage() != null ? payroll.getBasicWage() : 0.0;
        double bonuses = payroll.getBonuses() != null ? payroll.getBonuses() : 0.0;
        double deductions = payroll.getDeductions() != null ? payroll.getDeductions() : 0.0;
        double net = payroll.getNetPay() != null ? payroll.getNetPay() : 0.0;
        
        StringBuilder content = new StringBuilder();
        content.append("<html><body style='font-family: \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px;'>");
        content.append("<div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;'>");
        
        // Header
        content.append("<div style='background-color: #f9fbf9; padding: 40px 30px; text-align: center; border-bottom: 1px solid #eee;'>");
        content.append("<img src='cid:logo' alt='").append(plantationName).append("' style='height: 80px; width: auto; margin-bottom: 15px;'>");
        content.append("<h1 style='margin: 0; font-size: 20px; font-weight: 600; color: #2e7d32; text-transform: uppercase; letter-spacing: 2px;'>").append(plantationName).append("</h1>");
        content.append("<p style='margin: 5px 0 0 0; color: #666; font-size: 13px; font-weight: 500;'>Monthly Paysheet Summary</p>");
        content.append("</div>");

        // Welcome
        content.append("<div style='padding: 30px;'>");
        content.append("<h2 style='color: #1a3c22; margin-top: 0;'>Hello, ").append(workerName).append("!</h2>");
        content.append("<p style='color: #555; line-height: 1.6;'>Your summary for <strong>").append(monthStr).append("</strong> is ready. We've compiled your attendance, work records, and final earnings below.</p>");

        // Summary Cards
        content.append("<div style='display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 25px 0;'>");
        appendSummaryCard(content, "Net Payout", "LKR " + String.format("%.2f", net), "#e8f5e9", "#2e7d32");
        appendSummaryCard(content, "Total Days", String.valueOf(attendance.size()), "#e3f2fd", "#1976d2");
        content.append("</div>");

        // Financial Details
        content.append("<h3 style='color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 30px; font-size: 16px;'>Earnings Breakdown</h3>");
        content.append("<table style='width: 100%; border-collapse: collapse; margin-bottom: 20px;'>");
        appendTableRow(content, "Base Earnings", "LKR " + String.format("%.2f", basic), false);
        appendTableRow(content, "Incentives / Bonuses", "+ LKR " + String.format("%.2f", bonuses), true);
        appendTableRow(content, "Deductions", "- LKR " + String.format("%.2f", deductions), false);
        content.append("<tr style='background-color: #f9fbf9; color: #2e7d32; font-weight: bold;'>");
        content.append("<td style='padding: 15px; border-top: 1px solid #eee;'>TOTAL NET PAY</td>");
        content.append("<td style='padding: 15px; text-align: right; border-top: 1px solid #eee;'>LKR ").append(String.format("%.2f", net)).append("</td></tr>");
        content.append("</table>");

        // Attendance Details
        content.append("<h3 style='color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 40px; font-size: 16px;'>Monthly Attendance</h3>");
        if (attendance.isEmpty()) {
            content.append("<p style='color: #999; font-style: italic;'>No attendance records found for this month.</p>");
        } else {
            content.append("<table style='width: 100%; border-collapse: collapse; font-size: 14px;'>");
            content.append("<tr style='background-color: #f8f9fa; text-align: left;'><th style='padding: 10px; border-bottom: 1px solid #eee;'>Date</th><th style='padding: 10px; border-bottom: 1px solid #eee;'>Status</th><th style='padding: 10px; border-bottom: 1px solid #eee;'>Check In</th><th style='padding: 10px; border-bottom: 1px solid #eee;'>Hours</th></tr>");
            for (Attendance a : attendance) {
                String duration = "-";
                if (a.getCheckIn() != null && a.getCheckOut() != null) {
                    long mins = java.time.Duration.between(a.getCheckIn(), a.getCheckOut()).toMinutes();
                    duration = String.format("%dh %02dm", mins / 60, mins % 60);
                }
                content.append("<tr>");
                content.append("<td style='padding: 10px; border-bottom: 1px solid #f1f1f1;'>").append(a.getCheckIn().format(DateTimeFormatter.ofPattern("MMM dd"))).append("</td>");
                content.append("<td style='padding: 10px; border-bottom: 1px solid #f1f1f1;'><span style='background:#e8f5e9; color:#2e7d32; padding:2px 8px; border-radius:12px; font-size:11px;'>").append(a.getStatus()).append("</span></td>");
                content.append("<td style='padding: 10px; border-bottom: 1px solid #f1f1f1;'>").append(a.getCheckIn().format(DateTimeFormatter.ofPattern("HH:mm"))).append("</td>");
                content.append("<td style='padding: 10px; border-bottom: 1px solid #f1f1f1;'>").append(duration).append("</td>");
                content.append("</tr>");
            }
            content.append("</table>");
        }

        // Harvest Details (Conditional)
        if (harvests != null && !harvests.isEmpty()) {
            content.append("<h3 style='color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 40px; font-size: 16px;'>Harvest Log</h3>");
            content.append("<table style='width: 100%; border-collapse: collapse; font-size: 14px;'>");
            content.append("<tr style='background-color: #f8f9fa; text-align: left;'><th style='padding: 10px; border-bottom: 1px solid #eee;'>Date</th><th style='padding: 10px; border-bottom: 1px solid #eee;'>Plot</th><th style='padding: 10px; border-bottom: 1px solid #eee; text-align: right;'>Weight (kg)</th></tr>");
            double totalWeight = 0;
            for (Harvest h : harvests) {
                totalWeight += h.getNetWeight();
                content.append("<tr>");
                content.append("<td style='padding: 10px; border-bottom: 1px solid #f1f1f1;'>").append(h.getHarvestDate()).append("</td>");
                content.append("<td style='padding: 10px; border-bottom: 1px solid #f1f1f1;'>").append(h.getPlot().getBlockId()).append("</td>");
                content.append("<td style='padding: 10px; border-bottom: 1px solid #f1f1f1; text-align: right;'>").append(String.format("%.1f", h.getNetWeight())).append("</td>");
                content.append("</tr>");
            }
            content.append("<tr style='font-weight: bold;'><td colspan='2' style='padding: 10px; text-align: right;'>Total Harvest:</td><td style='padding: 10px; text-align: right;'>").append(String.format("%.1f", totalWeight)).append(" kg</td></tr>");
            content.append("</table>");
        }

        // Task Details
        if (tasks != null && !tasks.isEmpty()) {
            content.append("<h3 style='color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 40px; font-size: 16px;'>Task Records</h3>");
            content.append("<table style='width: 100%; border-collapse: collapse; font-size: 14px;'>");
            content.append("<tr style='background-color: #f8f9fa; text-align: left;'><th style='padding: 10px; border-bottom: 1px solid #eee;'>Category</th><th style='padding: 10px; border-bottom: 1px solid #eee;'>Date Completed</th><th style='padding: 10px; border-bottom: 1px solid #eee; text-align: right;'>Payment</th></tr>");
            for (Task t : tasks) {
                content.append("<tr>");
                content.append("<td style='padding: 10px; border-bottom: 1px solid #f1f1f1;'>").append(t.getTaskCategory()).append("</td>");
                content.append("<td style='padding: 10px; border-bottom: 1px solid #f1f1f1;'>").append(t.getCompletedAt().format(DateTimeFormatter.ofPattern("MMM dd"))).append("</td>");
                content.append("<td style='padding: 10px; border-bottom: 1px solid #f1f1f1; text-align: right;'>LKR ").append(String.format("%.2f", t.getPaymentAmount() != null ? t.getPaymentAmount() : 0.0)).append("</td>");
                content.append("</tr>");
            }
            content.append("</table>");
        }

        // Footer
        content.append("<div style='margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #777; font-size: 12px;'>");
        content.append("<p style='margin: 5px 0;'><strong>").append(plantationName).append(" Dashboard</strong></p>");
        content.append("<p style='margin: 5px 0;'>Automated system message. Information reflects validated records as of payment date.</p>");
        content.append("<p style='margin: 20px 0 0 0; color: #aaa;'>Copyright &copy; 2026 ").append(plantationName).append(". All rights reserved.</p>");
        content.append("</div>");

        content.append("</div></div></body></html>");
        
        return content.toString();
    }

    private void appendSummaryCard(StringBuilder sb, String label, String value, String bg, String color) {
        sb.append("<div style='background-color: #fcfcfc; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #eee;'>");
        sb.append("<p style='margin: 0; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #888; letter-spacing: 1px;'>").append(label).append("</p>");
        sb.append("<p style='margin: 8px 0 0 0; font-size: 18px; font-weight: 700; color: #333;'>").append(value).append("</p>");
        sb.append("</div>");
    }

    private void appendTableRow(StringBuilder sb, String label, String value, boolean isPositive) {
        sb.append("<tr style='border-bottom: 1px solid #eee;'>");
        sb.append("<td style='padding: 12px; color: #666;'>").append(label).append("</td>");
        sb.append("<td style='padding: 12px; text-align: right; font-weight: 600; color: ").append(isPositive ? "#2e7d32" : "#333").append(";'>").append(value).append("</td>");
        sb.append("</tr>");
    }
}
