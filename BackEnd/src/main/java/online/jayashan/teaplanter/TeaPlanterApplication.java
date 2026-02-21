package online.jayashan.teaplanter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.context.annotation.Bean;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
public class TeaPlanterApplication {

    public static void main(String[] args) {
        SpringApplication.run(TeaPlanterApplication.class, args);
    }

    @Bean
    public CommandLineRunner fixDatabase(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                System.out.println("DEBUG: Running automated database schema fix...");
                jdbcTemplate.execute("ALTER TABLE workers DROP COLUMN IF EXISTS name");
                jdbcTemplate.execute("ALTER TABLE workers DROP COLUMN IF EXISTS email");
                System.out.println("DEBUG: Database schema fix completed successfully.");
            } catch (Exception e) {
                System.err.println("DEBUG ERROR: Failed to fix database schema: " + e.getMessage());
            }
        };
    }
}
