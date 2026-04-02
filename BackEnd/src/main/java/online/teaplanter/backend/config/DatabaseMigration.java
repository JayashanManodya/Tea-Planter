package online.jayashan.teaplanter.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseMigration implements CommandLineRunner {
    private final JdbcTemplate jdbcTemplate;

    public DatabaseMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        try {
            // Forcefully alter the column type for description in the tasks table
            jdbcTemplate.execute("ALTER TABLE tasks ALTER COLUMN description TYPE TEXT");
            System.out.println("DEBUG: Successfully migrated 'tasks.description' to TEXT type.");
        } catch (Exception e) {
            System.err.println("DEBUG: Migration of 'tasks.description' skipped or failed: " + e.getMessage());
        }
    }
}
