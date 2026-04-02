package online.jayashan.teaplanter.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void dropOldPlotConstraint() {
        try {
            // The constraint name from the user's error message
            String constraintName = "uk60yag5dwwetbafu08e8wc3bas";
            
            System.out.println("DEBUG: Attempting to drop old unique constraint: " + constraintName);
            
            // Drop the old global unique constraint if it exists
            jdbcTemplate.execute("ALTER TABLE plots DROP CONSTRAINT IF EXISTS " + constraintName);
            
            System.out.println("DEBUG: Successfully dropped old unique constraint: " + constraintName);
        } catch (Exception e) {
            // It might fail if the constraint is already gone, which is fine
            System.err.println("DEBUG: Failed to drop constraint (it might not exist): " + e.getMessage());
        }
    }
}
