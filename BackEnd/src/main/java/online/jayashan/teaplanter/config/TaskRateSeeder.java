package online.jayashan.teaplanter.config;

import lombok.RequiredArgsConstructor;
import online.jayashan.teaplanter.entity.TaskRate;
import online.jayashan.teaplanter.repository.TaskRateRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
@RequiredArgsConstructor
public class TaskRateSeeder implements CommandLineRunner {

    private final TaskRateRepository taskRateRepository;

    @Override
    public void run(String... args) {
        if (taskRateRepository.count() == 0) {
            taskRateRepository.saveAll(Arrays.asList(
                    TaskRate.builder().category("HARVESTING").rate(50.0).unit("PER_KG").build(),
                    TaskRate.builder().category("PRUNING").rate(1500.0).unit("PER_PROCESS").build(),
                    TaskRate.builder().category("WEEDING").rate(1000.0).unit("PER_PROCESS").build(),
                    TaskRate.builder().category("FERTILIZING").rate(1200.0).unit("PER_PROCESS").build(),
                    TaskRate.builder().category("PLANTING").rate(800.0).unit("PER_PROCESS").build(),
                    TaskRate.builder().category("OTHER").rate(500.0).unit("PER_PROCESS").build()));
        }
    }
}
